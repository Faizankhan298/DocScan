const crypto = require("crypto");

/**
 * Generate password hash using pbkdf2
 *
 * @param {string} password - The plain text password
 * @param {string} [salt] - Optional salt, generated if not provided
 * @returns {Object} Object containing hash and salt
 */
function hashPassword(password, salt = null) {
  // Generate salt if not provided
  const passwordSalt = salt || crypto.randomBytes(16).toString("hex");

  // Generate hash
  const hash = crypto
    .pbkdf2Sync(password, passwordSalt, 1000, 64, "sha512")
    .toString("hex");

  return {
    hash,
    salt: passwordSalt,
  };
}

/**
 * Verify a password against a hash
 *
 * @param {string} password - The plain text password to verify
 * @param {string} hash - The stored hash
 * @param {string} salt - The stored salt
 * @returns {boolean} True if password matches, false otherwise
 */
function verifyPassword(password, hash, salt) {
  const generatedHash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return generatedHash === hash;
}

module.exports = { hashPassword, verifyPassword };
