const jwt = require('jsonwebtoken');

/**
 * generateToken
 * Creates a signed JWT containing the user's ID and role.
 *
 * Why store role in the token?
 * - Avoids a DB lookup on every request just to check role.
 * - Middleware can read role directly from req.user without hitting MongoDB.
 *
 * Security notes:
 * - JWT_SECRET should be at least 32 random characters in production.
 * - JWT_EXPIRE controls token lifetime (e.g. "7d", "24h", "1h").
 * - Tokens are stateless — to invalidate early (logout), maintain a server-side
 *   blocklist or switch to short-lived tokens + refresh token rotation.
 *
 * @param {string} id   - MongoDB ObjectId of the user
 * @param {string} role - "student" or "admin"
 * @returns {string}    - Signed JWT string
 */
const generateToken = (id, role) => {
  return jwt.sign(
    {
      id,   // Subject: identifies the user
      role, // Claim: role used by roleMiddleware to gate admin routes
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    }
  );
};

/**
 * verifyToken
 * Decodes and verifies a JWT string.
 * Returns the decoded payload or throws if invalid / expired.
 *
 * Used in authMiddleware so verification logic lives in one place.
 *
 * @param {string} token - Raw JWT string
 * @returns {object}     - Decoded payload { id, role, iat, exp }
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
