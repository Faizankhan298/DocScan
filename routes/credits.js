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

// Request credits
router.post("/request", authMiddleware, (req, res) => {
  const { amount, reason } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Please specify a valid amount" });
  }

  const userId = req.session.user.id;
  const username = req.session.user.username;

  // Create credit request
  const requestId = "req-" + Date.now();
  const request = {
    id: requestId,
    userId,
    username,
    amount: parseInt(amount),
    reason: reason || "No reason provided",
    status: "pending",
    requestDate: new Date().toISOString(),
    responseDate: null,
    adminResponse: null,
  };

  // Store the request
  const requestsFile = path.join(
    __dirname,
    "..",
    "database",
    "creditRequests.json"
  );
  const requestsData = JSON.parse(fs.readFileSync(requestsFile, "utf8"));
  requestsData.requests.push(request);
  fs.writeFileSync(requestsFile, JSON.stringify(requestsData, null, 2));

  res.status(201).json({
    message: "Credit request submitted successfully",
    requestId,
    status: "pending",
  });
});

// Check request status
router.get("/request/:requestId", authMiddleware, (req, res) => {
  const { requestId } = req.params;
  const userId = req.session.user.id;

  const requestsFile = path.join(
    __dirname,
    "..",
    "database",
    "creditRequests.json"
  );
  const requestsData = JSON.parse(fs.readFileSync(requestsFile, "utf8"));

  const request = requestsData.requests.find((r) => r.id === requestId);

  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  // Ensure user can only see their own requests (admins can see all)
  if (request.userId !== userId && req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied" });
  }

  res.json(request);
});

// Get all requests for current user
router.get("/requests", authMiddleware, (req, res) => {
  const userId = req.session.user.id;

  const requestsFile = path.join(
    __dirname,
    "..",
    "database",
    "creditRequests.json"
  );
  const requestsData = JSON.parse(fs.readFileSync(requestsFile, "utf8"));

  // Filter requests for the current user
  const userRequests = requestsData.requests.filter((r) => r.userId === userId);

  res.json(userRequests);
});

module.exports = router;
