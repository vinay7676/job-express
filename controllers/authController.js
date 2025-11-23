// controllers/authController.js
import dotenv from "dotenv";
dotenv.config();

import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

// ---- Validate required env vars ----
const requiredEnvs = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "FROM_EMAIL", "JWT_SECRET"];
const missing = requiredEnvs.filter(k => !process.env[k]);

if (missing.length) {
  console.error("Missing ENV variables:", missing.join(", "));
  process.exit(1);
}

// =====================
// Email Transporter Setup (BREVO SMTP)
// =====================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // Brevo uses TLS on port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// verify SMTP connection
transporter.verify()
  .then(() => console.log("Brevo SMTP: Connected successfully"))
  .catch(err => {
    console.error("SMTP Connection Error:", err.message);
    process.exit(1);
  });

// =====================
// Utility: Generate OTP
// =====================
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// =====================
// SIGNUP
// =====================
export const signup = async (req, res) => {
  const { name, email, password, number } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user)
      return res.status(400).json({ success: false, message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

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
    if (!user)
      return res.status(400).json({ success: false, message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ success: false, message: "Invalid credentials" });

    const payload = { user: { id: user.id } };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }, (err, token) => {
      if (err) return res.status(500).json({ success: false, message: "Server error" });

      res.json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          number: user.number,
        },
      });
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =====================
// REQUEST OTP
// =====================
export const requestOTP = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Your Password Reset OTP",
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    console.error("Request OTP error:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

// =====================
// RESET PASSWORD
// =====================
export const resetPasswordWithOTP = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (user.otp !== otp || user.otpExpires < new Date())
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
