const mongoose = require('mongoose');

/**
 * Notification Schema
 * Stores user notifications (leave status updates, system alerts).
 * Auto-expires after 30 days via TTL index on createdAt.
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true, // Frequently queried per user
    },

    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },

    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [300, 'Message cannot exceed 300 characters'],
    },

    read: {
      type: Boolean,
      default: false,
      index: true, // Queried for unread count
    },

    type: {
      type: String,
      enum: ['leave_submitted', 'leave_approved', 'leave_rejected', 'system'],
      default: 'system',
    },

    // Optional: link to the related leave request
    relatedLeaveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Leave',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── TTL Index: Auto-Delete Old Notifications ────────────────────────────────
// Automatically deletes notifications older than 30 days.
// MongoDB checks TTL indexes every 60 seconds.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days

// ─── Compound Index for Queries ──────────────────────────────────────────────
// Optimizes queries: "get unread notifications for user X sorted by date"
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// ─── Static Method: Create Notification ──────────────────────────────────────
// Convenience method for creating notifications in controllers:
// Notification.createNotification(userId, title, message, type, leaveId)
notificationSchema.statics.createNotification = async function (
  userId,
  title,
  message,
  type = 'system',
  relatedLeaveId = null
) {
  try {
    return await this.create({
      userId,
      title,
      message,
      type,
      relatedLeaveId,
    });
  } catch (error) {
    console.error('Error creating notification:', error.message);
    throw error;
  }
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
