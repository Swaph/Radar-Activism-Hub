const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();

const router = express.Router();

const generateUsername = () => {
  const adjectives = ["Rebel", "Shadow", "Cipher", "Ghost"];
  const nouns = ["X", "Hawk", "Sentinel", "Phantom"];
  return (
      adjectives[Math.floor(Math.random() * adjectives.length)] +
      nouns[Math.floor(Math.random() * nouns.length)] +
      Math.floor(Math.random() * 100)
  );
};

const generateKeyPair = () => {
  return crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
};


router.post("/guest", (req, res) => {
  const username = generateUsername();
  const { publicKey, privateKey } = generateKeyPair();

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: "Missing JWT_SECRET in .env" });
  }

  const token = jwt.sign({ username, publicKey }, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });

  res.json({ token, username, publicKey, privateKey });
});

module.exports = router;