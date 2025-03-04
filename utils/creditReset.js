const fs = require("fs");
const path = require("path");

/**
 * Reset all users' free credits to 20 at midnight
 */
function resetCredits() {
  console.log("Resetting free credits for all users");

  const usersFile = path.join(__dirname, "..", "database", "users.json");

  try {
    const data = JSON.parse(fs.readFileSync(usersFile, "utf8"));

    // Reset credits for all regular users
    data.users.forEach((user) => {
      if (user.role === "user") {
        user.credits = 20; // Reset to 20 free credits
      }
    });

    // Write updated data back to file
    fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));

    // Log reset event
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: "credits_reset",
      message: "Daily free credits reset for all users",
    };

    // Append to log file
    const logFile = path.join(__dirname, "..", "database", "system_logs.json");
    let logs = [];

    if (fs.existsSync(logFile)) {
      logs = JSON.parse(fs.readFileSync(logFile, "utf8")).logs;
    }

    logs.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify({ logs }, null, 2));

    console.log("Credits reset successfully");
  } catch (error) {
    console.error("Error resetting credits:", error);
  }
}

module.exports = resetCredits;
