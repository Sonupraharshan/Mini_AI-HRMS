import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export const sendEmail = async (toEmail, subject, htmlContent, senderName, orgName, replyToEmail) => {
    try {
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
        const smtpPort = parseInt(process.env.SMTP_PORT || '587');
        const senderEmail = process.env.SENDER_EMAIL || smtpUser; 

        if (!smtpPass || !smtpUser) {
           console.error(`[Email Service] Cannot send email. SMTP_USER or SMTP_PASS missing in .env.`);
           return { success: false, error: 'Server missing SMTP credentials.' };
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465, // true for 465, false for 587
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        const fromString = senderName && replyToEmail
            ? `"${senderName} (${replyToEmail}) via Mini AI-HRMS" <${senderEmail}>`
            : senderName && orgName 
                ? `"${senderName} at ${orgName}" <${senderEmail}>`
                : `"Mini AI-HRMS" <${senderEmail}>`;

        const info = await transporter.sendMail({
            from: fromString,
            to: toEmail,
            replyTo: replyToEmail || undefined,
            subject: subject,
            html: htmlContent,
        });

        console.log(`✉️ LIVE EMAIL DISPATCHED TO: ${toEmail}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Failed to send real email:", error);
        return { success: false, error: error.message || error };
    }
};
