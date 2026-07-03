const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Represents both Students and Admin/Faculty users.
 * Passwords are hashed via a pre-save hook — never stored as plain text.
 * leaveBalance tracks the remaining quota per leave type for students.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never returned in queries unless explicitly requested
    },

    studentId: {
      type: String,
      trim: true,
      default: null,
    },

    department: {
      type: String,
      trim: true,
      default: null,
    },

    year: {
      type: Number,
      min: [1, 'Year must be between 1 and 5'],
      max: [5, 'Year must be between 1 and 5'],
      default: null,
    },

    role: {
      type: String,
      enum: {
        values: ['student', 'admin'],
        message: 'Role must be either student or admin',
      },
      default: 'student',
    },

    avatar: {
      type: String,
      default: null,
    },

    // Separate leave quotas per type — only relevant for students.
    // Admins will have these set to 0.
    leaveBalance: {
      casual: {
        type: Number,
        default: 12,
        min: [0, 'Leave balance cannot be negative'],
      },
      medical: {
        type: Number,
        default: 6,
        min: [0, 'Leave balance cannot be negative'],
      },
      emergency: {
        type: Number,
        default: 3,
        min: [0, 'Leave balance cannot be negative'],
      },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// ─── Pre-Save Hook: Hash Password ────────────────────────────────────────────
// Runs BEFORE every .save(). Only re-hashes if the password field was modified,
// so updates to other fields (e.g., name) don't needlessly rehash.
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12); // Cost factor 12: secure and fast enough
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ─── Instance Method: Compare Passwords ──────────────────────────────────────
// Used in login flow: compares plain-text input against stored bcrypt hash.
// Defined on the schema so it's available on every User document instance.
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ─── Instance Method: Safe Profile Object ─────────────────────────────────────
// Returns a plain object without the password field — safe to send in responses.
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// ─── Index ────────────────────────────────────────────────────────────────────
// Email is already indexed via `unique: true`.
// Adding compound index on role + department for admin queries.
userSchema.index({ role: 1, department: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
