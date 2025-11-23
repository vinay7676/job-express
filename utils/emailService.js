import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ================================
// SMTP Transporter (BREVO)
// ================================
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,             // smtp-relay.brevo.com
    port: process.env.SMTP_PORT,             // 587
    secure: false,                           // Brevo uses STARTTLS
    auth: {
        user: process.env.SMTP_USER,         // 9b994b001@smtp-brevo.com
        pass: process.env.SMTP_PASS,         // SMTP key
    },
});

// Simple email function
const sendMail = async (to, subject, htmlContent) => {
    const mailOptions = {
        from: process.env.FROM_EMAIL, // "Job Portal HR <9b994b001@smtp-brevo.com>"
        to,
        subject,
        html: htmlContent,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${to} | Message ID: ${info.messageId}`);
    } catch (error) {
        console.error(`❌ Email failed to ${to}:`, error);
        throw new Error("Failed to send email.");
    }
};

// ==========================================
// Template 1: Acceptance Email
// ==========================================
export const sendAcceptanceEmail = (candidateEmail, jobTitle, hrName, hrEmail) => {
    const subject = `Congratulations! You've been selected for the ${jobTitle} role.`;

    const hrSignature = hrName
        ? `HR ${hrName}<br><a href="mailto:${hrEmail}" style="color: #28a745;">${hrEmail}</a>`
        : "The Recruitment Team";

    const htmlContent = `
        <div style="font-family: Arial; line-height: 1.6;">
            <h2 style="color: #28a745;">🎉 Congratulations!</h2>
            <p>Your application for <strong>${jobTitle}</strong> was successful!</p>
            <p>Our HR team will contact you shortly regarding next steps.</p>
            <br>
            <p style="color: #444; font-size: 14px;">
                Regards,<br>${hrSignature}
            </p>
        </div>
    `;

    return sendMail(candidateEmail, subject, htmlContent);
};

// ==========================================
// Template 2: Rejection Email
// ==========================================
export const sendRejectionEmail = (candidateEmail, jobTitle, hrName, hrEmail) => {
    const subject = `Update on your application for ${jobTitle}`;

    const hrSignature = hrName
        ? `HR ${hrName}<br><a href="mailto:${hrEmail}" style="color: #dc3545;">${hrEmail}</a>`
        : "The Recruitment Team";

    const htmlContent = `
        <div style="font-family: Arial; line-height: 1.6;">
            <h2 style="color: #dc3545;">😔 Application Update</h2>
            <p>Thank you for applying for <strong>${jobTitle}</strong>.</p>
            <p>After review, we will not be moving forward with your application.</p>
            <br>
            <p style="color: #444; font-size: 14px;">
                Regards,<br>${hrSignature}
            </p>
        </div>
    `;

    return sendMail(candidateEmail, subject, htmlContent);
};
