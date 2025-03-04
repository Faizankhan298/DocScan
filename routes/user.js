const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

// Authentication middleware
const authMiddleware = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Get user profile
router.get("/profile", authMiddleware, (req, res) => {
  const userId = req.session.user.id;
  const usersFile = path.join(__dirname, "..", "database", "users.json");
  const scansFile = path.join(__dirname, "..", "database", "scans.json");

  // Get user data
  const userData = JSON.parse(fs.readFileSync(usersFile, "utf8"));
  const user = userData.users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Get user scans
  const scansData = JSON.parse(fs.readFileSync(scansFile, "utf8"));
  const userScans = scansData.scans.filter((scan) => scan.userId === userId);

  // Get credit requests
  const requestsFile = path.join(
    __dirname,
    "..",
    "database",
    "creditRequests.json"
  );
  const requestsData = JSON.parse(fs.readFileSync(requestsFile, "utf8"));
  const userRequests = requestsData.requests.filter(
    (req) => req.userId === userId
  );

  // Format response
  const profile = {
    id: user.id,
    username: user.username,
    role: user.role,
    credits: user.credits,
    createdAt: user.createdAt,
    scans: userScans.map((scan) => ({
      id: scan.id,
      documentName: scan.documentName,
      timestamp: scan.timestamp,
      matchCount: scan.matches ? scan.matches.length : 0,
    })),
    creditRequests: userRequests.map((req) => ({
      id: req.id,
      amount: req.amount,
      status: req.status,
      requestDate: req.requestDate,
      responseDate: req.responseDate || null,
    })),
  };

  res.json(profile);
});

// Export scan history
router.get("/export-history", authMiddleware, (req, res) => {
  const userId = req.session.user.id;
  const scansFile = path.join(__dirname, "..", "database", "scans.json");

  // Get user scans
  const scansData = JSON.parse(fs.readFileSync(scansFile, "utf8"));
  const userScans = scansData.scans.filter((scan) => scan.userId === userId);

  // Format as plain text
  const history = userScans
    .map((scan) => {
      return `Document: ${scan.documentName}\nDate: ${new Date(
        scan.timestamp
      ).toLocaleString()}\nMatches: ${
        scan.matches ? scan.matches.length : 0
      }\n${"-".repeat(40)}`;
    })
    .join("\n\n");

  const output = `SCAN HISTORY FOR ${req.session.user.username.toUpperCase()}\nExported on: ${new Date().toLocaleString()}\n\n${history}`;

  res.setHeader("Content-Type", "text/plain");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="scan_history.txt"'
  );
  res.send(output);
});

module.exports = router;
