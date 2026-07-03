/**
 * calculateLeaveDays
 * Calculates the number of calendar days between two dates (inclusive).
 *
 * Why inclusive? A leave from Monday to Monday = 1 day, not 0.
 * Formula: Math.floor((end - start) / ms_per_day) + 1
 *
 * Edge cases handled:
 * - Same-day leave (startDate === endDate) returns 1
 * - Accepts Date objects or ISO strings (both cast to Date)
 * - Returns 0 for invalid/reversed dates (controller validates separately)
 *
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @returns {number} - Number of leave days (inclusive)
 */
const calculateLeaveDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Strip time component — compare dates only (avoid DST edge cases)
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = end - start;

  if (diffMs < 0) return 0; // endDate before startDate — invalid

  return Math.floor(diffMs / msPerDay) + 1; // +1 for inclusive count
};

/**
 * hasEnoughBalance
 * Checks if the student has sufficient leave balance for the requested type.
 *
 * Called before creating a leave request to give an early rejection
 * with a clear message rather than silently failing later.
 *
 * @param {object} leaveBalance - User's leaveBalance object { casual, medical, emergency }
 * @param {string} leaveType    - "casual" | "medical" | "emergency"
 * @param {number} days         - Number of days requested
 * @returns {{ sufficient: boolean, available: number }}
 */
const hasEnoughBalance = (leaveBalance, leaveType, days) => {
  const available = leaveBalance[leaveType] ?? 0;
  return {
    sufficient: available >= days,
    available,
  };
};

/**
 * deductLeaveBalance
 * Returns an updated leaveBalance object after deducting the approved days.
 * Does NOT mutate the original object — returns a new copy (immutable update).
 *
 * Called in leaveController when admin approves a leave request.
 *
 * @param {object} leaveBalance - Current leaveBalance { casual, medical, emergency }
 * @param {string} leaveType    - Leave type to deduct from
 * @param {number} days         - Days to deduct
 * @returns {object}            - New leaveBalance object
 */
const deductLeaveBalance = (leaveBalance, leaveType, days) => {
  return {
    ...leaveBalance,
    [leaveType]: Math.max(0, (leaveBalance[leaveType] ?? 0) - days),
  };
};

/**
 * formatDateRange
 * Returns a human-readable date range string for use in notifications.
 * Example: "10 Jul 2025 – 14 Jul 2025"
 *
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @returns {string}
 */
const formatDateRange = (startDate, endDate) => {
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  const start = new Date(startDate).toLocaleDateString('en-GB', opts);
  const end = new Date(endDate).toLocaleDateString('en-GB', opts);
  return `${start} – ${end}`;
};

module.exports = {
  calculateLeaveDays,
  hasEnoughBalance,
  deductLeaveBalance,
  formatDateRange,
};
