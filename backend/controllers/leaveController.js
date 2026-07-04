const Leave        = require('../models/Leave');
const User         = require('../models/User');
const Notification = require('../models/Notification');
const { sendLeaveApprovalAlert } = require('../utils/mailer');
const {
  calculateLeaveDays,
  hasEnoughBalance,
  deductLeaveBalance,
  formatDateRange,
} = require('../utils/calculateLeaveDays');

// ─── Shared helper ─────────────────────────────────────────────────────────────
/**
 * assertDepartmentAccess
 * Ensures an admin can only act on leaves that belong to students
 * in their own department.
 *
 * Why: department-based isolation means a CSE faculty member should never
 * be able to approve/reject a MECH student's leave — even by crafting a
 * direct API request with the correct leave ID.
 *
 * Returns true if access is allowed, false if it should be denied.
 * Passing `adminDept = null` (unassigned admin) blocks ALL actions as a
 * safe default — force the admin to have a department set.
 */
const assertDepartmentAccess = (adminDept, studentDept) => {
  if (!adminDept) return false;                        // Admin has no department assigned
  return adminDept.toLowerCase() === studentDept?.toLowerCase();
};

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Apply for leave (student only)
 * @route   POST /api/leaves/apply
 * @access  Private (student)
 */
const applyLeave = async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    const student = req.user;

    // Calculate inclusive day count
    const duration = calculateLeaveDays(startDate, endDate);

    // Check sufficient leave balance
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

    // Check for overlapping pending/approved requests
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
        message: 'You already have a leave request that overlaps with these dates.',
      });
    }

    // Persist leave request
    const leave = await Leave.create({
      studentId: student._id,
      leaveType,
      startDate:  new Date(startDate),
      endDate:    new Date(endDate),
      reason,
      duration,
      status: 'pending',
    });

    // In-app notification to student
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
 * @desc    Get leave history for logged-in student
 * @route   GET /api/leaves/history
 * @access  Private (student)
 * @query   status, leaveType, startDate, endDate, page, limit
 */
const getLeaveHistory = async (req, res, next) => {
  try {
    const { status, leaveType, startDate, endDate, page = 1, limit = 10 } = req.query;

    const filter = { studentId: req.user._id };

    if (status    && ['pending','approved','rejected'].includes(status))
      filter.status = status;

    if (leaveType && ['casual','medical','emergency'].includes(leaveType))
      filter.leaveType = leaveType;

    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate)   filter.startDate.$lte = new Date(endDate);
    }

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const [leaves, total] = await Promise.all([
      Leave.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('reviewedBy', 'name email'),
      Leave.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: leaves.length,
      total,
      pagination: {
        currentPage:  pageNum,
        totalPages:   Math.ceil(total / limitNum),
        limit:        limitNum,
        hasNextPage:  pageNum < Math.ceil(total / limitNum),
        hasPrevPage:  pageNum > 1,
      },
      leaves,
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN CONTROLLERS — all enforce department isolation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all pending leave requests for admin's department only
 * @route   GET /api/leaves/pending
 * @access  Private (admin)
 * @query   page, limit
 *
 * Department Isolation:
 *   We populate studentId and then match on student.department === admin.department.
 *   This is done via the Mongoose populate `match` option so only students from
 *   the same department are returned — leaves from other departments come back
 *   with studentId = null and are filtered out before the response.
 */
const getPendingLeaves = async (req, res, next) => {
  try {
    const adminDept = req.user.department;

    if (!adminDept) {
      return res.status(403).json({
        success: false,
        message: 'Your account has no department assigned. Contact a system administrator.',
      });
    }

    const { page = 1, limit = 10 } = req.query;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    // Fetch ALL pending leaves but use populate `match` to only fill
    // studentId for students whose department matches the admin's department.
    // Leaves from other departments will have studentId = null after populate.
    const leaves = await Leave.find({ status: 'pending' })
      .populate({
        path:   'studentId',
        select: 'name email studentId department year',
        match:  { department: adminDept.toLowerCase() },
      })
      .sort({ createdAt: 1 }) // Oldest pending first (most urgent)
      .skip(skip)
      .limit(limitNum);

    // Filter out leaves that belong to other departments (studentId = null)
    const deptLeaves = leaves.filter((l) => l.studentId !== null);

    // Get accurate total for this department
    // We need to count via aggregation since a plain countDocuments doesn't
    // know about the populate-level department filter.
    const allDeptStudents = await User.find(
      { role: 'student', department: adminDept.toLowerCase() },
      '_id'
    );
    const studentIds = allDeptStudents.map((s) => s._id);
    const total = await Leave.countDocuments({
      status:    'pending',
      studentId: { $in: studentIds },
    });

    res.status(200).json({
      success: true,
      count: deptLeaves.length,
      total,
      department: adminDept,
      pagination: {
        currentPage: pageNum,
        totalPages:  Math.ceil(total / limitNum),
        limit:       limitNum,
      },
      leaves: deptLeaves,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a leave request (admin, same department only)
 * @route   PUT /api/leaves/approve/:id
 * @access  Private (admin)
 *
 * Department Isolation:
 *   After loading the leave we also load the student and compare
 *   student.department with req.user.department. Mismatches get a 403.
 *
 * Email Alert:
 *   On successful approval, sendLeaveApprovalAlert() fires an HTML email
 *   to ALERT_EMAIL (bonkai3876@gmail.com). The function is fire-and-catch —
 *   an email failure NEVER rolls back or blocks the approval.
 */
const approveLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Leave request is already ${leave.status}`,
      });
    }

    // ── Department Isolation Check ──────────────────────────────────────────
    const student = await User.findById(leave.studentId);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (!assertDepartmentAccess(req.user.department, student.department)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You can only approve leave requests for your own department (${req.user.department?.toUpperCase()}).`,
      });
    }

    // ── Update Leave Status ─────────────────────────────────────────────────
    leave.status     = 'approved';
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    await leave.save();

    // ── Deduct Leave Balance ────────────────────────────────────────────────
    student.leaveBalance = deductLeaveBalance(
      student.leaveBalance.toObject
        ? student.leaveBalance.toObject()
        : student.leaveBalance,
      leave.leaveType,
      leave.duration
    );
    await student.save();

    // ── In-App Notification ─────────────────────────────────────────────────
    await Notification.createNotification(
      student._id,
      'Leave Request Approved ✅',
      `Your ${leave.leaveType} leave request for ${formatDateRange(leave.startDate, leave.endDate)} (${leave.duration} day(s)) has been approved.`,
      'leave_approved',
      leave._id
    );

    // ── Email Alert (fire-and-forget — never blocks the response) ───────────
    sendLeaveApprovalAlert(student, leave, req.user)
      .catch((err) =>
        console.error(`⚠️  Background email error: ${err.message}`)
      );

    // ── Populate & Respond ──────────────────────────────────────────────────
    await leave.populate('studentId',  'name email studentId department year');
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
 * @desc    Reject a leave request (admin, same department only)
 * @route   PUT /api/leaves/reject/:id
 * @access  Private (admin)
 * @body    { rejectionComment }
 *
 * Department Isolation: same assertDepartmentAccess guard as approveLeave.
 */
const rejectLeave = async (req, res, next) => {
  try {
    const { rejectionComment } = req.body;
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Leave request is already ${leave.status}`,
      });
    }

    // ── Department Isolation Check ──────────────────────────────────────────
    const student = await User.findById(leave.studentId);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (!assertDepartmentAccess(req.user.department, student.department)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You can only reject leave requests for your own department (${req.user.department?.toUpperCase()}).`,
      });
    }

    // ── Update Leave Status ─────────────────────────────────────────────────
    leave.status           = 'rejected';
    leave.rejectionComment = rejectionComment;
    leave.reviewedBy       = req.user._id;
    leave.reviewedAt       = new Date();
    await leave.save();

    // ── In-App Notification ─────────────────────────────────────────────────
    await Notification.createNotification(
      student._id,
      'Leave Request Rejected ❌',
      `Your ${leave.leaveType} leave request for ${formatDateRange(leave.startDate, leave.endDate)} was rejected. Reason: ${rejectionComment}`,
      'leave_rejected',
      leave._id
    );

    await leave.populate('studentId',  'name email studentId department year');
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
 * @access  Private (student: own only | admin: same-department only)
 */
const getLeaveById = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('studentId',  'name email studentId department year')
      .populate('reviewedBy', 'name email');

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    const isStudent = req.user.role === 'student';

    if (isStudent) {
      // Students can only see their own leaves
      if (leave.studentId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own leave requests.',
        });
      }
    } else {
      // Admins can only see leaves in their department
      if (!assertDepartmentAccess(req.user.department, leave.studentId?.department)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This leave belongs to a different department.',
        });
      }
    }

    res.status(200).json({ success: true, leave });
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
