const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { findSimilarDocuments } = require("../utils/textMatch");

// Configure multer for file upload with improved settings
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "..", "uploaded_documents"));
  },
  filename: function (req, file, cb) {
    // Use original filename with timestamp to prevent overwrites
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExt = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + fileExt);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only text files and PDFs
    if (
      file.mimetype === "text/plain" ||
      file.mimetype === "application/pdf" ||
      file.originalname.endsWith(".txt") ||
      file.originalname.endsWith(".pdf")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only .txt and .pdf files are supported"), false);
    }
  },
});

// Authentication middleware
const authMiddleware = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Credit check middleware
const creditCheckMiddleware = (req, res, next) => {
  const userId = req.session.user.id;
  const usersFile = path.join(__dirname, "..", "database", "users.json");
  const userData = JSON.parse(fs.readFileSync(usersFile, "utf8"));

  const user = userData.users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (user.credits <= 0) {
    return res.status(403).json({
      error: "Insufficient credits",
      message:
        "You have no credits left. Please request more credits or wait until tomorrow.",
    });
  }

  next();
};

// Clean up previously uploaded documents (24 hours old or more)
function cleanUpOldUploads() {
  const uploadDir = path.join(__dirname, "..", "uploaded_documents");
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error("Error reading upload directory:", err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(uploadDir, file);

      // Get file stats
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error getting stats for ${file}:`, err);
          return;
        }

        // Check if file is older than 24 hours
        if (now - stats.mtime.getTime() > oneDayMs) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`Error deleting old file ${file}:`, err);
            } else {
              console.log(`Deleted old upload: ${file}`);
            }
          });
        }
      });
    });
  });
}

// Run cleanup once on server start and every 12 hours
cleanUpOldUploads();
setInterval(cleanUpOldUploads, 12 * 60 * 60 * 1000);

// Scan document
router.post(
  "/",
  authMiddleware,
  creditCheckMiddleware,
  upload.single("document"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Read the uploaded file
      const filePath = req.file.path;
      const documentContent = fs.readFileSync(filePath, "utf8");
      const documentName = req.file.originalname;

      // Find similar documents
      const matches = findSimilarDocuments(documentContent);

      // Deduct 1 credit from user
      const userId = req.session.user.id;
      const usersFile = path.join(__dirname, "..", "database", "users.json");
      const userData = JSON.parse(fs.readFileSync(usersFile, "utf8"));

      const userIndex = userData.users.findIndex((u) => u.id === userId);
      userData.users[userIndex].credits -= 1;
      fs.writeFileSync(usersFile, JSON.stringify(userData, null, 2));

      // Update session with new credit count
      req.session.user.credits = userData.users[userIndex].credits;

      // Record the scan
      const scanId = "scan-" + Date.now();
      const scan = {
        id: scanId,
        userId,
        documentName,
        timestamp: new Date().toISOString(),
        matches: matches.map((match) => ({
          filename: match.filename,
          similarity: match.similarity,
        })),
      };

      const scansFile = path.join(__dirname, "..", "database", "scans.json");
      const scansData = JSON.parse(fs.readFileSync(scansFile, "utf8"));
      scansData.scans.push(scan);
      fs.writeFileSync(scansFile, JSON.stringify(scansData, null, 2));

      // Save the document to stored_documents if it has unique content
      if (matches.length === 0 || matches[0].similarity < 0.9) {
        const storedDocPath = path.join(
          __dirname,
          "..",
          "stored_documents",
          `${scanId}.txt`
        );
        fs.writeFileSync(storedDocPath, documentContent);
      }

      // Return matches
      res.status(200).json({
        message: "Document scanned successfully",
        scanId,
        creditsRemaining: userData.users[userIndex].credits,
        matches,
      });
    } catch (error) {
      console.error("Error scanning document:", error);
      res.status(500).json({ error: "Failed to scan document" });
    }
  }
);

// Get matches for a document
router.get("/matches/:scanId", authMiddleware, (req, res) => {
  const { scanId } = req.params;
  const scansFile = path.join(__dirname, "..", "database", "scans.json");
  const scansData = JSON.parse(fs.readFileSync(scansFile, "utf8"));

  const scan = scansData.scans.find((s) => s.id === scanId);

  if (!scan) {
    return res.status(404).json({ error: "Scan not found" });
  }

  // Check if the user owns this scan
  if (
    scan.userId !== req.session.user.id &&
    req.session.user.role !== "admin"
  ) {
    return res.status(403).json({ error: "Access denied" });
  }

  res.json({
    scanId,
    documentName: scan.documentName,
    timestamp: scan.timestamp,
    matches: scan.matches,
  });
});

module.exports = router;
