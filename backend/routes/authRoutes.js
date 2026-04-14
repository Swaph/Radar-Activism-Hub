const express = require("express");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const router = express.Router();

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,24}$/;

const generateUsername = () => {
  const adjectives = ["Rebel", "Shadow", "Cipher", "Ghost"];
  const nouns = ["X", "Hawk", "Sentinel", "Phantom"];
  return (
      adjectives[Math.floor(Math.random() * adjectives.length)] +
      nouns[Math.floor(Math.random() * nouns.length)] +
      Math.floor(Math.random() * 100)
  );
};

router.post("/guest", (req, res) => {
  const requestedUsername = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const username = USERNAME_PATTERN.test(requestedUsername) ? requestedUsername : generateUsername();

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: "Missing JWT_SECRET in .env" });
  }

  const token = jwt.sign({ username }, process.env.JWT_SECRET, {
    expiresIn: "2h",
    issuer: "radar-backend",
    audience: "radar-clients"
  });

  res.json({ token, username });
});

module.exports = router;