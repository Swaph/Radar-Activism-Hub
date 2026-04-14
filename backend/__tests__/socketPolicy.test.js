const { io: Client } = require("socket.io-client");
const jwt = require("jsonwebtoken");
const { createRealtimeServer } = require("../server");

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

function waitForEvent(socket, eventName, timeoutMs = 3000) {
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

describe("Socket room and moderation policy", () => {
  let server;
  let io;
  let baseUrl;

  beforeAll(async () => {
    process.env.JWT_SECRET = "socket-test-secret";
    const realtime = createRealtimeServer({ serveFrontend: false, allowCorsOrigin: "*" });
    server = realtime.server;
    io = realtime.io;

    await new Promise((resolve) => {
      server.listen(0, resolve);
    });

    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => io.close(resolve));
    await new Promise((resolve) => server.close(resolve));
    delete process.env.JWT_SECRET;
  });

  test("blocks private room join when password is wrong", async () => {
    const owner = createClient(baseUrl, "OwnerUser");
    const intruder = createClient(baseUrl, "IntruderUser");

    try {
      await waitForEvent(owner, "connect");
      owner.emit("joinRoom", {
        roomId: "private-room-policy",
        username: "OwnerUser",
        password: "correct-password"
      });
      await waitForEvent(owner, "updatePeers");

      await waitForEvent(intruder, "connect");
      const wrongPasswordPromise = waitForEvent(intruder, "wrongPassword");

      intruder.emit("joinRoom", {
        roomId: "private-room-policy",
        username: "IntruderUser",
        password: "wrong-password"
      });

      await expect(wrongPasswordPromise).resolves.toBeUndefined();
    } finally {
      owner.disconnect();
      intruder.disconnect();
    }
  });

  test("denies non-moderator requests to delete as mod", async () => {
    const user = createClient(baseUrl, "RegularUser");

    try {
      await waitForEvent(user, "connect");
      user.emit("joinRoom", {
        roomId: "policy-room",
        username: "RegularUser",
        password: "abc"
      });
      await waitForEvent(user, "updatePeers");

      user.emit("sendMessage", {
        roomId: "policy-room",
        message: {
          id: "m-1",
          sender: "RegularUser",
          message: "test message",
          timestamp: new Date().toISOString()
        }
      });
      await waitForEvent(user, "message");

      const notAllowedPromise = waitForEvent(user, "notAllowed");
      user.emit("deleteMessage", {
        roomId: "policy-room",
        id: "m-1",
        deletedBy: "mod"
      });

      await expect(notAllowedPromise).resolves.toBe("You are not authorized to delete this message.");
    } finally {
      user.disconnect();
    }
  });

  test("allows moderator to delete message as mod in joined room", async () => {
    const author = createClient(baseUrl, "TestUser");
    const moderator = createClient(baseUrl, "Donatello777");

    try {
      await waitForEvent(author, "connect");
      author.emit("joinRoom", {
        roomId: "youth-assembly",
        username: "TestUser"
      });
      await waitForEvent(author, "updatePeers");

      await waitForEvent(moderator, "connect");
      moderator.emit("joinRoom", {
        roomId: "youth-assembly",
        username: "Donatello777"
      });
      await waitForEvent(moderator, "updatePeers");

      author.emit("sendMessage", {
        roomId: "youth-assembly",
        message: {
          id: "m-2",
          sender: "TestUser",
          message: "mod target",
          timestamp: new Date().toISOString()
        }
      });
      await waitForEvent(author, "message");

      const deleteEventPromise = waitForEvent(moderator, "deleteMessage");
      moderator.emit("deleteMessage", {
        roomId: "youth-assembly",
        id: "m-2",
        deletedBy: "mod"
      });

      await expect(deleteEventPromise).resolves.toEqual({
        id: "m-2",
        deletedBy: "mod"
      });
    } finally {
      author.disconnect();
      moderator.disconnect();
    }
  });
});
