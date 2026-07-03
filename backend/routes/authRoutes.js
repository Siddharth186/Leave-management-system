const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getProfile,
  updateProfile,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');
const {
  validateRegister,
  validateLogin,
} = require('../middleware/validationMiddleware');

/**
 * AUTH ROUTES
 * Base path: /api/auth
 *
 * Route Summary:
 * ┌─────────────────────────────┬──────────┬───────────────────────────────┐
 * │ Endpoint                    │ Access   │ Description                   │
 * ├─────────────────────────────┼──────────┼───────────────────────────────┤
 * │ POST   /api/auth/register   │ Public   │ Register a new user           │
 * │ POST   /api/auth/login      │ Public   │ Login and receive JWT         │
 * │ GET    /api/auth/profile    │ Private  │ Get current user profile      │
 * │ PUT    /api/auth/profile    │ Private  │ Update current user profile   │
 * └─────────────────────────────┴──────────┴───────────────────────────────┘
 *
 * Middleware chain pattern:
 * Public  route: [validator]          → controller
 * Private route: [protect, validator] → controller
 */

// ─── Public Routes ────────────────────────────────────────────────────────────

// POST /api/auth/register — validate body, then create user
router.post('/register', validateRegister, register);

// POST /api/auth/login — validate body, then authenticate
router.post('/login', validateLogin, login);

// ─── Private Routes (require valid JWT) ──────────────────────────────────────

// GET  /api/auth/profile — get logged-in user's data
router.get('/profile', protect, getProfile);

// PUT  /api/auth/profile — update name, department, year, avatar
router.put('/profile', protect, updateProfile);

module.exports = router;
