const nodemailer = require('nodemailer');

/**
 * Create transporter — uses SMTP env vars.
 * For dev/testing, falls back to Ethereal (fake SMTP) if no config provided.
 */
let transporter;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Dev mode: create Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('📧 Email dev mode — preview at https://ethereal.email');
    console.log(`   User: ${testAccount.user}`);
  }

  return transporter;
}

const FROM = process.env.EMAIL_FROM || 'GP Membership OS <noreply@golfcharity.com>';

/**
 * Send welcome email after signup
 */
async function sendWelcomeEmail(user) {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: FROM,
      to: user.email,
      subject: 'Welcome to GP Membership OS',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#fff;padding:32px;border-radius:16px;">
          <h1 style="color:#22c55e;margin-bottom:8px;">Welcome, ${user.full_name}!</h1>
          <p style="color:#94a3b8;">Your account has been created successfully.</p>
          <p style="color:#94a3b8;">Next step: choose a subscription plan to start entering monthly draws and supporting your chosen charity.</p>
          <a href="${process.env.FRONTEND_URL}/pricing" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Choose a plan</a>
          <hr style="border-color:#1e293b;margin:24px 0;" />
          <p style="color:#475569;font-size:12px;">GP Membership OS — Play. Give. Win.</p>
        </div>
      `,
    });
    console.log('✉️  Welcome email sent:', nodemailer.getTestMessageUrl(info) || info.messageId);
  } catch (err) {
    console.error('Email error (welcome):', err.message);
  }
}

/**
 * Send draw results email to all participants
 */
async function sendDrawResultsEmail(users, drawData) {
  try {
    const t = await getTransporter();
    const { winningNumbers, prizePool, jackpotRolledOver } = drawData;

    for (const user of users) {
      const info = await t.sendMail({
        from: FROM,
        to: user.email,
        subject: `Monthly Draw Results — ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#fff;padding:32px;border-radius:16px;">
            <h1 style="color:#22c55e;">This month's draw results</h1>
            <p style="color:#94a3b8;">Hi ${user.full_name}, the monthly draw has been run.</p>
            <div style="background:#1e293b;border-radius:12px;padding:20px;margin:20px 0;">
              <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">Winning Numbers</p>
              <div style="display:flex;gap:8px;">
                ${winningNumbers.map(n => `<span style="background:#22c55e22;color:#22c55e;border:1px solid #22c55e44;width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;">${n}</span>`).join('')}
              </div>
            </div>
            <p style="color:#94a3b8;">Prize pool: <strong style="color:#fff;">$${parseFloat(prizePool).toFixed(2)}</strong></p>
            <p style="color:#94a3b8;">Jackpot: <strong style="color:${jackpotRolledOver ? '#f59e0b' : '#22c55e'};">${jackpotRolledOver ? 'Rolled over to next month' : 'Won!'}</strong></p>
            <a href="${process.env.FRONTEND_URL}/dashboard" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">View your results</a>
            <hr style="border-color:#1e293b;margin:24px 0;" />
            <p style="color:#475569;font-size:12px;">GP Membership OS — Play. Give. Win.</p>
          </div>
        `,
      });
      console.log('✉️  Draw results email:', nodemailer.getTestMessageUrl(info) || info.messageId);
    }
  } catch (err) {
    console.error('Email error (draw results):', err.message);
  }
}

/**
 * Send winner notification email
 */
async function sendWinnerEmail(user, winData) {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: FROM,
      to: user.email,
      subject: `You won! ${winData.matchCount}-Number Match 🏆`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#fff;padding:32px;border-radius:16px;">
          <h1 style="color:#22c55e;">Congratulations, ${user.full_name}!</h1>
          <p style="color:#94a3b8;">You matched <strong style="color:#fff;">${winData.matchCount} numbers</strong> in this month's draw.</p>
          <div style="background:#22c55e22;border:1px solid #22c55e44;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
            <p style="color:#64748b;font-size:12px;text-transform:uppercase;margin-bottom:4px;">Your prize</p>
            <p style="font-size:36px;font-weight:700;color:#22c55e;margin:0;">$${parseFloat(winData.prizeAmount).toFixed(2)}</p>
          </div>
          <p style="color:#94a3b8;">To claim your prize, please upload a screenshot of your scores from your golf platform.</p>
          <a href="${process.env.FRONTEND_URL}/dashboard" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Upload proof now</a>
          <hr style="border-color:#1e293b;margin:24px 0;" />
          <p style="color:#475569;font-size:12px;">GP Membership OS — Play. Give. Win.</p>
        </div>
      `,
    });
    console.log('✉️  Winner email:', nodemailer.getTestMessageUrl(info) || info.messageId);
  } catch (err) {
    console.error('Email error (winner):', err.message);
  }
}

/**
 * Send payout confirmation email
 */
async function sendPayoutEmail(user, amount) {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: FROM,
      to: user.email,
      subject: 'Your prize payout has been processed',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#fff;padding:32px;border-radius:16px;">
          <h1 style="color:#22c55e;">Payout processed!</h1>
          <p style="color:#94a3b8;">Hi ${user.full_name}, your prize of <strong style="color:#fff;">$${parseFloat(amount).toFixed(2)}</strong> has been marked as paid.</p>
          <p style="color:#94a3b8;">Thank you for playing and supporting charity.</p>
          <hr style="border-color:#1e293b;margin:24px 0;" />
          <p style="color:#475569;font-size:12px;">GP Membership OS — Play. Give. Win.</p>
        </div>
      `,
    });
    console.log('✉️  Payout email:', nodemailer.getTestMessageUrl(info) || info.messageId);
  } catch (err) {
    console.error('Email error (payout):', err.message);
  }
}

module.exports = { sendWelcomeEmail, sendDrawResultsEmail, sendWinnerEmail, sendPayoutEmail };
