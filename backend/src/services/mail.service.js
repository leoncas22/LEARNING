import env from '../config/env.js';

/**
 * Minimal mail abstraction. In development there's no email provider wired
 * up, so we log the message (and, for links, the raw URL) to the console —
 * that's enough to manually test the forgot-password / verify-email flows.
 *
 * To go to production: implement `send` using your provider's SDK (Resend,
 * SES, Postmark, etc.) behind this exact same function signature, and
 * nothing else in the codebase needs to change — every call site only
 * knows about `sendMail`.
 */
async function send({ to, subject, text }) {
  if (env.isProduction) {
    // eslint-disable-next-line no-console
    console.warn(
      '[mail.service] No production email provider configured yet. ' +
        'Wire one up here before deploying — this call was NOT delivered.'
    );
  }
  // eslint-disable-next-line no-console
  console.log('\n----- MOCK EMAIL -----');
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(text);
  console.log('-----------------------\n');
}

export async function sendPasswordResetEmail(to, resetUrl) {
  await send({
    to,
    subject: 'Reset your LMS password',
    text: `We received a request to reset your password. This link expires in 30 minutes:\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
  });
}

export async function sendVerificationEmail(to, verifyUrl) {
  await send({
    to,
    subject: 'Verify your LMS email address',
    text: `Please confirm your email address. This link expires in 24 hours:\n\n${verifyUrl}`,
  });
}

export async function sendEmployeeInvitationEmail(to, temporaryPassword) {
  await send({
    to,
    subject: 'You have been added to the LMS platform',
    text: `An account was created for you.\n\nEmail: ${to}\nTemporary password: ${temporaryPassword}\n\nPlease log in and change your password as soon as possible.`,
  });
}

export default { sendPasswordResetEmail, sendVerificationEmail, sendEmployeeInvitationEmail };
