require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { moderatorUsernames, moderators } = require('./constants/moderators.cjs');

// Initialize Express
const app = express();
app.use(express.json());
app.use(cors());

// Serve React frontend
app.use(express.static(path.join(__dirname, "frontend", "build")));

// Import authentication routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// Create HTTP server
const server = http.createServer(app);

// WebSocket server
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// In-memory storage
let users = [];
let roomPasswords = {};

// WebSocket handlers
io.on("connection", (socket) => {
    console.log("⚡ A user connected:", socket.id);

    socket.on("joinRoom", ({ roomId, username, password }) => {
        socket.username = username;
        socket.isMod = moderatorUsernames.includes(username);
        socket.forumModOf = Object.entries(moderators).find(
            ([forumName, mods]) => mods.includes(username)
        )?.[0] || null;

        const isJoiningPrivateRoom = roomPasswords[roomId] !== undefined;

        if (isJoiningPrivateRoom && roomPasswords[roomId] !== password && !socket.isMod) {
            socket.emit("wrongPassword");
            return;
        }

        socket.join(roomId);
        users.push({ id: socket.id, username, roomId });

        // Save password only if new room and not a mod
        if (!roomPasswords[roomId] && !socket.isMod) {
            roomPasswords[roomId] = password;
        }

        console.log(`📌 ${username} (${socket.id}) joined room: ${roomId}`);
        io.to(roomId).emit("updatePeers", users.filter(user => user.roomId === roomId));
        socket.to(roomId).emit("userJoined", username);
    });

    socket.on("sendMessage", ({ roomId, message, username }) => {
        io.to(roomId).emit("message", { username, message });
        console.log(`📩 ${username}: ${message.message}`);
    });

    socket.on("deleteMessage", ({ roomId, id, deletedBy }) => {
        const isMod = socket.isMod;
        const requester = socket.username;
        const rooms = Array.from(socket.rooms);

        if (deletedBy === "user") {
            io.to(roomId).emit("deleteMessage", { id, deletedBy });
        } else if (deletedBy === "mod" && isMod && rooms.includes(roomId)) {
            console.log(`🛠️ Moderator ${requester} deleted message ${id} in ${roomId}`);
            io.to(roomId).emit("deleteMessage", { id, deletedBy });
        } else {
            console.warn(`🚫 Deletion blocked. ${requester} isMod=${isMod}, inRoom=${rooms.includes(roomId)}, room=${roomId}`);
            socket.emit("notAllowed", "You are not authorized to delete this message.");
        }
    });

    socket.on("editMessage", ({ roomId, id, newText }) => {
        io.to(roomId).emit("editMessage", { id, newText });
    });

    socket.on("reactToMessage", ({ roomId, messageId, emoji, username, action }) => {
        io.to(roomId).emit("updateReactions", { messageId, emoji, username, action });
    });

    socket.on("disconnect", () => {
        const user = users.find(u => u.id === socket.id);
        users = users.filter(u => u.id !== socket.id);

        if (user) {
            io.to(user.roomId).emit("updatePeers", users.filter(u => u.roomId === user.roomId));
            socket.to(user.roomId).emit("userLeft", user.username);
        }

        console.log("❌ A user disconnected:", socket.id);
    });
});

// Fallback route
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "build", "index.html"));
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
