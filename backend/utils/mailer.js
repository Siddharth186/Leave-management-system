const nodemailer = require('nodemailer');

/**
 * mailer.js
 * Master Admin email tracking system.
 *
 * Two lifecycle functions:
 *   sendLeaveSubmissionAlert(student, leave)           — fired on submission
 *   sendLeaveApprovalAlert(student, leave, reviewer)   — fired on approval
 *
 * Both route explicitly to bonkai3876@gmail.com regardless of department.
 * Both are fire-and-forget — SMTP failures are logged, never re-thrown.
 */

// ─── SMTP Transporter (lazily initialised once, reused across requests) ────────
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP credentials not set in .env — email alerts disabled');
    return null;
  }

  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false, // STARTTLS on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS, // Gmail App Password — 16 chars, no spaces
    },
  });

  return _transporter;
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

// ─── Master recipient — always routes here regardless of department ────────────
const MASTER_EMAIL = 'bonkai3876@gmail.com';

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCTION A — sendLeaveSubmissionAlert
// Triggered the moment a student saves a new leave request (status: pending).
// Routes to MASTER_EMAIL so the master admin sees every submission instantly,
// across all departments, without waiting for faculty review.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @param {object} student - Mongoose User document of the submitting student
 * @param {object} leave   - Mongoose Leave document just created
 */
const sendLeaveSubmissionAlert = async (student, leave) => {
  const transporter = getTransporter();
  if (!transporter) return;

  const deptLabel = DEPT_LABELS[student.department] || student.department?.toUpperCase() || 'N/A';

  const mailOptions = {
    from:    `"Student Portal Alerts" <${process.env.SMTP_USER}>`,
    to:      process.env.ALERT_EMAIL || MASTER_EMAIL,
    subject: `📋 NEW LEAVE REQUEST: ${student.name} — ${(student.department || 'N/A').toUpperCase()} Dept`,
    html: `
      <div style="font-family: sans-serif; padding: 24px; color: #0f172a;
                  max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px;">

        <h2 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 8px; margin-top: 0;">
          📋 Leave Request Submitted — Pending Review
        </h2>

        <p style="color: #475569; margin-bottom: 20px;">
          A new leave request has been submitted and is awaiting faculty approval.
        </p>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f8fafc;">
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;
                        width: 38%; border-bottom: 1px solid #e2e8f0;">Student Name</td>
            <td style="padding: 10px 14px; color: #0f172a;
                        border-bottom: 1px solid #e2e8f0;">${student.name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;
                        border-bottom: 1px solid #e2e8f0;">Student ID</td>
            <td style="padding: 10px 14px; color: #0f172a;
                        border-bottom: 1px solid #e2e8f0;">${student.studentId || 'N/A'}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;
                        border-bottom: 1px solid #e2e8f0;">Department</td>
            <td style="padding: 10px 14px; color: #0f172a;
                        border-bottom: 1px solid #e2e8f0;">${deptLabel}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;
                        border-bottom: 1px solid #e2e8f0;">Leave Type</td>
            <td style="padding: 10px 14px; color: #0f172a;
                        border-bottom: 1px solid #e2e8f0;">
              ${leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)}
            </td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;
                        border-bottom: 1px solid #e2e8f0;">Duration</td>
            <td style="padding: 10px 14px; color: #0f172a;
                        border-bottom: 1px solid #e2e8f0;">
              ${leave.duration} Day(s) &nbsp;(${fmtDate(leave.startDate)} – ${fmtDate(leave.endDate)})
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;
                        border-bottom: 1px solid #e2e8f0;">Reason</td>
            <td style="padding: 10px 14px; color: #0f172a;
                        border-bottom: 1px solid #e2e8f0;">"${leave.reason}"</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Status</td>
            <td style="padding: 10px 14px; color: #f59e0b; font-weight: 600;">
              ⏳ Pending Faculty Review
            </td>
          </tr>
        </table>

        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;
                  border-top: 1px solid #e2e8f0; padding-top: 12px;">
          This is an automated master-admin alert from the
          <strong>Student Leave Management Portal</strong>. Do not reply.
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Submission alert sent → ${mailOptions.to} [msgId: ${info.messageId}]`);
  } catch (err) {
    console.error(`⚠️  Submission email failed (leave still saved): ${err.message}`);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCTION B — sendLeaveApprovalAlert
// Triggered when a department admin approves a leave (pending → approved).
// Routes to MASTER_EMAIL with full approval metadata including reviewer name.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @param {object} student  - Mongoose User document of the student
 * @param {object} leave    - Mongoose Leave document (now approved)
 * @param {object} reviewer - Mongoose User document of the approving admin
 */
const sendLeaveApprovalAlert = async (student, leave, reviewer) => {
  const transporter = getTransporter();
  if (!transporter) return;

  const deptLabel = DEPT_LABELS[student.department] || student.department?.toUpperCase() || 'N/A';

  const mailOptions = {
    from:    `"Student Portal Alerts" <${process.env.SMTP_USER}>`,
    to:      process.env.ALERT_EMAIL || MASTER_EMAIL,
    subject: `🎓 LEAVE APPROVED: ${student.name} (${student.studentId || 'N/A'})`,
    html: `
      <div style="font-family: sans-serif; padding: 24px; color: #0f172a;
                  max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px;">

        <h2 style="color: #22c55e; border-bottom: 2px solid #22c55e; padding-bottom: 8px; margin-top: 0;">
          ✅ Leave Request Approved
        </h2>

        <p style="color: #475569; margin-bottom: 20px;">
          The following student leave request has been approved and logged into the portal.
        </p>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f8fafc;">
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;
                        width: 38%; border-bottom: 1px solid #e2e8f0;">Student Name</td>
            <td style="padding: 10px 14px; color: #0f172a;
                        border-bottom: 1px solid #e2e8f0;">${student.name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;
                        border-bottom: 1px solid #e2e8f0;">Student ID</td>
            <td style="padding: 10px 14px; color: #0f172a;
                        border-bottom: 1px solid #e2e8f0;">${student.studentId || 'N/A'}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;
                        border-bottom: 1px solid #e2e8f0;">Department</td>
            <td style="padding: 10px 14px; color: #0f172a;
                        border-bottom: 1px solid #e2e8f0;">${deptLabel}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;
                        border-bottom: 1px solid #e2e8f0;">Leave Type</td>
            <td style="padding: 10px 14px; color: #0f172a;
                        border-bottom: 1px solid #e2e8f0;">
              ${leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)}
            </td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;
                        border-bottom: 1px solid #e2e8f0;">Duration</td>
            <td style="padding: 10px 14px; color: #0f172a;
                        border-bottom: 1px solid #e2e8f0;">
              ${leave.duration} Day(s) &nbsp;(${fmtDate(leave.startDate)} – ${fmtDate(leave.endDate)})
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;
                        border-bottom: 1px solid #e2e8f0;">Reason</td>
            <td style="padding: 10px 14px; color: #0f172a;
                        border-bottom: 1px solid #e2e8f0;">"${leave.reason}"</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;
                        border-bottom: 1px solid #e2e8f0;">Approved By</td>
            <td style="padding: 10px 14px; color: #0f172a;
                        border-bottom: 1px solid #e2e8f0;">
              ${reviewer?.name || 'Admin'} (Faculty/Admin)
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Approved On</td>
            <td style="padding: 10px 14px; color: #22c55e; font-weight: 600;">
              ✅ ${new Date().toLocaleString('en-IN')}
            </td>
          </tr>
        </table>

        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;
                  border-top: 1px solid #e2e8f0; padding-top: 12px;">
          This is an automated master-admin alert from the
          <strong>Student Leave Management Portal</strong>. Do not reply.
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Approval alert sent → ${mailOptions.to} [msgId: ${info.messageId}]`);
  } catch (err) {
    console.error(`⚠️  Approval email failed (leave still approved): ${err.message}`);
  }
};

module.exports = { sendLeaveSubmissionAlert, sendLeaveApprovalAlert };
