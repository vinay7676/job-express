// controllers/authController.js
import dotenv from "dotenv";
dotenv.config();

import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

// ---- Validate required env vars (fail fast) ----
const requiredEnvs = ["EMAIL_USER", "EMAIL_PASS", "JWT_SECRET"];
const missing = requiredEnvs.filter((k) => !process.env[k]);

if (missing.length) {
  console.error(
    `FATAL: Missing required environment variables: ${missing.join(", ")}. ` +
    `Please set them in your .env or environment. Exiting.`
  );
  // Stop startup so you don't run without email/JWT configured
  process.exit(1);
}

// =====================
// Email Transporter Setup
// =====================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// optional: verify transporter at startup (will surface auth errors early)
transporter.verify().then(() => {
  console.log("Mailer: SMTP transporter verified");
}).catch((err) => {
  console.error("Mailer verification failed:", err.message || err);
  process.exit(1);
});

// =====================
// Utility: Generate 6-digit OTP
// =====================
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

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

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}. It expires in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error("Request OTP error:", err);
    // If it's a nodemailer/auth error, nodemailer throws -- surface it but don't leak secrets
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

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
