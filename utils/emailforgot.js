import nodemailer from "nodemailer";

const transporter = nodemailer.createTransporter({
  service: "gmail", // Or your provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Use app password for Gmail
  },
});

export default transporter;