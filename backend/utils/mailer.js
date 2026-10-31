const nodemailer = require('nodemailer');
const https = require('https');

/**
 * mailer.js
 * Admin email notification & 1-click email action system for leave requests.
 */

const MASTER_EMAIL = process.env.ALERT_EMAIL || 'rathinamsiddharth1@gmail.com';
const WEB3FORMS_ACCESS_KEY = process.env.WEB3FORMS_ACCESS_KEY || 'e61916a2-3296-4431-85ee-429792c57eb2';

// ─── SMTP Transporter ─────────────────────────────────────────────────────────
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return _transporter;
};

// ─── Web3Forms Dispatcher ─────────────────────────────────────────────────────
const sendViaWeb3Forms = (payload, toEmail = MASTER_EMAIL) => {
  return new Promise((resolve) => {
    if (!WEB3FORMS_ACCESS_KEY) {
      return resolve();
    }

    const postData = JSON.stringify({
      access_key: WEB3FORMS_ACCESS_KEY,
      from_name: 'Student Leave Portal',
      to_email: toEmail,
      ...payload,
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const req = https.request('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': clientUrl,
        'Referer': `${clientUrl}/`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`📧 Web3Forms email notification dispatched successfully to ${toEmail}`);
        } else {
          console.log(`ℹ️  Web3Forms dispatch response: status ${res.statusCode}`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.warn(`⚠️  Web3Forms dispatch network error: ${err.message}`);
      resolve();
    });

    req.write(postData);
    req.end();
  });
};

// ─── Department display labels ─────────────────────────────────────────────────
const DEPT_LABELS = {
  cse:   'Computer Science & Engineering (CSE)',
  aids:  'AI & Data Science (AIDS)',
  cyber: 'Cyber Security (CYBER)',
  csbs:  'CS & Business Systems (CSBS)',
  ece:   'Electronics & Communication Engineering (ECE)',
  eee:   'Electrical & Electronics Engineering (EEE)',
  mech:  'Mechanical Engineering (MECH)',
};

// ─── Shared date formatter ─────────────────────────────────────────────────────
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCTION A — sendLeaveSubmissionAlert
// Triggered when a student submits a new leave request.
// Includes 1-Click Approve (✓) and Reject (✕) action buttons for the manager.
// ═══════════════════════════════════════════════════════════════════════════════
const sendLeaveSubmissionAlert = async (student, leave, actionUrls = {}) => {
  const deptLabel = DEPT_LABELS[student.department] || student.department?.toUpperCase() || 'N/A';
  const durationText = `${leave.duration} Day(s) (${fmtDate(leave.startDate)} – ${fmtDate(leave.endDate)})`;
  const { approveUrl, rejectUrl } = actionUrls;

  // 1. Dispatch via Web3Forms (includes actionable links in payload)
  await sendViaWeb3Forms({
    subject: `📋 NEW LEAVE REQUEST: ${student.name} — ${(student.department || 'N/A').toUpperCase()} Dept`,
    Student_Name: student.name,
    Student_ID: student.studentId || 'N/A',
    Student_Email: student.email || 'N/A',
    Department: deptLabel,
    Leave_Type: leave.leaveType ? leave.leaveType.toUpperCase() : 'N/A',
    Duration: durationText,
    Reason: leave.reason,
    Status: '⏳ Pending Review',
    Approve_Request_Link: approveUrl || 'N/A',
    Reject_Request_Link: rejectUrl || 'N/A',
    message: `A new leave request requires your decision.

Student: ${student.name} (${student.studentId || 'N/A'})
Duration: ${durationText}
Reason: "${leave.reason}"

────────────────────────────────────────────
DIRECT 1-CLICK MANAGER ACTIONS (NO LOGIN REQUIRED):
────────────────────────────────────────────
✓ APPROVE REQUEST:
${approveUrl || 'N/A'}

✕ REJECT REQUEST:
${rejectUrl || 'N/A'}
────────────────────────────────────────────`,
  });

  // 2. Dispatch via Nodemailer with styled HTML buttons (if SMTP is configured)
  const transporter = getTransporter();
  if (transporter) {
    const mailOptions = {
      from:    `"Student Portal Alerts" <${process.env.SMTP_USER}>`,
      to:      MASTER_EMAIL,
      subject: `📋 NEW LEAVE REQUEST: ${student.name} — ${(student.department || 'N/A').toUpperCase()} Dept`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #0284c7; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-top: 0; font-size: 20px;">
            📋 Leave Request Submitted — Action Required
          </h2>
          <p style="color: #475569; font-size: 14px; margin-bottom: 20px;">
            A student has submitted a new leave request. You can approve or reject this request directly using the buttons below without logging into the portal.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <tr style="background: #f8fafc;"><td style="padding: 10px; font-weight: 600; color: #64748b; width: 35%; border-bottom: 1px solid #e2e8f0;">Student Name</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${student.name}</td></tr>
            <tr><td style="padding: 10px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Student ID</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${student.studentId || 'N/A'}</td></tr>
            <tr style="background: #f8fafc;"><td style="padding: 10px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Department</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${deptLabel}</td></tr>
            <tr><td style="padding: 10px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Leave Type</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; text-transform: uppercase;">${leave.leaveType}</td></tr>
            <tr style="background: #f8fafc;"><td style="padding: 10px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Duration</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${durationText}</td></tr>
            <tr><td style="padding: 10px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Reason</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-style: italic;">"${leave.reason}"</td></tr>
            <tr style="background: #f8fafc;"><td style="padding: 10px; font-weight: 600; color: #64748b;">Status</td><td style="padding: 10px; color: #f59e0b; font-weight: 700;">⏳ Pending Review</td></tr>
          </table>

          <!-- ── Action Buttons ──────────────────────────────────────── -->
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; margin-top: 20px;">
            <p style="margin: 0 0 16px; font-size: 14px; font-weight: 700; color: #1e293b;">
              Direct Email Action (Click to Process Decision):
            </p>
            <div style="display: inline-block;">
              <a href="${approveUrl}" style="background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; margin-right: 12px; display: inline-block;">
                ✓ Approve Request
              </a>
              <a href="${rejectUrl}" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block;">
                ✕ Reject Request
              </a>
            </div>
            <p style="color: #64748b; font-size: 12px; margin: 16px 0 0;">
              Clicking either button immediately updates the leave status in the database and notifies the student. No login required.
            </p>
          </div>

          <p style="color: #94a3b8; font-size: 11px; margin-top: 24px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px;">
            Student Leave Management Portal • Automated System Notification
          </p>
        </div>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`📧 SMTP Submission alert sent → ${mailOptions.to} [msgId: ${info.messageId}]`);
    } catch (err) {
      console.error(`⚠️  SMTP Submission email error: ${err.message}`);
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCTION B — sendStudentDecisionAlert
// Sends confirmation email to the student when their leave is approved/rejected.
// ═══════════════════════════════════════════════════════════════════════════════
const sendStudentDecisionAlert = async (student, leave, decision, reviewerName = 'Management', comment = '') => {
  const isApproved = decision.toLowerCase() === 'approved';
  const durationText = `${leave.duration} Day(s) (${fmtDate(leave.startDate)} – ${fmtDate(leave.endDate)})`;
  const subject = `${isApproved ? '✅' : '❌'} Your Leave Request has been ${isApproved ? 'Approved' : 'Rejected'}`;

  // 1. Send via Web3Forms
  await sendViaWeb3Forms({
    subject,
    Student_Name: student.name,
    Student_Email: student.email,
    Decision: isApproved ? 'APPROVED' : 'REJECTED',
    Duration: durationText,
    Reviewed_By: reviewerName,
    Review_Comment: comment || (isApproved ? 'Leave approved by management.' : 'No comment provided.'),
    message: `Dear ${student.name},

Your leave request for ${durationText} has been ${isApproved ? 'APPROVED' : 'REJECTED'} by ${reviewerName}.
${!isApproved && comment ? `Reason for rejection: ${comment}` : ''}

You can view your updated balance and history in the Student Portal.`,
  }, student.email || MASTER_EMAIL);

  // 2. Send via Nodemailer directly to student's email (if SMTP configured)
  const transporter = getTransporter();
  if (transporter && student.email) {
    const mailOptions = {
      from:    `"Student Portal Alerts" <${process.env.SMTP_USER}>`,
      to:      student.email,
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: ${isApproved ? '#16a34a' : '#dc2626'}; border-bottom: 2px solid ${isApproved ? '#16a34a' : '#dc2626'}; padding-bottom: 10px; margin-top: 0; font-size: 20px;">
            ${isApproved ? '✅ Leave Request Approved' : '❌ Leave Request Rejected'}
          </h2>
          <p style="color: #475569; font-size: 14px; margin-bottom: 16px;">
            Dear <strong>${student.name}</strong>,
          </p>
          <p style="color: #475569; font-size: 14px; margin-bottom: 20px;">
            Your recent leave request has been reviewed. Here are the details of the decision:
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr style="background: #f8fafc;"><td style="padding: 10px; font-weight: 600; color: #64748b; width: 35%; border-bottom: 1px solid #e2e8f0;">Leave Type</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; text-transform: uppercase;">${leave.leaveType}</td></tr>
            <tr><td style="padding: 10px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Duration</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${durationText}</td></tr>
            <tr style="background: #f8fafc;"><td style="padding: 10px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Status</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: ${isApproved ? '#16a34a' : '#dc2626'};">${isApproved ? '✅ Approved' : '❌ Rejected'}</td></tr>
            <tr><td style="padding: 10px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Reviewed By</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${reviewerName}</td></tr>
            ${!isApproved && comment ? `
            <tr style="background: #fef2f2;"><td style="padding: 10px; font-weight: 600; color: #991b1b; border-bottom: 1px solid #e2e8f0;">Rejection Reason</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #991b1b;">${comment}</td></tr>
            ` : ''}
          </table>

          <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
            ${isApproved ? 'Your leave balance has been updated accordingly in the system.' : 'If you have questions regarding this decision, please contact your department administrator.'}
          </p>

          <p style="color: #94a3b8; font-size: 11px; margin-top: 24px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px;">
            Student Leave Management Portal • Automated System Notification
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`📧 Decision confirmation sent directly to student: ${student.email}`);
    } catch (err) {
      console.warn(`⚠️  Student email dispatch error: ${err.message}`);
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCTION C — sendLeaveApprovalAlert
// ═══════════════════════════════════════════════════════════════════════════════
const sendLeaveApprovalAlert = async (student, leave, reviewer) => {
  const deptLabel = DEPT_LABELS[student.department] || student.department?.toUpperCase() || 'N/A';
  const durationText = `${leave.duration} Day(s) (${fmtDate(leave.startDate)} – ${fmtDate(leave.endDate)})`;

  await sendViaWeb3Forms({
    subject: `✅ LEAVE APPROVED: ${student.name} (${student.studentId || 'N/A'})`,
    Student_Name: student.name,
    Student_ID: student.studentId || 'N/A',
    Department: deptLabel,
    Leave_Type: leave.leaveType ? leave.leaveType.toUpperCase() : 'N/A',
    Duration: durationText,
    Reason: leave.reason,
    Status: '✅ Approved',
    Approved_By: reviewer?.name || 'Administrator',
    message: `Leave request for ${student.name} has been approved by ${reviewer?.name || 'Administrator'}.`,
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCTION D — sendLeaveRejectionAlert
// ═══════════════════════════════════════════════════════════════════════════════
const sendLeaveRejectionAlert = async (student, leave, reviewer, rejectionComment) => {
  const deptLabel = DEPT_LABELS[student.department] || student.department?.toUpperCase() || 'N/A';
  const durationText = `${leave.duration} Day(s) (${fmtDate(leave.startDate)} – ${fmtDate(leave.endDate)})`;

  await sendViaWeb3Forms({
    subject: `❌ LEAVE REJECTED: ${student.name} (${student.studentId || 'N/A'})`,
    Student_Name: student.name,
    Student_ID: student.studentId || 'N/A',
    Department: deptLabel,
    Leave_Type: leave.leaveType ? leave.leaveType.toUpperCase() : 'N/A',
    Duration: durationText,
    Reason: leave.reason,
    Status: '❌ Rejected',
    Rejected_By: reviewer?.name || 'Administrator',
    Rejection_Comment: rejectionComment || 'No comment provided',
    message: `Leave request for ${student.name} was rejected. Reason: ${rejectionComment || 'N/A'}`,
  });
};

module.exports = {
  sendLeaveSubmissionAlert,
  sendLeaveApprovalAlert,
  sendLeaveRejectionAlert,
  sendStudentDecisionAlert,
};
