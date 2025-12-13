/**
 * Email Service (Mock for Development)
 * Replace with real nodemailer/SendGrid/SES in production.
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Sends a verification email to new users.
 * In development, logs the token to the console.
 */
async function sendVerificationEmail(email, token) {
    const verificationLink = `${FRONTEND_URL}/verify-email?token=${token}`;

    // In production, use nodemailer or a transactional email service.
    // For now, just log to console for testing.
    console.log('\n');
    console.log('=========================================');
    console.log('📧  VERIFICATION EMAIL (DEV MODE)');
    console.log('=========================================');
    console.log(`To: ${email}`);
    console.log(`Link: ${verificationLink}`);
    console.log('=========================================');
    console.log('\n');

    return { success: true, message: 'Email sent (mocked)' };
}

/**
 * Sends a password reset email.
 * In development, logs the token to the console.
 */
async function sendPasswordResetEmail(email, token) {
    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

    console.log('\n');
    console.log('=========================================');
    console.log('🔑  PASSWORD RESET EMAIL (DEV MODE)');
    console.log('=========================================');
    console.log(`To: ${email}`);
    console.log(`Link: ${resetLink}`);
    console.log('=========================================');
    console.log('\n');

    return { success: true, message: 'Email sent (mocked)' };
}

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
};
