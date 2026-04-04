// electron/security_utils.js
// Industry-grade encryption utilities for clinical data backups.
// Uses AES-256-GCM with PBKDF2 key derivation.

const crypto = require("crypto");
const fs = require("fs");

/**
 * Encrypt a file buffer using a password.
 * @param {Buffer} buffer - The data to encrypt.
 * @param {string} password - The user-provided encryption password.
 * @returns {Buffer} - The full payload: [SALT(16) | IV(12) | TAG(16) | CIPHER]
 */
function encryptBuffer(buffer, password) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12); // GCM standard IV length
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combine into a single transportable buffer
  return Buffer.concat([salt, iv, tag, encrypted]);
}

/**
 * Decrypt a backup buffer using a password.
 * @param {Buffer} data - The full payload: [SALT(16) | IV(12) | TAG(16) | CIPHER]
 * @param {string} password - The user-provided encryption password.
 * @returns {Buffer} - The original decrypted buffer.
 */
function decryptBuffer(data, password) {
  try {
    const salt = data.subarray(0, 16);
    const iv = data.subarray(16, 28);
    const tag = data.subarray(28, 44);
    const encrypted = data.subarray(44);

    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch (err) {
    throw new Error("Decryption failed. Incorrect password or corrupted file.");
  }
}

module.exports = {
  encryptBuffer,
  decryptBuffer
};
