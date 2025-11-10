import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  number: {
    type: String, // For phone number
    required: true,
  },
  otp: {
    type: String, // Store the OTP
  },
  otpExpires: {
    type: Date, // Expiration time for OTP
  },
});

const User = mongoose.model("User", userSchema);

export default User;