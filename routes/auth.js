const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { hashPassword, verifyPassword } = require("../utils/hash");

// User registration
router.post("/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  // Prevent users from registering with username "admin" or similar variations
  if (
    username.toLowerCase() === "admin" ||
    username.toLowerCase().includes("admin")
  ) {
    return res.status(403).json({
      error: "Username not allowed. Please choose a different username.",
    });
  }

  const usersFile = path.join(__dirname, "..", "database", "users.json");
  const data = JSON.parse(fs.readFileSync(usersFile, "utf8"));

  // Check if username already exists
  if (
    data.users.some(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    )
  ) {
    return res.status(409).json({ error: "Username already exists" });
  }

  // Hash password
  const { hash, salt } = hashPassword(password);

  // Create new user - always as regular user, never admin
  const newUser = {
    id: "user-" + Date.now(),
    username,
    password: hash,
    salt,
    role: "user", // Force role to be "user"
    credits: 20,
    createdAt: new Date().toISOString(),
  };

  data.users.push(newUser);
  fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));

  // Create session
  req.session.user = {
    id: newUser.id,
    username: newUser.username,
    role: newUser.role,
    credits: newUser.credits,
  };

  res.status(201).json({
    message: "User registered successfully",
    user: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      credits: newUser.credits,
    },
  });
});

// User login
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  const usersFile = path.join(__dirname, "..", "database", "users.json");
  const data = JSON.parse(fs.readFileSync(usersFile, "utf8"));

  const user = data.users.find(
    (user) => user.username.toLowerCase() === username.toLowerCase()
  );

  if (!user || !verifyPassword(password, user.password, user.salt)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  // Create session
  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    credits: user.credits,
  };

  res.json({
    message: "Login successful",
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      credits: user.credits,
    },
  });
});

// User logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.json({ message: "Logout successful" });
  });
});

module.exports = router;
