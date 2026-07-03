const mongoose = require('mongoose');

/**
 * Leave Schema
 * Represents a leave request submitted by a student.
 * Status workflow: pending → approved/rejected.
 * Duration is auto-calculated from startDate and endDate.
 */
const leaveSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
      index: true, // Frequently queried — index for performance
    },

    leaveType: {
      type: String,
      required: [true, 'Leave type is required'],
      enum: {
        values: ['casual', 'medical', 'emergency'],
        message: 'Leave type must be casual, medical, or emergency',
      },
    },

    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },

    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },

    reason: {
      type: String,
      required: [true, 'Reason is required'],
      minlength: [10, 'Reason must be at least 10 characters'],
      maxlength: [500, 'Reason cannot exceed 500 characters'],
      trim: true,
    },

    duration: {
      type: Number, // Number of days
      required: true,
      min: [1, 'Duration must be at least 1 day'],
    },

    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'],
        message: 'Status must be pending, approved, or rejected',
      },
      default: 'pending',
      index: true, // Frequently filtered by status
    },

    rejectionComment: {
      type: String,
      default: null,
      maxlength: [300, 'Rejection comment cannot exceed 300 characters'],
      trim: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ─── Pre-Validate Hook: Date Validation ──────────────────────────────────────
// Ensures endDate is not before startDate before the document is validated.
leaveSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    return next(new Error('End date cannot be before start date'));
  }
  next();
});

// ─── Virtual Field: Student Name ──────────────────────────────────────────────
// Demonstrates a computed field; not stored in DB but populated when .populate() is used.
// Uncomment if you need this in responses:
// leaveSchema.virtual('studentName', {
//   ref: 'User',
//   localField: 'studentId',
//   foreignField: '_id',
//   justOne: true,
// });

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Compound index for common queries: filter by studentId and status
leaveSchema.index({ studentId: 1, status: 1 });
// Index for admin queries: pending leaves sorted by createdAt
leaveSchema.index({ status: 1, createdAt: -1 });

const Leave = mongoose.model('Leave', leaveSchema);

module.exports = Leave;
