const { io: Client } = require("socket.io-client");

const API_BASE = process.env.API_BASE || "http://127.0.0.1:5000";
const ROOM_ID = process.env.BENCH_ROOM_ID || "resilience-benchmark-room";
const CLIENTS = Number(process.env.BENCH_CLIENTS || 8);
const DURATION_MS = Number(process.env.BENCH_DURATION_MS || 30000);
const SEND_INTERVAL_MS = Number(process.env.BENCH_SEND_INTERVAL_MS || 600);
const CHURN_INTERVAL_MS = Number(process.env.BENCH_CHURN_INTERVAL_MS || 5000);
const CHURN_COUNT = Number(process.env.BENCH_CHURN_COUNT || 2);

function percentile(values, pct) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1);
  return sorted[index];
}

async function fetchGuestIdentity() {
  const response = await fetch(`${API_BASE}/api/auth/guest`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get guest token (${response.status}): ${text}`);
  }

  return response.json();
}

async function createUserClient(clientLabel, metrics) {
  const { token, username } = await fetchGuestIdentity();

  return new Promise((resolve, reject) => {
    const socket = new Client(API_BASE, {
      transports: ["websocket"],
      auth: { token }
    });

    const reconnectStart = Date.now();
    const pendingSends = new Map();

    socket.once("connect", () => {
      socket.emit("joinRoom", { roomId: ROOM_ID, password: "bench-pass" });
      metrics.reconnectMs.push(Date.now() - reconnectStart);
      resolve({
        label: clientLabel,
        username,
        socket,
        pendingSends
      });
    });

    socket.once("connect_error", (error) => {
      reject(error);
    });

    socket.on("message", ({ message }) => {
      if (!message || typeof message !== "object" || !message.id) {
        return;
      }

      const sentAt = pendingSends.get(message.id);
      if (!sentAt) {
        return;
      }

      pendingSends.delete(message.id);
      metrics.delivered += 1;
      metrics.latenciesMs.push(Date.now() - sentAt);
    });

    socket.on("disconnect", () => {
      // no-op; reconnect is measured on next connect event if it happens.
    });
  });
}

async function main() {
  const metrics = {
    sent: 0,
    delivered: 0,
    latenciesMs: [],
    reconnectMs: []
  };

  const clients = [];
  for (let i = 0; i < CLIENTS; i += 1) {
    const client = await createUserClient(`client-${i + 1}`, metrics);
    clients.push(client);
  }

  const sendTimer = setInterval(() => {
    for (const client of clients) {
      if (!client.socket.connected) continue;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      client.pendingSends.set(id, Date.now());
      metrics.sent += 1;

      client.socket.emit("sendMessage", {
        roomId: ROOM_ID,
        message: {
          id,
          sender: client.username,
          message: `bench-${client.label}-${id}`,
          timestamp: new Date().toISOString()
        }
      });
    }
  }, SEND_INTERVAL_MS);

  const churnTimer = setInterval(async () => {
    const churnCandidates = clients
      .filter((client) => client.socket.connected)
      .slice(0, CHURN_COUNT);

    for (const candidate of churnCandidates) {
      const reconnectStart = Date.now();
      candidate.socket.disconnect();
      candidate.socket.connect();

      await new Promise((resolve) => {
        candidate.socket.once("connect", () => {
          metrics.reconnectMs.push(Date.now() - reconnectStart);
          candidate.socket.emit("joinRoom", { roomId: ROOM_ID, password: "bench-pass" });
          resolve();
        });
      });
    }
  }, CHURN_INTERVAL_MS);

  await new Promise((resolve) => setTimeout(resolve, DURATION_MS));

  clearInterval(sendTimer);
  clearInterval(churnTimer);

  for (const client of clients) {
    client.socket.disconnect();
  }

  const deliverySuccessRate = metrics.sent === 0 ? 0 : (metrics.delivered / metrics.sent) * 100;
  const p95 = percentile(metrics.latenciesMs, 95);
  const p99 = percentile(metrics.latenciesMs, 99);
  const reconnectP95 = percentile(metrics.reconnectMs, 95);

  const summary = {
    apiBase: API_BASE,
    roomId: ROOM_ID,
    clients: CLIENTS,
    durationMs: DURATION_MS,
    sendIntervalMs: SEND_INTERVAL_MS,
    churnIntervalMs: CHURN_INTERVAL_MS,
    churnCount: CHURN_COUNT,
    sent: metrics.sent,
    delivered: metrics.delivered,
    deliverySuccessRate: Number(deliverySuccessRate.toFixed(2)),
    p95LatencyMs: p95,
    p99LatencyMs: p99,
    reconnectP95Ms: reconnectP95,
    collectedAt: new Date().toISOString()
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("Benchmark failed:", error.message);
  process.exit(1);
});
