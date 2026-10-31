/**
 * emailNotifier.js
 * Client-side email notification service powered by Web3Forms.
 * Directly sends alerts to rathinamsiddharth1@gmail.com for every leave request event.
 */

const ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || 'e61916a2-3296-4431-85ee-429792c57eb2';

export const sendLeaveSubmissionMail = async (data) => {
  try {
    const {
      studentName,
      studentId,
      department,
      leaveType,
      duration,
      startDate,
      endDate,
      reason,
      approveUrl,
      rejectUrl,
    } = data;

    await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        access_key: ACCESS_KEY,
        subject: `📋 NEW LEAVE REQUEST: ${studentName} - ${(department || '').toUpperCase()} Dept`,
        from_name: 'Student Leave Portal',
        Action: 'New Leave Request Submitted',
        Student_Name: studentName,
        Student_ID: studentId || 'N/A',
        Department: department ? department.toUpperCase() : 'N/A',
        Leave_Type: leaveType ? leaveType.toUpperCase() : 'N/A',
        Duration: `${duration} Day(s)`,
        Dates: `${startDate} to ${endDate}`,
        Reason: reason,
        Status: '⏳ Pending Review',
        Approve_Request_Link: approveUrl || 'N/A',
        Reject_Request_Link: rejectUrl || 'N/A',
        message: `Student ${studentName} (${studentId || 'N/A'}) has submitted a leave request for ${duration} day(s).

────────────────────────────────────────────
DIRECT 1-CLICK MANAGER ACTIONS:
────────────────────────────────────────────
✓ APPROVE REQUEST:
${approveUrl || 'N/A'}

✕ REJECT REQUEST:
${rejectUrl || 'N/A'}
────────────────────────────────────────────`,
      }),
    });
  } catch (err) {
    console.warn('Web3Forms submission alert notice:', err.message);
  }
};

export const sendLeaveReviewMail = async (data) => {
  try {
    const { studentName, studentId, department, leaveType, duration, startDate, endDate, status, reviewerName, comment } = data;
    const isApproved = status?.toLowerCase() === 'approved';
    await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        access_key: ACCESS_KEY,
        subject: `${isApproved ? '✅' : '❌'} LEAVE ${status?.toUpperCase()}: ${studentName} (${studentId || 'N/A'})`,
        from_name: 'Student Leave Portal',
        Action: `Leave Request ${status}`,
        Student_Name: studentName,
        Student_ID: studentId || 'N/A',
        Department: department ? department.toUpperCase() : 'N/A',
        Leave_Type: leaveType ? leaveType.toUpperCase() : 'N/A',
        Duration: `${duration} Day(s)`,
        Dates: `${startDate} to ${endDate}`,
        Status: isApproved ? '✅ Approved' : '❌ Rejected',
        Reviewed_By: reviewerName || 'Administrator',
        Review_Comment: comment || (isApproved ? 'Approved by faculty' : 'No comment provided'),
        message: `Leave request for ${studentName} has been ${status?.toLowerCase()} by ${reviewerName || 'Administrator'}.`,
      }),
    });
  } catch (err) {
    console.warn('Web3Forms review alert notice:', err.message);
  }
};
