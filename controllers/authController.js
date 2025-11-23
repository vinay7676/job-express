// controllers/authController.js
import dotenv from "dotenv";
dotenv.config();

import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

// ---- Validate required env vars (fail fast) ----
const requiredEnvs = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "FROM_EMAIL",
  "JWT_SECRET"
];
const missing = requiredEnvs.filter((k) => !process.env[k]);

if (missing.length) {
  console.error(
    `FATAL: Missing required environment variables: ${missing.join(", ")}. ` +
    `Please set them in your .env or environment. Exiting.`
  );
  process.exit(1);
}

// =====================
// Email Transporter Setup (BREVO)
// =====================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,      // smtp-relay.brevo.com
  port: process.env.SMTP_PORT,      // 587
  secure: false,                    // Brevo uses STARTTLS
  auth: {
    user: process.env.SMTP_USER,    // Your Brevo SMTP user
    pass: process.env.SMTP_PASS,    // Your Brevo SMTP key
  },
});

// Verify transporter at startup (non-blocking)
transporter.verify()
  .then(() => {
    console.log("✅ Mailer: SMTP transporter verified (Brevo)");
  })
  .catch((err) => {
    console.error("⚠️ Mailer verification failed:", err.message || err);
    console.log("📧 Will attempt to send emails anyway (verification can fail on some hosting platforms)");
    // Don't exit - let the app run and try sending emails when needed
  });

// =====================
// Utility: Generate 6-digit OTP
// =====================
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// =====================
// Utility: Send Email
// =====================
const sendMail = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: process.env.FROM_EMAIL, // e.g., "Your App <9b994b001@smtp-brevo.com>"
    to,
    subject,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to} | Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Email failed to ${to}:`, error);
    throw new Error("Failed to send email.");
  }
};

// =====================
// SIGNUP
// =====================
export const signup = async (req, res) => {
  const { name, email, password, number } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ success: false, message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ name, email, password: hashedPassword, number });
    await user.save();

    res.status(201).json({ success: true, message: "User registered successfully" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =====================
// LOGIN
// =====================
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid credentials" });

    const payload = { user: { id: user.id } };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }, (err, token) => {
      if (err) {
        console.error("JWT sign error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
      }

      res.json({
        success: true,
        message: "Login successful",
        token,
        user: { id: user._id, name: user.name, email: user.email, number: user.number },
      });
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =====================
// REQUEST OTP for Password Reset
// =====================
export const requestOTP = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User with this email does not exist" });

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // HTML email template
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #007bff;">🔐 Password Reset Request</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>You requested a password reset. Please use the OTP below:</p>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #d9534f;">⏰ This OTP will expire in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <br>
        <p style="color: #666; font-size: 14px;">
          Regards,<br>
          Your App Team
        </p>
      </div>
    `;

    await sendMail(email, "Password Reset OTP", htmlContent);

    res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error("Request OTP error:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP. Server error." });
  }
};

// =====================
// RESET PASSWORD using OTP
// =====================
export const resetPasswordWithOTP = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Email, OTP, and new password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User with this email does not exist" });

    if (user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Send confirmation email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #28a745;">✅ Password Reset Successful</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Your password has been successfully reset.</p>
        <p>You can now log in with your new password.</p>
        <p style="color: #d9534f;">⚠️ If you didn't make this change, please contact support immediately.</p>
        <br>
        <p style="color: #666; font-size: 14px;">
          Regards,<br>
          Your App Team
        </p>
      </div>
    `;

    await sendMail(email, "Password Reset Successful", htmlContent);

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
