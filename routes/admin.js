const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

// Admin authentication middleware
const adminMiddleware = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Get all users
router.get("/users", adminMiddleware, (req, res) => {
  const usersFile = path.join(__dirname, "..", "database", "users.json");
  const userData = JSON.parse(fs.readFileSync(usersFile, "utf8"));

  // Don't send password hashes
  const users = userData.users.map((user) => ({
    id: user.id,
    username: user.username,
    role: user.role,
    credits: user.credits,
    createdAt: user.createdAt,
  }));

  res.json(users);
});

// Get analytics data
router.get("/analytics", adminMiddleware, (req, res) => {
  const usersFile = path.join(__dirname, "..", "database", "users.json");
  const scansFile = path.join(__dirname, "..", "database", "scans.json");
  const requestsFile = path.join(
    __dirname,
    "..",
    "database",
    "creditRequests.json"
  );

  const userData = JSON.parse(fs.readFileSync(usersFile, "utf8"));
  const scansData = JSON.parse(fs.readFileSync(scansFile, "utf8"));
  const requestsData = JSON.parse(fs.readFileSync(requestsFile, "utf8"));

  // Get last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Filter scans for the last 30 days
  const recentScans = scansData.scans.filter((scan) => {
    return new Date(scan.timestamp) > thirtyDaysAgo;
  });

  // Group scans by day
  const scansByDay = {};
  recentScans.forEach((scan) => {
    const date = new Date(scan.timestamp).toISOString().split("T")[0];
    scansByDay[date] = (scansByDay[date] || 0) + 1;
  });

  // Group scans by user
  const scansByUser = {};
  recentScans.forEach((scan) => {
    scansByUser[scan.userId] = (scansByUser[scan.userId] || 0) + 1;
  });

  // Get top users by scan count
  const topUsers = Object.entries(scansByUser)
    .map(([userId, count]) => {
      const user = userData.users.find((u) => u.id === userId);
      return {
        userId,
        username: user ? user.username : "Unknown",
        scanCount: count,
      };
    })
    .sort((a, b) => b.scanCount - a.scanCount)
    .slice(0, 10);

  // Count pending credit requests
  const pendingRequests = requestsData.requests.filter(
    (req) => req.status === "pending"
  ).length;

  // Count total users
  const totalUsers = userData.users.filter(
    (user) => user.role === "user"
  ).length;

  // Prepare analytics data
  const analytics = {
    totalScans: scansData.scans.length,
    scansLast30Days: recentScans.length,
    scansByDay,
    totalUsers,
    topUsers,
    pendingCreditRequests: pendingRequests,
  };

  res.json(analytics);
});

// Get all credit requests
router.get("/credit-requests", adminMiddleware, (req, res) => {
  const requestsFile = path.join(
    __dirname,
    "..",
    "database",
    "creditRequests.json"
  );
  const requestsData = JSON.parse(fs.readFileSync(requestsFile, "utf8"));

  res.json(requestsData.requests);
});

// Approve or deny credit request
router.post("/credit-requests/:requestId", adminMiddleware, (req, res) => {
  const { requestId } = req.params;
  const { action, adminResponse } = req.body;

  if (!action || (action !== "approve" && action !== "deny")) {
    return res
      .status(400)
      .json({ error: 'Invalid action. Must be "approve" or "deny"' });
  }

  const requestsFile = path.join(
    __dirname,
    "..",
    "database",
    "creditRequests.json"
  );
  const requestsData = JSON.parse(fs.readFileSync(requestsFile, "utf8"));

  const requestIndex = requestsData.requests.findIndex(
    (r) => r.id === requestId
  );

  if (requestIndex === -1) {
    return res.status(404).json({ error: "Credit request not found" });
  }

  const request = requestsData.requests[requestIndex];

  // Check if request is already processed
  if (request.status !== "pending") {
    return res
      .status(400)
      .json({ error: `Request is already ${request.status}` });
  }

  // Update request status
  request.status = action === "approve" ? "approved" : "denied";
  request.responseDate = new Date().toISOString();
  request.adminResponse = adminResponse || "";

  // If approved, add credits to the user
  if (action === "approve") {
    const usersFile = path.join(__dirname, "..", "database", "users.json");
    const userData = JSON.parse(fs.readFileSync(usersFile, "utf8"));

    const userIndex = userData.users.findIndex((u) => u.id === request.userId);

    if (userIndex !== -1) {
      userData.users[userIndex].credits += request.amount;
      fs.writeFileSync(usersFile, JSON.stringify(userData, null, 2));
    }
  }

  // Save updated requests
  requestsData.requests[requestIndex] = request;
  fs.writeFileSync(requestsFile, JSON.stringify(requestsData, null, 2));

  res.json({
    message: `Credit request ${
      action === "approve" ? "approved" : "denied"
    } successfully`,
    request,
  });
});

module.exports = router;
