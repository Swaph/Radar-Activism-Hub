const fs = require("fs");
const path = require("path");

const DEFAULT_STATE = {
  roomPasswords: {},
  messages: {}
};

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function mapToObject(value) {
  if (!(value instanceof Map)) {
    return {};
  }

  return Object.fromEntries(value.entries());
}

function nestedMapToObject(value) {
  if (!(value instanceof Map)) {
    return {};
  }

  const objectValue = {};
  for (const [key, nested] of value.entries()) {
    objectValue[key] = mapToObject(nested);
  }
  return objectValue;
}

function objectToMap(value) {
  if (!value || typeof value !== "object") {
    return new Map();
  }
  return new Map(Object.entries(value));
}

function objectToNestedMap(value) {
  if (!value || typeof value !== "object") {
    return new Map();
  }

  const nested = new Map();
  for (const [roomId, messages] of Object.entries(value)) {
    nested.set(roomId, objectToMap(messages));
  }
  return nested;
}

function sanitizeState(value) {
  if (!value || typeof value !== "object") {
    return DEFAULT_STATE;
  }

  return {
    roomPasswords: value.roomPasswords && typeof value.roomPasswords === "object" ? value.roomPasswords : {},
    messages: value.messages && typeof value.messages === "object" ? value.messages : {}
  };
}

function createPersistentStateStore(filePath) {
  function persistNow(state) {
    ensureDir(filePath);
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      roomPasswords: mapToObject(state.roomPasswords),
      messages: nestedMapToObject(state.messages)
    };

    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2));
    fs.renameSync(tmpPath, filePath);
  }

  function schedulePersist(state) {
    try {
      persistNow(state);
    } catch (error) {
      console.error("Failed to persist state:", error.message);
    }
  }

  function load() {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          roomPasswords: new Map(),
          messages: new Map()
        };
      }

      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = sanitizeState(JSON.parse(raw));
      return {
        roomPasswords: objectToMap(parsed.roomPasswords),
        messages: objectToNestedMap(parsed.messages)
      };
    } catch (error) {
      console.error("Failed to load persistent state:", error.message);
      return {
        roomPasswords: new Map(),
        messages: new Map()
      };
    }
  }

  return {
    load,
    schedulePersist,
    persistNow
  };
}

module.exports = {
  createPersistentStateStore
};
