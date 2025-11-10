import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Hr from '../models/hrmodel.js';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

// ---- Validate required env vars (fail fast) ----
const requiredEnvs = ['EMAIL_USER', 'EMAIL_PASS', 'JWT_SECRET'];
const missing = requiredEnvs.filter((k) => !process.env[k]);

if (missing.length) {
  console.error(
    `FATAL: Missing required environment variables: ${missing.join(', ')}. ` +
    `Please set them in your .env or environment. Exiting.`
  );
  process.exit(1);
}

// =====================
// Email Transporter Setup
// =====================
const transporter = nodemailer.createTransport({ // ✅ fixed here
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Optional: Verify transporter at startup
transporter.verify()
  .then(() => {
    console.log('Mailer: SMTP transporter verified');
  })
  .catch((err) => {
    console.error('Mailer verification failed:', err.message || err);
    process.exit(1);
  });

// =====================
// Utility: Generate 6-digit OTP
// =====================
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ✅ CREATE HR
export const createHr = async (req, res) => {
  try {
    const { name, email, password, age, gender, contact } = req.body;

    // Check if HR already exists
    const existingHr = await Hr.findOne({ email });
    if (existingHr) {
      return res.status(400).json({ message: 'HR with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new HR
    const newHr = new Hr({
      name,
      email,
      password: hashedPassword,
      age,
      gender,
      contact,
    });

    await newHr.save();

    // Exclude password in response
    const { password: _, ...hrWithoutPassword } = newHr.toObject();

    res.status(201).json({
      message: 'HR created successfully',
      data: hrWithoutPassword,
    });
  } catch (error) {
    console.error('Error creating HR:', error);
    res.status(500).json({ message: 'Server error while creating HR' });
  }
};

// ✅ LOGIN HR
export const loginHr = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find HR by email
    const hr = await Hr.findOne({ email });
    if (!hr) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, hr.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: hr._id, role: 'hr' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Exclude password from response
    const { password: _, ...hrWithoutPassword } = hr.toObject();

    res.status(200).json({
      message: 'HR login successful',
      token,
      data: hrWithoutPassword,
    });
  } catch (error) {
    console.error('Error logging in HR:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// ✅ GET ALL HRs
export const getAllHrs = async (req, res) => {
  try {
    const hrs = await Hr.find({}, '-password'); // exclude password field

    if (hrs.length === 0) {
      return res.status(404).json({ message: 'No HRs found' });
    }

    res.status(200).json({
      message: 'HR list fetched successfully',
      data: hrs,
    });
  } catch (error) {
    console.error('Error fetching HR list:', error);
    res.status(500).json({ message: 'Server error while fetching HRs' });
  }
};

// =====================
// REQUEST OTP for Password Reset (HR)
// =====================
export const requestOTPForHr = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const hr = await Hr.findOne({ email });
    if (!hr) return res.status(404).json({ success: false, message: 'HR with this email does not exist' });

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    hr.otp = otp;
    hr.otpExpires = otpExpires;
    await hr.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'HR Password Reset OTP',
      text: `Your OTP for HR password reset is: ${otp}. It expires in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Request OTP error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Server error.' });
  }
};

// =====================
// RESET PASSWORD using OTP (HR)
// =====================
export const resetPasswordWithOTPForHr = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
    }

    const hr = await Hr.findOne({ email });
    if (!hr) return res.status(404).json({ success: false, message: 'HR with this email does not exist' });

    if (hr.otp !== otp || hr.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    hr.password = hashedPassword;
    hr.otp = undefined; // Clear OTP after successful reset
    hr.otpExpires = undefined;
    await hr.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
