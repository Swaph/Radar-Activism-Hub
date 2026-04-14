const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function computeEntryHash(entryWithoutHash) {
  return sha256(stableStringify(entryWithoutHash));
}

function verifyAuditLogFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { valid: true, sequence: 0, lastHash: null };
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  let previousHash = null;

  for (let index = 0; index < lines.length; index += 1) {
    let parsed;
    try {
      parsed = JSON.parse(lines[index]);
    } catch (error) {
      return { valid: false, error: `Invalid JSON on line ${index + 1}` };
    }

    if (parsed.sequence !== index + 1) {
      return { valid: false, error: `Sequence mismatch on line ${index + 1}` };
    }

    if ((parsed.prevHash ?? null) !== previousHash) {
      return { valid: false, error: `prevHash mismatch on line ${index + 1}` };
    }

    const { hash, ...withoutHash } = parsed;
    const recomputed = computeEntryHash(withoutHash);
    if (hash !== recomputed) {
      return { valid: false, error: `Hash mismatch on line ${index + 1}` };
    }

    previousHash = parsed.hash;
  }

  return {
    valid: true,
    sequence: lines.length,
    lastHash: previousHash
  };
}

function createAuditLog(filePath) {
  ensureDir(filePath);
  const verification = verifyAuditLogFile(filePath);
  let sequence = verification.valid ? verification.sequence : 0;
  let lastHash = verification.valid ? verification.lastHash : null;

  if (!verification.valid) {
    throw new Error(`Audit log verification failed: ${verification.error}`);
  }

  function append(eventType, payload = {}) {
    sequence += 1;
    const entryWithoutHash = {
      sequence,
      timestamp: new Date().toISOString(),
      prevHash: lastHash,
      eventType,
      payload
    };

    const entry = {
      ...entryWithoutHash,
      hash: computeEntryHash(entryWithoutHash)
    };

    fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`);
    lastHash = entry.hash;
    return entry;
  }

  function health() {
    return verifyAuditLogFile(filePath);
  }

  return {
    append,
    health
  };
}

module.exports = {
  createAuditLog,
  verifyAuditLogFile
};
