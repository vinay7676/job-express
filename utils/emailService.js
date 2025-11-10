import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create the Nodemailer transporter using the provided credentials
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, // App-specific password for Gmail
    },
    // Optional: Log successful connections
    // debug: true,
});

// Utility function to send the email
const sendMail = async (to, subject, htmlContent) => {
    const mailOptions = {
        from: `Job Portal HR <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: htmlContent,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${to}. Message ID: ${info.messageId}`);
    } catch (error) {
        console.error(`❌ Error sending email to ${to}:`, error);
        // Important: Log the specific error details for debugging authentication issues
        if (error.responseCode === 535) {
            console.error("  -> Authentication failed. Check EMAIL_PASS (App Password) is correct.");
        }
        throw new Error("Failed to send notification email.");
    }
};

// =========================================================
// Template Function 1: Acceptance
// =========================================================
// 👇 Updated to accept hrName and hrEmail
export const sendAcceptanceEmail = (candidateEmail, jobTitle, hrName, hrEmail) => {
    const subject = `Congratulations! You've been selected for the ${jobTitle} role.`;
    
    // 👇 Construct the HR signature with a fallback
    const hrSignature = hrName ? 
        `HR ${hrName}<br> <a href="mailto:${hrEmail}" style="color: #28a745; text-decoration: none;">${hrEmail}</a>` : 
        'The Recruitment Team';
        
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #28a745;">🎉 Congratulations!</h2>
            <p>We are delighted to inform you that your application for the position of <strong>${jobTitle}</strong> has been successful!</p>
            <p>The HR team will be in touch shortly to discuss the next steps, including scheduling your final interview or discussing your offer package.</p>
            <p>We look forward to having you join our team.</p>
            <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
                Best regards,<br>
                ${hrSignature} 
            </p>
        </div>
    `;
    return sendMail(candidateEmail, subject, htmlContent);
};

// =========================================================
// Template Function 2: Rejection
// =========================================================
// 👇 Updated to accept hrName and hrEmail
export const sendRejectionEmail = (candidateEmail, jobTitle, hrName, hrEmail) => {
    const subject = `Update on your application for ${jobTitle}`;
    
    // 👇 Construct the HR signature with a fallback
    const hrSignature = hrName ? 
        `HR ${hrName}<a href="mailto:${hrEmail}" style="color: #dc3545; text-decoration: none;">${hrEmail}</a>` : 
        'The Recruitment Team';

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #dc3545;">😔 Application Update</h2>
            <p>Thank you for your interest in the position of <strong>${jobTitle}</strong>. We received a high volume of applications from extremely qualified candidates.</p>
            <p>Unfortunately, after careful consideration, we will not be moving forward with your application at this time.</p>
            <p>We truly appreciate the time you invested in applying and encourage you to apply for future openings that match your skills.</p>
            <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
                Best regards,<br>
                ${hrSignature}
            </p>
        </div>
    `;
    return sendMail(candidateEmail, subject, htmlContent);
};