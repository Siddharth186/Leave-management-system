const Leave = require('../models/Leave');
const User = require('../models/User');
const Notification = require('../models/Notification');
const {
  calculateLeaveDays,
  hasEnoughBalance,
  deductLeaveBalance,
  formatDateRange,
} = require('../utils/calculateLeaveDays');

/**
 * @desc    Apply for leave (student only)
 * @route   POST /api/leaves/apply
 * @access  Private (student)
 */
const applyLeave = async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    const student = req.user;

    // Calculate number of days
    const duration = calculateLeaveDays(startDate, endDate);

    // Check if student has sufficient leave balance
    const { sufficient, available } = hasEnoughBalance(
      student.leaveBalance,
      leaveType,
      duration
    );

    if (!sufficient) {
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance. You have ${available} ${leaveType} day(s) remaining but requested ${duration} day(s).`,
      });
    }

    // Check for overlapping leave requests
    const overlapping = await Leave.findOne({
      studentId: student._id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } },
      ],
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: 'You already have a leave request that overlaps with these dates',
      });
    }

    // Create leave request
    const leave = await Leave.create({
      studentId: student._id,
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      duration,
      status: 'pending',
    });

    // Notify the student that request was submitted
    await Notification.createNotification(
      student._id,
      'Leave Request Submitted',
      `Your ${leaveType} leave request for ${formatDateRange(startDate, endDate)} (${duration} day(s)) has been submitted and is pending review.`,
      'leave_submitted',
      leave._id
    );

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      leave,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get leave history for the logged-in student
 * @route   GET /api/leaves/history
 * @access  Private (student)
 * @query   status, leaveType, startDate, endDate, page, limit
 */
const getLeaveHistory = async (req, res, next) => {
  try {
    const { status, leaveType, startDate, endDate, page = 1, limit = 10 } = req.query;

    // Build filter object
    const filter = { studentId: req.user._id };

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    if (leaveType && ['casual', 'medical', 'emergency'].includes(leaveType)) {
      filter.leaveType = leaveType;
    }

    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Cap at 50 per page
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const [leaves, total] = await Promise.all([
      Leave.find(filter)
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(limitNum)
        .populate('reviewedBy', 'name email'), // Populate admin who reviewed
      Leave.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: leaves.length,
      total,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        limit: limitNum,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
      },
      leaves,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all pending leave requests (admin only)
 * @route   GET /api/leaves/pending
 * @access  Private (admin)
 * @query   department, page, limit
 */
const getPendingLeaves = async (req, res, next) => {
  try {
    const { department, page = 1, limit = 10 } = req.query;

    const filter = { status: 'pending' };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // If filtering by department, need to join through User
    let query = Leave.find(filter)
      .populate({
        path: 'studentId',
        select: 'name email studentId department year',
        ...(department && { match: { department } }),
      })
      .sort({ createdAt: 1 }) // Oldest first so urgent requests are reviewed first
      .skip(skip)
      .limit(limitNum);

    const [leaves, total] = await Promise.all([
      query,
      Leave.countDocuments(filter),
    ]);

    // If department filter applied, remove null populated entries
    const filteredLeaves = department
      ? leaves.filter((l) => l.studentId !== null)
      : leaves;

    res.status(200).json({
      success: true,
      count: filteredLeaves.length,
      total,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
      leaves: filteredLeaves,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a leave request (admin only)
 * @route   PUT /api/leaves/approve/:id
 * @access  Private (admin)
 */
const approveLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Leave request is already ${leave.status}`,
      });
    }

    // Update leave status
    leave.status = 'approved';
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    await leave.save();

    // Deduct leave balance from student
    const student = await User.findById(leave.studentId);

    if (student) {
      student.leaveBalance = deductLeaveBalance(
        student.leaveBalance.toObject
          ? student.leaveBalance.toObject()
          : student.leaveBalance,
        leave.leaveType,
        leave.duration
      );
      await student.save();

      // Notify student of approval
      await Notification.createNotification(
        student._id,
        'Leave Request Approved ✅',
        `Your ${leave.leaveType} leave request for ${formatDateRange(leave.startDate, leave.endDate)} (${leave.duration} day(s)) has been approved.`,
        'leave_approved',
        leave._id
      );
    }

    // Populate student info for response
    await leave.populate('studentId', 'name email studentId department');
    await leave.populate('reviewedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Leave request approved successfully',
      leave,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject a leave request (admin only)
 * @route   PUT /api/leaves/reject/:id
 * @access  Private (admin)
 * @body    { rejectionComment }
 */
const rejectLeave = async (req, res, next) => {
  try {
    const { rejectionComment } = req.body;
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Leave request is already ${leave.status}`,
      });
    }

    // Update leave status
    leave.status = 'rejected';
    leave.rejectionComment = rejectionComment;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    await leave.save();

    // Notify student of rejection with admin comment
    await Notification.createNotification(
      leave.studentId,
      'Leave Request Rejected ❌',
      `Your ${leave.leaveType} leave request for ${formatDateRange(leave.startDate, leave.endDate)} was rejected. Reason: ${rejectionComment}`,
      'leave_rejected',
      leave._id
    );

    await leave.populate('studentId', 'name email studentId department');
    await leave.populate('reviewedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Leave request rejected',
      leave,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single leave request by ID
 * @route   GET /api/leaves/:id
 * @access  Private (student can view own, admin can view any)
 */
const getLeaveById = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('studentId', 'name email studentId department year')
      .populate('reviewedBy', 'name email');

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      });
    }

    // Students can only view their own leaves
    if (
      req.user.role === 'student' &&
      leave.studentId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own leave requests.',
      });
    }

    res.status(200).json({
      success: true,
      leave,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyLeave,
  getLeaveHistory,
  getPendingLeaves,
  approveLeave,
  rejectLeave,
  getLeaveById,
};
