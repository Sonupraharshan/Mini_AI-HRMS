import nodemailer from 'nodemailer';

export const sendEmail = async (fromEmail, appPassword, toEmail, subject, htmlContent) => {
    try {
        if (!appPassword) {
           console.error(`[Email Service] Cannot send email. User ${fromEmail} does not have an SMTP App Password configured.`);
           return { success: false, error: 'No SMTP App Password configured for sender.' };
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail', // Defaulting to Gmail as the most common provider
            auth: {
                user: fromEmail,
                pass: appPassword
            }
        });

        const info = await transporter.sendMail({
            from: `"Your Admin Team" <${fromEmail}>`,
            to: toEmail,
            subject: subject,
            html: htmlContent,
        });

        console.log(`✉️ LIVE EMAIL DISPATCHED TO: ${toEmail}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Failed to send real email:", error);
        return { success: false, error };
    }
};
