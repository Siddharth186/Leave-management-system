const jwt          = require('jsonwebtoken');
const Leave        = require('../models/Leave');
const User         = require('../models/User');
const Notification = require('../models/Notification');
const {
  sendLeaveSubmissionAlert,
  sendLeaveApprovalAlert,
  sendLeaveRejectionAlert,
  sendStudentDecisionAlert,
} = require('../utils/mailer');
const {
  calculateLeaveDays,
  hasEnoughBalance,
  deductLeaveBalance,
  formatDateRange,
} = require('../utils/calculateLeaveDays');

// ─── Shared helper ─────────────────────────────────────────────────────────────
/**
 * assertDepartmentAccess
 * Checks department access for faculty/admin.
 * If the admin is the Master Admin (rathinamsiddharth1@gmail.com), access is granted across all departments.
 */
const assertDepartmentAccess = (adminDept, studentDept, adminEmail) => {
  if (adminEmail && adminEmail.toLowerCase() === 'rathinamsiddharth1@gmail.com') {
    return true;
  }
  if (!adminDept) return false;
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

    // ── Generate 1-Click Action Tokens for Email ───────────────────────────
    const approveToken = jwt.sign(
      { leaveId: leave._id, action: 'approve' },
      process.env.JWT_SECRET,
      { expiresIn: '14d' }
    );

    const rejectToken = jwt.sign(
      { leaveId: leave._id, action: 'reject' },
      process.env.JWT_SECRET,
      { expiresIn: '14d' }
    );

    const backendUrl = process.env.BACKEND_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT || 5001}`);
    const approveUrl = `${backendUrl}/api/leaves/email-action?token=${approveToken}`;
    const rejectUrl  = `${backendUrl}/api/leaves/email-action?token=${rejectToken}`;

    // ── Email Alert with Actionable Buttons to Manager ─────────────────────
    await Promise.allSettled([
      sendLeaveSubmissionAlert(student, leave, { approveUrl, rejectUrl })
    ]);

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      leave,
      approveUrl,
      rejectUrl,
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
// ADMIN CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all pending leave requests for admin
 * @route   GET /api/leaves/pending
 * @access  Private (admin)
 * @query   page, limit
 */
const getPendingLeaves = async (req, res, next) => {
  try {
    const adminDept = req.user.department;
    const isMasterAdmin = req.user.email?.toLowerCase() === 'rathinamsiddharth1@gmail.com';

    if (!adminDept && !isMasterAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Your account has no department assigned. Contact a system administrator.',
      });
    }

    const { page = 1, limit = 10 } = req.query;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const matchFilter = isMasterAdmin || !adminDept
      ? {}
      : { match: { department: adminDept.toLowerCase() } };

    const leaves = await Leave.find({ status: 'pending' })
      .populate({
        path:   'studentId',
        select: 'name email studentId department year',
        ...matchFilter,
      })
      .sort({ createdAt: 1 }) // Oldest pending first
      .skip(skip)
      .limit(limitNum);

    const deptLeaves = leaves.filter((l) => l.studentId !== null);

    let total;
    if (isMasterAdmin || !adminDept) {
      total = await Leave.countDocuments({ status: 'pending' });
    } else {
      const allDeptStudents = await User.find(
        { role: 'student', department: adminDept.toLowerCase() },
        '_id'
      );
      const studentIds = allDeptStudents.map((s) => s._id);
      total = await Leave.countDocuments({
        status:    'pending',
        studentId: { $in: studentIds },
      });
    }

    res.status(200).json({
      success: true,
      count: deptLeaves.length,
      total,
      department: adminDept || 'All Departments',
      pagination: {
        currentPage: pageNum,
        totalPages:  Math.ceil(total / limitNum) || 1,
        limit:       limitNum,
      },
      leaves: deptLeaves,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a leave request (admin dashboard)
 * @route   PUT /api/leaves/approve/:id
 * @access  Private (admin)
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

    if (!assertDepartmentAccess(req.user.department, student.department, req.user.email)) {
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

    // ── Email Alerts ───────────────────────────────────────────────────────
    await Promise.allSettled([
      sendLeaveApprovalAlert(student, leave, req.user),
      sendStudentDecisionAlert(student, leave, 'approved', req.user?.name || 'Administrator')
    ]);

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
 * @desc    Reject a leave request (admin dashboard)
 * @route   PUT /api/leaves/reject/:id
 * @access  Private (admin)
 * @body    { rejectionComment }
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

    if (!assertDepartmentAccess(req.user.department, student.department, req.user.email)) {
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

    // ── Email Alerts ───────────────────────────────────────────────────────
    await Promise.allSettled([
      sendLeaveRejectionAlert(student, leave, req.user, rejectionComment),
      sendStudentDecisionAlert(student, leave, 'rejected', req.user?.name || 'Administrator', rejectionComment)
    ]);

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
 * @access  Private (student: own only | admin: same-department or master admin)
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
      if (leave.studentId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own leave requests.',
        });
      }
    } else {
      if (!assertDepartmentAccess(req.user.department, leave.studentId?.department, req.user.email)) {
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

// ═══════════════════════════════════════════════════════════════════════════════
// 1-CLICK EMAIL ACTION HANDLER (DIRECT FROM EMAIL)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Handle 1-click Approve (✓) or Reject (✕) from manager email
 * @route   GET /api/leaves/email-action?token=...
 * @access  Public (protected via signed JWT token)
 */
const handleEmailAction = async (req, res) => {
  const { token, comment } = req.query;

  // Render helper function for consistent modern dark-mode HTML responses
  const renderResponsePage = ({ isSuccess, icon, title, subtitle, details = [], message, isWarning = false }) => {
    const accentColor = isWarning ? '#f59e0b' : (isSuccess ? '#16a34a' : '#dc2626');
    const accentBg    = isWarning ? 'rgba(245, 158, 11, 0.15)' : (isSuccess ? 'rgba(22, 163, 74, 0.15)' : 'rgba(220, 38, 38, 0.15)');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Student Leave Portal</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0b1120;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid #1e293b;
      backdrop-filter: blur(12px);
      border-radius: 16px;
      padding: 36px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .badge {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: ${accentBg};
      color: ${accentColor};
      border: 2px solid ${accentColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin: 0 auto 20px;
      font-weight: bold;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
    }
    p.subtitle {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .table-box {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 24px;
      text-align: left;
    }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid #1e293b;
      font-size: 13px;
    }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 600; }
    .value { color: #e2e8f0; font-weight: 500; text-align: right; }
    .message-box {
      background: rgba(30, 41, 59, 0.5);
      border-left: 3px solid ${accentColor};
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 13px;
      color: #cbd5e1;
      text-align: left;
      margin-bottom: 24px;
      line-height: 1.4;
    }
    .btn {
      display: inline-block;
      background: #0284c7;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn:hover { background: #0369a1; }
    .footer {
      color: #64748b;
      font-size: 12px;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${icon}</div>
    <h1>${title}</h1>
    <p class="subtitle">${subtitle}</p>

    ${details.length > 0 ? `
    <div class="table-box">
      ${details.map(d => `
        <div class="row">
          <span class="label">${d.label}</span>
          <span class="value">${d.value}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${message ? `<div class="message-box">${message}</div>` : ''}

    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" class="btn">Open Student Portal</a>

    <p class="footer">Student Leave Management Portal • Secure 1-Click Action</p>
  </div>
</body>
</html>
    `;
  };

  if (!token) {
    return res.status(400).send(renderResponsePage({
      isSuccess: false,
      icon: '✕',
      title: 'Missing Action Token',
      subtitle: 'No action token was provided. Please use the direct button inside your email.',
      message: 'The link you clicked appears to be incomplete or broken.'
    }));
  }

  try {
    // ── 1. Verify token signature ──────────────────────────────────────────
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { leaveId, action } = decoded;

    if (!leaveId || !['approve', 'reject'].includes(action)) {
      return res.status(400).send(renderResponsePage({
        isSuccess: false,
        icon: '✕',
        title: 'Invalid Action Token',
        subtitle: 'The action specified in this link is not recognized.',
      }));
    }

    // ── 2. Load Leave and Student ──────────────────────────────────────────
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return res.status(404).send(renderResponsePage({
        isSuccess: false,
        icon: '✕',
        title: 'Leave Request Not Found',
        subtitle: 'This leave request may have been deleted or removed from the system.',
      }));
    }

    const student = await User.findById(leave.studentId);
    if (!student) {
      return res.status(404).send(renderResponsePage({
        isSuccess: false,
        icon: '✕',
        title: 'Student Not Found',
        subtitle: 'The student associated with this leave request no longer exists.',
      }));
    }

    // Load admin user for audit trail
    const admin = await User.findOne({ email: 'rathinamsiddharth1@gmail.com' });
    const reviewerId = admin?._id || student._id;
    const reviewerName = admin?.name || 'Manager (via 1-Click Email)';

    // ── 3. Check if already processed ─────────────────────────────────────
    if (leave.status !== 'pending') {
      const isAlreadyApproved = leave.status === 'approved';
      return res.status(200).send(renderResponsePage({
        isSuccess: isAlreadyApproved,
        isWarning: true,
        icon: isAlreadyApproved ? '✓' : '✕',
        title: `Leave Already ${leave.status.toUpperCase()}`,
        subtitle: `This request was already processed on ${new Date(leave.reviewedAt || leave.updatedAt).toLocaleString('en-IN')}.`,
        details: [
          { label: 'Student Name', value: student.name },
          { label: 'Student ID',   value: student.studentId || 'N/A' },
          { label: 'Leave Type',   value: leave.leaveType.toUpperCase() },
          { label: 'Duration',     value: `${leave.duration} Day(s)` },
          { label: 'Current Status', value: isAlreadyApproved ? 'Approved ✅' : 'Rejected ❌' },
        ],
        message: 'No further action was taken because this leave decision has already been finalized.'
      }));
    }

    // ── 4. Execute Action ──────────────────────────────────────────────────
    if (action === 'approve') {
      leave.status     = 'approved';
      leave.reviewedBy = reviewerId;
      leave.reviewedAt = new Date();
      await leave.save();

      // Deduct leave balance
      student.leaveBalance = deductLeaveBalance(
        student.leaveBalance.toObject ? student.leaveBalance.toObject() : student.leaveBalance,
        leave.leaveType,
        leave.duration
      );
      await student.save();

      // In-App notification
      await Notification.createNotification(
        student._id,
        'Leave Request Approved ✅',
        `Your ${leave.leaveType} leave request for ${formatDateRange(leave.startDate, leave.endDate)} (${leave.duration} day(s)) has been approved.`,
        'leave_approved',
        leave._id
      );

      // Email alerts
      await Promise.allSettled([
        sendStudentDecisionAlert(student, leave, 'approved', reviewerName),
        sendLeaveApprovalAlert(student, leave, admin || { name: reviewerName })
      ]);

      return res.status(200).send(renderResponsePage({
        isSuccess: true,
        icon: '✓',
        title: 'Leave Request Approved!',
        subtitle: `You have successfully approved the leave request for ${student.name}.`,
        details: [
          { label: 'Student Name', value: student.name },
          { label: 'Student ID',   value: student.studentId || 'N/A' },
          { label: 'Leave Type',   value: leave.leaveType.toUpperCase() },
          { label: 'Duration',     value: `${leave.duration} Day(s)` },
          { label: 'Decision',     value: 'Approved ✅' },
          { label: 'Processed On', value: new Date().toLocaleString('en-IN') },
        ],
        message: `Database updated immediately. The student's leave balance has been deducted, and a confirmation email has been dispatched to <strong>${student.email}</strong>.`
      }));
    } else {
      // Reject action
      const rejectionComment = comment || 'Rejected via Manager 1-Click Email Decision';
      leave.status           = 'rejected';
      leave.rejectionComment = rejectionComment;
      leave.reviewedBy       = reviewerId;
      leave.reviewedAt       = new Date();
      await leave.save();

      // In-App notification
      await Notification.createNotification(
        student._id,
        'Leave Request Rejected ❌',
        `Your ${leave.leaveType} leave request for ${formatDateRange(leave.startDate, leave.endDate)} was rejected. Reason: ${rejectionComment}`,
        'leave_rejected',
        leave._id
      );

      // Email alerts
      await Promise.allSettled([
        sendStudentDecisionAlert(student, leave, 'rejected', reviewerName, rejectionComment),
        sendLeaveRejectionAlert(student, leave, admin || { name: reviewerName }, rejectionComment)
      ]);

      return res.status(200).send(renderResponsePage({
        isSuccess: false,
        icon: '✕',
        title: 'Leave Request Rejected',
        subtitle: `You have rejected the leave request for ${student.name}.`,
        details: [
          { label: 'Student Name', value: student.name },
          { label: 'Student ID',   value: student.studentId || 'N/A' },
          { label: 'Leave Type',   value: leave.leaveType.toUpperCase() },
          { label: 'Duration',     value: `${leave.duration} Day(s)` },
          { label: 'Decision',     value: 'Rejected ❌' },
          { label: 'Processed On', value: new Date().toLocaleString('en-IN') },
        ],
        message: `Database updated immediately. The status is marked as Rejected, and a notification email has been dispatched to <strong>${student.email}</strong>.`
      }));
    }
  } catch (err) {
    console.error('❌ Email action verification error:', err.message);
    return res.status(400).send(renderResponsePage({
      isSuccess: false,
      icon: '✕',
      title: 'Action Link Expired or Invalid',
      subtitle: 'This action link has either expired or the security token is invalid.',
      message: 'Please log in to the dashboard to review this request, or ask the student to submit a fresh request.'
    }));
  }
};

module.exports = {
  applyLeave,
  getLeaveHistory,
  getPendingLeaves,
  approveLeave,
  rejectLeave,
  getLeaveById,
  handleEmailAction,
};
