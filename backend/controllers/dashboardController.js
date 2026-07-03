const Leave = require('../models/Leave');
const User = require('../models/User');

/**
 * @desc    Get dashboard metrics for logged-in user
 * @route   GET /api/dashboard/metrics
 * @access  Private (both student and admin)
 *
 * Student Metrics:
 * - leaveBalance (remaining days per type)
 * - pending requests count
 * - approved leaves count
 * - rejected leaves count
 *
 * Admin Metrics:
 * - total students count
 * - pending requests count
 * - approved leaves count (all students)
 * - rejected leaves count (all students)
 */
const getMetrics = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role === 'student') {
      // ─── Student Metrics ────────────────────────────────────────────────────
      const [pending, approved, rejected] = await Promise.all([
        Leave.countDocuments({ studentId: user._id, status: 'pending' }),
        Leave.countDocuments({ studentId: user._id, status: 'approved' }),
        Leave.countDocuments({ studentId: user._id, status: 'rejected' }),
      ]);

      return res.status(200).json({
        success: true,
        metrics: {
          leaveBalance: user.leaveBalance,
          pending,
          approved,
          rejected,
        },
      });
    }

    if (user.role === 'admin') {
      // ─── Admin Metrics ──────────────────────────────────────────────────────
      const [totalStudents, pending, approved, rejected] = await Promise.all([
        User.countDocuments({ role: 'student' }),
        Leave.countDocuments({ status: 'pending' }),
        Leave.countDocuments({ status: 'approved' }),
        Leave.countDocuments({ status: 'rejected' }),
      ]);

      return res.status(200).json({
        success: true,
        metrics: {
          totalStudents,
          pending,
          approved,
          rejected,
        },
      });
    }

    // Fallback (should never reach here if role enum is enforced)
    res.status(400).json({
      success: false,
      message: 'Invalid user role',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get chart data for dashboard visualizations
 * @route   GET /api/dashboard/chart
 * @access  Private (both student and admin)
 *
 * Returns:
 * - Leave type distribution (casual, medical, emergency counts)
 * - Monthly leave trends (last 6 months)
 * - Approval ratio (approved vs rejected)
 */
const getChartData = async (req, res, next) => {
  try {
    const user = req.user;

    // Base filter: student sees their own, admin sees all
    const baseFilter =
      user.role === 'student' ? { studentId: user._id } : {};

    // ─── Leave Type Distribution ────────────────────────────────────────────
    const leaveTypeDistribution = await Leave.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: '$leaveType',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          type: '$_id',
          count: 1,
        },
      },
    ]);

    // ─── Monthly Leave Trends (Last 6 Months) ───────────────────────────────
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await Leave.aggregate([
      {
        $match: {
          ...baseFilter,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' },
                ],
              },
            ],
          },
          count: 1,
        },
      },
    ]);

    // ─── Approval Ratio ─────────────────────────────────────────────────────
    const approvalStats = await Leave.aggregate([
      {
        $match: {
          ...baseFilter,
          status: { $in: ['approved', 'rejected'] }, // Exclude pending
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const approvedCount = approvalStats.find((s) => s._id === 'approved')?.count || 0;
    const rejectedCount = approvalStats.find((s) => s._id === 'rejected')?.count || 0;
    const total = approvedCount + rejectedCount;

    const approvalRatio = {
      approved: approvedCount,
      rejected: rejectedCount,
      approvalRate: total > 0 ? ((approvedCount / total) * 100).toFixed(1) : 0,
    };

    res.status(200).json({
      success: true,
      chartData: {
        leaveTypeDistribution,
        monthlyTrends,
        approvalRatio,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get recent activities (optional — for advanced dashboard)
 * @route   GET /api/dashboard/activities
 * @access  Private (both student and admin)
 *
 * Returns last 10 leave actions with timestamps.
 */
const getRecentActivities = async (req, res, next) => {
  try {
    const user = req.user;

    const filter =
      user.role === 'student'
        ? { studentId: user._id }
        : {}; // Admin sees all

    const activities = await Leave.find(filter)
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('studentId', 'name email studentId')
      .populate('reviewedBy', 'name email')
      .select('leaveType startDate endDate status reviewedAt createdAt');

    res.status(200).json({
      success: true,
      activities,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMetrics,
  getChartData,
  getRecentActivities,
};
