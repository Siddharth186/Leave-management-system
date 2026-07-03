const express = require('express');
const router = express.Router();

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notificationController');

const { protect } = require('../middleware/authMiddleware');
const { validateMongoId } = require('../middleware/validationMiddleware');

/**
 * NOTIFICATION ROUTES
 * Base path: /api/notifications
 *
 * Route Summary:
 * ┌──────────────────────────────────────────┬─────────┬────────────────────────────────────────┐
 * │ Endpoint                                 │ Access  │ Description                            │
 * ├──────────────────────────────────────────┼─────────┼────────────────────────────────────────┤
 * │ GET    /api/notifications                │ Private │ Get paginated notifications for user   │
 * │ PUT    /api/notifications/read-all       │ Private │ Mark all notifications as read         │
 * │ PUT    /api/notifications/read/:id       │ Private │ Mark a single notification as read     │
 * │ DELETE /api/notifications/:id            │ Private │ Delete a specific notification         │
 * └──────────────────────────────────────────┴─────────┴────────────────────────────────────────┘
 *
 * All routes require authentication.
 * Ownership checks (user can only touch their own notifications) are in controllers.
 *
 * Route order note:
 * /read-all must be declared before /read/:id and /:id
 * to prevent "read-all" from being matched as a param value.
 */

// ─── Get Notifications ────────────────────────────────────────────────────────

// GET /api/notifications?read=false&page=1&limit=20
// Returns paginated notifications + unreadCount for badge
router.get('/', protect, getNotifications);

// ─── Mark as Read ─────────────────────────────────────────────────────────────

// PUT /api/notifications/read-all
// One-shot: marks every unread notification for this user as read
// IMPORTANT: declared before /read/:id to avoid "read-all" matching :id param
router.put('/read-all', protect, markAllAsRead);

// PUT /api/notifications/read/:id
// Marks a single notification as read
router.put('/read/:id', protect, validateMongoId, markAsRead);

// ─── Delete ───────────────────────────────────────────────────────────────────

// DELETE /api/notifications/:id
// Deletes a specific notification (ownership enforced in controller)
router.delete('/:id', protect, validateMongoId, deleteNotification);

module.exports = router;
