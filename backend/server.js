require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const { Server } = require("socket.io");
const { moderatorUsernames, moderators } = require('./constants/moderators.cjs');
const { createPersistentStateStore } = require("./lib/persistence");
const { createAuditLog } = require("./lib/auditLog");

const authRoutes = require("./routes/authRoutes");
const MAX_MESSAGE_LENGTH = 2000;
const MAX_ROOM_ID_LENGTH = 64;
const ALLOWED_REACTIONS = new Set(["🇰🇪", "✊", "👍", "👎"]);

function resolveAllowedOrigins(overrideOrigin) {
    if (overrideOrigin) {
        return Array.isArray(overrideOrigin) ? overrideOrigin : [overrideOrigin];
    }

    if (!process.env.FRONTEND_ORIGIN) {
        return ["http://localhost:3000"];
    }

    return process.env.FRONTEND_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);
}

function hashRoomPassword(password) {
    return crypto.createHash("sha256").update(password).digest("hex");
}

function isValidRoomId(roomId) {
    return typeof roomId === "string" && roomId.length > 0 && roomId.length <= MAX_ROOM_ID_LENGTH;
}

function isValidMessagePayload(message) {
    if (!message || typeof message !== "object") return false;
    if (typeof message.id !== "string" || !message.id) return false;
    if (typeof message.sender !== "string" || !message.sender) return false;
    if (typeof message.message !== "string") return false;
    if (message.message.length > MAX_MESSAGE_LENGTH) return false;
    return true;
}

function getTokenFromSocket(socket) {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === "string" && authToken.trim()) {
        return authToken;
    }

    const authHeader = socket.handshake.headers?.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }

    return null;
}

function createApp(options = {}) {
    const { allowCorsOrigin, serveFrontend = true } = options;
    const allowedOrigins = resolveAllowedOrigins(allowCorsOrigin);
    const app = express();

    app.use(helmet());
    app.use(express.json({ limit: "100kb" }));
    app.use(cors({ origin: allowedOrigins }));
    app.use(rateLimit({
        windowMs: 60 * 1000,
        max: 120,
        standardHeaders: true,
        legacyHeaders: false
    }));
    app.use("/api/auth", authRoutes);

    if (serveFrontend) {
        const frontendBuildPath = path.join(__dirname, "..", "frontend", "build");
        app.use(express.static(frontendBuildPath));
        app.get("*", (req, res) => {
            res.sendFile(path.join(frontendBuildPath, "index.html"));
        });
    }

    return app;
}

function registerSocketHandlers(io, state, options = {}) {
    const { persistentStore, auditLog } = options;

    function scheduleStatePersist() {
        if (persistentStore) {
            persistentStore.schedulePersist(state);
        }
    }

    function recordAudit(eventType, payload) {
        if (!auditLog) return;
        try {
            auditLog.append(eventType, payload);
        } catch (error) {
            console.error("Failed to write audit event:", error.message);
        }
    }

    io.use((socket, next) => {
        const token = getTokenFromSocket(socket);
        if (!token || !process.env.JWT_SECRET) {
            recordAudit("socket_auth_denied", {
                socketId: socket.id,
                reason: "missing_token_or_secret",
                ip: socket.handshake.address || null
            });
            return next(new Error("Unauthorized"));
        }

        try {
            const claims = jwt.verify(token, process.env.JWT_SECRET, {
                issuer: "radar-backend",
                audience: "radar-clients"
            });

            if (!claims?.username || typeof claims.username !== "string") {
                recordAudit("socket_auth_denied", {
                    socketId: socket.id,
                    reason: "invalid_claims",
                    ip: socket.handshake.address || null
                });
                return next(new Error("Unauthorized"));
            }

            socket.user = { username: claims.username.trim() };
            return next();
        } catch (error) {
            recordAudit("socket_auth_denied", {
                socketId: socket.id,
                reason: "jwt_verification_failed",
                ip: socket.handshake.address || null
            });
            return next(new Error("Unauthorized"));
        }
    });

    io.on("connection", (socket) => {
        console.log("A user connected:", socket.id);

        socket.on("joinRoom", ({ roomId, password }) => {
            if (!isValidRoomId(roomId)) {
                socket.emit("notAllowed", "Invalid room id.");
                recordAudit("join_room_denied", {
                    actor: socket.user?.username || null,
                    socketId: socket.id,
                    roomId,
                    reason: "invalid_room_id"
                });
                return;
            }

            socket.username = socket.user.username;
            socket.isMod = moderatorUsernames.includes(socket.username);
            socket.forumModOf = Object.entries(moderators).find(
                ([forumName, mods]) => mods.includes(socket.username)
            )?.[0] || null;

            const isJoiningPrivateRoom = state.roomPasswords.has(roomId);
            const submittedPassword = typeof password === "string" ? password : "";

            if (isJoiningPrivateRoom && state.roomPasswords.get(roomId) !== hashRoomPassword(submittedPassword) && !socket.isMod) {
                socket.emit("wrongPassword");
                recordAudit("join_room_denied", {
                    actor: socket.user?.username || null,
                    socketId: socket.id,
                    roomId,
                    reason: "wrong_password"
                });
                return;
            }

            socket.join(roomId);
            state.users.set(socket.id, { id: socket.id, username: socket.username, roomId });

            if (!state.roomPasswords.has(roomId) && !socket.isMod && submittedPassword.trim()) {
                state.roomPasswords.set(roomId, hashRoomPassword(submittedPassword));
                scheduleStatePersist();
            }

            const peersInRoom = Array.from(state.users.values()).filter((user) => user.roomId === roomId);
            io.to(roomId).emit("updatePeers", peersInRoom);
            socket.to(roomId).emit("userJoined", socket.username);
            recordAudit("join_room", {
                actor: socket.username,
                socketId: socket.id,
                roomId,
                isModerator: socket.isMod
            });
        });

        socket.on("sendMessage", ({ roomId, message }) => {
            if (!isValidRoomId(roomId)) {
                socket.emit("notAllowed", "Invalid room id.");
                recordAudit("send_message_denied", {
                    actor: socket.user?.username || null,
                    socketId: socket.id,
                    roomId,
                    reason: "invalid_room_id"
                });
                return;
            }

            if (!isValidMessagePayload(message)) {
                socket.emit("notAllowed", "Invalid message payload.");
                recordAudit("send_message_denied", {
                    actor: socket.user?.username || null,
                    socketId: socket.id,
                    roomId,
                    reason: "invalid_message_payload"
                });
                return;
            }

            const sender = socket.user.username;
            if (message.sender !== sender) {
                socket.emit("notAllowed", "Invalid sender identity.");
                recordAudit("send_message_denied", {
                    actor: socket.user?.username || null,
                    socketId: socket.id,
                    roomId,
                    messageId: message.id,
                    reason: "sender_mismatch"
                });
                return;
            }

            const roomMessages = state.messages.get(roomId) || new Map();
            roomMessages.set(message.id, { ...message, sender });
            state.messages.set(roomId, roomMessages);
            scheduleStatePersist();

            io.to(roomId).emit("message", { username: sender, message });
            recordAudit("send_message", {
                actor: sender,
                socketId: socket.id,
                roomId,
                messageId: message.id
            });
        });

        socket.on("deleteMessage", ({ roomId, id, deletedBy }) => {
            if (!isValidRoomId(roomId) || typeof id !== "string") {
                socket.emit("notAllowed", "Invalid delete request.");
                recordAudit("delete_message_denied", {
                    actor: socket.user?.username || null,
                    socketId: socket.id,
                    roomId,
                    messageId: id,
                    reason: "invalid_request"
                });
                return;
            }

            const isMod = socket.isMod;
            const rooms = Array.from(socket.rooms);
            const roomMessages = state.messages.get(roomId);
            const targetMessage = roomMessages?.get(id);

            if (!targetMessage) {
                socket.emit("notAllowed", "Message not found.");
                recordAudit("delete_message_denied", {
                    actor: socket.user?.username || null,
                    socketId: socket.id,
                    roomId,
                    messageId: id,
                    reason: "message_not_found"
                });
                return;
            }

            if (deletedBy === "user" && targetMessage.sender === socket.user.username) {
                roomMessages.set(id, {
                    ...targetMessage,
                    deleted: true,
                    deletedBy,
                    deletedAt: new Date().toISOString()
                });
                scheduleStatePersist();
                io.to(roomId).emit("deleteMessage", { id, deletedBy });
                recordAudit("delete_message", {
                    actor: socket.user.username,
                    socketId: socket.id,
                    roomId,
                    messageId: id,
                    deletedBy
                });
            } else if (deletedBy === "mod" && isMod && rooms.includes(roomId)) {
                roomMessages.set(id, {
                    ...targetMessage,
                    deleted: true,
                    deletedBy,
                    deletedAt: new Date().toISOString()
                });
                scheduleStatePersist();
                io.to(roomId).emit("deleteMessage", { id, deletedBy });
                recordAudit("delete_message", {
                    actor: socket.user.username,
                    socketId: socket.id,
                    roomId,
                    messageId: id,
                    deletedBy
                });
            } else {
                socket.emit("notAllowed", "You are not authorized to delete this message.");
                recordAudit("delete_message_denied", {
                    actor: socket.user?.username || null,
                    socketId: socket.id,
                    roomId,
                    messageId: id,
                    reason: "unauthorized"
                });
            }
        });

        socket.on("editMessage", ({ roomId, id, newText }) => {
            if (!isValidRoomId(roomId) || typeof id !== "string" || typeof newText !== "string") {
                socket.emit("notAllowed", "Invalid edit request.");
                recordAudit("edit_message_denied", {
                    actor: socket.user?.username || null,
                    socketId: socket.id,
                    roomId,
                    messageId: id,
                    reason: "invalid_request"
                });
                return;
            }

            if (newText.length === 0 || newText.length > MAX_MESSAGE_LENGTH) {
                socket.emit("notAllowed", "Invalid message size.");
                recordAudit("edit_message_denied", {
                    actor: socket.user?.username || null,
                    socketId: socket.id,
                    roomId,
                    messageId: id,
                    reason: "invalid_size"
                });
                return;
            }

            const roomMessages = state.messages.get(roomId);
            const targetMessage = roomMessages?.get(id);
            if (!targetMessage) {
                socket.emit("notAllowed", "Message not found.");
                recordAudit("edit_message_denied", {
                    actor: socket.user?.username || null,
                    socketId: socket.id,
                    roomId,
                    messageId: id,
                    reason: "message_not_found"
                });
                return;
            }

            const canEdit = socket.isMod || targetMessage.sender === socket.user.username;
            if (!canEdit) {
                socket.emit("notAllowed", "You are not authorized to edit this message.");
                recordAudit("edit_message_denied", {
                    actor: socket.user?.username || null,
                    socketId: socket.id,
                    roomId,
                    messageId: id,
                    reason: "unauthorized"
                });
                return;
            }

            roomMessages.set(id, { ...targetMessage, message: newText });
            scheduleStatePersist();
            io.to(roomId).emit("editMessage", { id, newText });
            recordAudit("edit_message", {
                actor: socket.user.username,
                socketId: socket.id,
                roomId,
                messageId: id
            });
        });

        socket.on("reactToMessage", ({ roomId, messageId, emoji, action }) => {
            if (!isValidRoomId(roomId) || typeof messageId !== "string") {
                socket.emit("notAllowed", "Invalid reaction payload.");
                recordAudit("react_message_denied", {
                    actor: socket.user?.username || null,
                    socketId: socket.id,
                    roomId,
                    messageId,
                    reason: "invalid_payload"
                });
                return;
            }

            if (!ALLOWED_REACTIONS.has(emoji)) {
                socket.emit("notAllowed", "Unsupported reaction.");
                recordAudit("react_message_denied", {
                    actor: socket.user?.username || null,
                    socketId: socket.id,
                    roomId,
                    messageId,
                    reason: "unsupported_emoji"
                });
                return;
            }

            if (!["add", "remove"].includes(action)) {
                socket.emit("notAllowed", "Invalid reaction action.");
                recordAudit("react_message_denied", {
                    actor: socket.user?.username || null,
                    socketId: socket.id,
                    roomId,
                    messageId,
                    reason: "invalid_action"
                });
                return;
            }

            io.to(roomId).emit("updateReactions", {
                messageId,
                emoji,
                username: socket.user.username,
                action
            });
            recordAudit("react_message", {
                actor: socket.user.username,
                socketId: socket.id,
                roomId,
                messageId,
                emoji,
                action
            });
        });

        socket.on("leaveRoom", (roomId) => {
            if (typeof roomId === "string" && roomId) {
                socket.leave(roomId);
                recordAudit("leave_room", {
                    actor: socket.user?.username || null,
                    socketId: socket.id,
                    roomId
                });
            }
        });

        socket.on("disconnect", () => {
            const user = state.users.get(socket.id);
            state.users.delete(socket.id);

            if (user) {
                const peersInRoom = Array.from(state.users.values()).filter((u) => u.roomId === user.roomId);
                io.to(user.roomId).emit("updatePeers", peersInRoom);
                socket.to(user.roomId).emit("userLeft", user.username);
                recordAudit("disconnect", {
                    actor: user.username,
                    socketId: socket.id,
                    roomId: user.roomId
                });
            }

            console.log("A user disconnected:", socket.id);
        });
    });
}

function createRealtimeServer(options = {}) {
    const app = createApp(options);
    const server = http.createServer(app);
    const allowedOrigins = resolveAllowedOrigins(options.allowCorsOrigin);
    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"]
        }
    });

    const persistenceFile = options.persistenceFile || path.join(__dirname, "data", "state.json");
    const auditLogFile = options.auditLogFile || path.join(__dirname, "data", "audit.log");
    const enablePersistence = options.enablePersistence ?? process.env.NODE_ENV !== "test";
    const enableAuditLog = options.enableAuditLog ?? process.env.NODE_ENV !== "test";

    const persistentStore = enablePersistence ? createPersistentStateStore(persistenceFile) : null;
    const persistedState = persistentStore ? persistentStore.load() : { roomPasswords: new Map(), messages: new Map() };
    const auditLog = enableAuditLog ? createAuditLog(auditLogFile) : null;

    const state = {
        users: new Map(),
        roomPasswords: persistedState.roomPasswords,
        messages: persistedState.messages
    };

    registerSocketHandlers(io, state, { persistentStore, auditLog });

    app.get("/api/system/audit-health", (req, res) => {
        if (!auditLog) {
            res.status(200).json({ enabled: false });
            return;
        }

        const health = auditLog.health();
        res.status(health.valid ? 200 : 500).json({ enabled: true, ...health });
    });

    return { app, server, io, state };
}

function startServer(port = process.env.PORT || 5000) {
    const { server } = createRealtimeServer();
    server.listen(port, () => console.log(`Server running on port ${port}`));
    return server;
}

if (require.main === module) {
    startServer();
}

module.exports = {
    createApp,
    createRealtimeServer,
    startServer
};
