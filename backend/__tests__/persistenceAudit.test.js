const fs = require("fs");
const os = require("os");
const path = require("path");
const jwt = require("jsonwebtoken");
const { io: Client } = require("socket.io-client");

const { createRealtimeServer } = require("../server");
const { verifyAuditLogFile } = require("../lib/auditLog");

function createAuthToken(username) {
  return jwt.sign({ username }, process.env.JWT_SECRET, {
    expiresIn: "1h",
    issuer: "radar-backend",
    audience: "radar-clients"
  });
}

function createClient(baseUrl, username) {
  return new Client(baseUrl, {
    transports: ["websocket"],
    auth: { token: createAuthToken(username) }
  });
}

function waitForEvent(socket, eventName, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    if (eventName === "connect" && socket.connected) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);

    socket.once(eventName, (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });
}

function startRealtimeServer({ persistenceFile, auditLogFile }) {
  return new Promise((resolve) => {
    const realtime = createRealtimeServer({
      serveFrontend: false,
      allowCorsOrigin: "*",
      persistenceFile,
      auditLogFile,
      enablePersistence: true,
      enableAuditLog: true
    });

    realtime.server.listen(0, () => {
      const { port } = realtime.server.address();
      resolve({
        ...realtime,
        baseUrl: `http://127.0.0.1:${port}`
      });
    });
  });
}

async function stopRealtimeServer(realtime) {
  await new Promise((resolve) => realtime.io.close(resolve));
  await new Promise((resolve) => realtime.server.close(resolve));
}

describe("Persistent state and audit log", () => {
  let workspaceDir;
  let persistenceFile;
  let auditLogFile;

  beforeEach(() => {
    process.env.JWT_SECRET = "persist-audit-test-secret";
    workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "radar-persist-"));
    persistenceFile = path.join(workspaceDir, "state.json");
    auditLogFile = path.join(workspaceDir, "audit.log");
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  });

  test("restores persisted messages across server restart", async () => {
    const roomId = "persist-room";
    const messageId = "persist-message-id";

    const firstRun = await startRealtimeServer({ persistenceFile, auditLogFile });
    const author = createClient(firstRun.baseUrl, "PersistAuthor");

    try {
      await waitForEvent(author, "connect");
      author.emit("joinRoom", { roomId, password: "pass-123" });
      await waitForEvent(author, "updatePeers");

      author.emit("sendMessage", {
        roomId,
        message: {
          id: messageId,
          sender: "PersistAuthor",
          message: "first-pass",
          timestamp: new Date().toISOString()
        }
      });
      await waitForEvent(author, "message");
    } finally {
      author.disconnect();
      await stopRealtimeServer(firstRun);
    }

    const secondRun = await startRealtimeServer({ persistenceFile, auditLogFile });
    const editor = createClient(secondRun.baseUrl, "PersistAuthor");

    try {
      await waitForEvent(editor, "connect");
      editor.emit("joinRoom", { roomId, password: "pass-123" });
      await waitForEvent(editor, "updatePeers");

      const editEvent = waitForEvent(editor, "editMessage");
      editor.emit("editMessage", {
        roomId,
        id: messageId,
        newText: "second-pass"
      });

      await expect(editEvent).resolves.toEqual({
        id: messageId,
        newText: "second-pass"
      });
    } finally {
      editor.disconnect();
      await stopRealtimeServer(secondRun);
    }
  });

  test("writes a valid append-only audit hash chain", async () => {
    const realtime = await startRealtimeServer({ persistenceFile, auditLogFile });
    const user = createClient(realtime.baseUrl, "AuditUser");

    try {
      await waitForEvent(user, "connect");
      user.emit("joinRoom", { roomId: "audit-room", password: "audit-pass" });
      await waitForEvent(user, "updatePeers");

      user.emit("sendMessage", {
        roomId: "audit-room",
        message: {
          id: "audit-message-id",
          sender: "AuditUser",
          message: "audit-line",
          timestamp: new Date().toISOString()
        }
      });
      await waitForEvent(user, "message");
    } finally {
      user.disconnect();
      await stopRealtimeServer(realtime);
    }

    const verification = verifyAuditLogFile(auditLogFile);
    expect(verification.valid).toBe(true);
    expect(verification.sequence).toBeGreaterThanOrEqual(2);
    expect(typeof verification.lastHash).toBe("string");
    expect(verification.lastHash.length).toBeGreaterThan(0);
  });
});
