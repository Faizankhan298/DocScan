const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const session = require("express-session");
const bodyParser = require("body-parser");

// Initialize app
const app = express();
const PORT = 3000;

// Ensure directories exist
const dirs = ["./database", "./stored_documents", "./uploaded_documents"];

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize database files if they don't exist
const dbFiles = [
  { file: "./database/users.json", default: { users: [] } },
  { file: "./database/scans.json", default: { scans: [] } },
  { file: "./database/creditRequests.json", default: { requests: [] } },
];

dbFiles.forEach(({ file, default: defaultData }) => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
  }
});

// Add admin user if not exists
const usersFile = "./database/users.json";
let usersData = JSON.parse(fs.readFileSync(usersFile, "utf8"));

// Find and remove any users with role "admin" except the official admin account
let adminUsers = usersData.users.filter(user => user.role === "admin" && user.username.toLowerCase() !== "admin");
if (adminUsers.length > 0) {
  console.log(`Removing ${adminUsers.length} unauthorized admin accounts`);
  usersData.users = usersData.users.filter(user => !(user.role === "admin" && user.username.toLowerCase() !== "admin"));
}

// Check if official admin user exists
if (!usersData.users.some((user) => user.username.toLowerCase() === "admin")) {
  // Use the hash utility for consistent hashing
  const { hashPassword } = require("./utils/hash");
  const { hash, salt } = hashPassword("admin");

  usersData.users.push({
    id: "admin-" + Date.now(),
    username: "admin",
    password: hash,
    salt: salt,
    role: "admin",
    credits: 999999, // Admin has unlimited credits
    createdAt: new Date().toISOString(),
  });

  fs.writeFileSync(usersFile, JSON.stringify(usersData, null, 2));
  console.log("Admin user created successfully");
} else {
  // Make sure the existing admin user has the right role and credits
  const adminIndex = usersData.users.findIndex(user => user.username.toLowerCase() === "admin");
  if (adminIndex !== -1) {
    usersData.users[adminIndex].role = "admin";
    usersData.users[adminIndex].credits = 999999;
    fs.writeFileSync(usersFile, JSON.stringify(usersData, null, 2));
    console.log("Admin user verified and updated");
}
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "frontend")));
app.use(
  session({
    secret: "docscan-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 }, // 1 hour
  })
);

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const scanRoutes = require("./routes/scan");
const adminRoutes = require("./routes/admin");
const creditRoutes = require("./routes/credits");

// Use routes
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/scan", scanRoutes);
app.use("/admin", adminRoutes);
app.use("/credits", creditRoutes);

// Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access DocScan`);
});

// Schedule job to reset credits at midnight
const resetCredits = require("./utils/creditReset");
const schedule = () => {
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // tomorrow
    0,
    0,
    0 // midnight
  );
  const msToMidnight = night.getTime() - now.getTime();

  setTimeout(() => {
    resetCredits();
    schedule(); // Schedule next reset
  }, msToMidnight);
};

// Initialize credit reset scheduler
schedule();

module.exports = app;
