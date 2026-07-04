const nodemailer = require('nodemailer');

/**
 * mailer.js
 * Thin wrapper around nodemailer.
 * All SMTP credentials are read from process.env — never hard-coded.
 *
 * Usage:
 *   const { sendLeaveApprovalAlert } = require('../utils/mailer');
 *   await sendLeaveApprovalAlert({ student, leave });
 */

// ─── Transporter (created once, reused across requests) ───────────────────────
// createTransport is cheap but we lazily initialise so the server can still
// boot if SMTP creds are missing — it just logs a warning instead of crashing.
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP credentials not configured — email alerts disabled');
    return null;
  }

  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,          // STARTTLS on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,  // Gmail App Password (16 chars, no spaces)
    },
  });

  return _transporter;
};

// ─── Department display labels ─────────────────────────────────────────────────
const DEPT_LABELS = {
  cse:   'Computer Science & Engineering',
  aids:  'AI & Data Science',
  cyber: 'Cyber Security',
  csbs:  'Computer Science & Business Systems',
  ece:   'Electronics & Communication Engineering',
  eee:   'Electrical & Electronics Engineering',
  mech:  'Mechanical Engineering',
};

/**
 * sendLeaveApprovalAlert
 * Dispatches an HTML email to ALERT_EMAIL when a leave is approved.
 *
 * @param {object} student  - Mongoose User document (populated)
 * @param {object} leave    - Mongoose Leave document (populated)
 * @param {object} reviewer - Mongoose User document (the admin who approved)
 */
const sendLeaveApprovalAlert = async (student, leave, reviewer) => {
  const transporter = getTransporter();
  if (!transporter) return; // SMTP not configured — silently skip

  const to      = process.env.ALERT_EMAIL;
  const deptLabel = DEPT_LABELS[student.department] || student.department || 'N/A';

  const startStr = new Date(leave.startDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const endStr = new Date(leave.endDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Leave Approved</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#1e293b;border-radius:12px;border:1px solid #334155;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0891b2,#6366f1);padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                ✅ Leave Request Approved
              </h1>
              <p style="margin:8px 0 0;color:#e0f2fe;font-size:14px;">
                Student Leave Management Portal
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6;">
                A leave request has been <strong style="color:#34d399;">approved</strong>.
                Summary details are listed below.
              </p>

              <!-- Info Table -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-collapse:collapse;border-radius:8px;overflow:hidden;">
                ${[
                  ['Student Name',  student.name],
                  ['Student ID',    student.studentId || 'N/A'],
                  ['Department',    deptLabel],
                  ['Leave Type',    leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)],
                  ['Duration',      `${leave.duration} day(s) &nbsp;(${startStr} – ${endStr})`],
                  ['Reason',        leave.reason],
                  ['Approved By',   reviewer?.name || 'Admin'],
                  ['Approved On',   new Date().toLocaleString('en-IN')],
                ].map(([label, value], i) => `
                  <tr style="background:${i % 2 === 0 ? '#0f172a' : '#1e293b'};">
                    <td style="padding:12px 16px;color:#64748b;font-size:13px;
                                font-weight:600;width:38%;border-bottom:1px solid #334155;">
                      ${label}
                    </td>
                    <td style="padding:12px 16px;color:#e2e8f0;font-size:13px;
                                border-bottom:1px solid #334155;">
                      ${value}
                    </td>
                  </tr>
                `).join('')}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #334155;
                        background:#0f172a;text-align:center;">
              <p style="margin:0;color:#475569;font-size:12px;">
                This is an automated alert from the
                <strong style="color:#22d3ee;">Student Leave Management Portal</strong>.
                Do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const info = await transporter.sendMail({
      from:    `"Leave Portal" <${process.env.SMTP_USER}>`,
      to,
      subject: `Leave Approved — ${student.name} (${student.department?.toUpperCase() || 'N/A'})`,
      html,
    });
    console.log(`📧 Approval alert sent → ${to} [msgId: ${info.messageId}]`);
  } catch (err) {
    // Never crash the approve flow because of an email failure
    console.error(`⚠️  Email alert failed (leave still approved): ${err.message}`);
  }
};

module.exports = { sendLeaveApprovalAlert };
