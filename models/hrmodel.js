import mongoose from 'mongoose';

const hrSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  age: {
    type: Number,
    required: true,
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Other'],
  },
  contact: {
    type: String,
    required: true,
    trim: true,
  },
  otp: {  // New field for OTP
    type: String,
  },
  otpExpires: {  // New field for OTP expiration
    type: Date,
  },
}, { timestamps: true });

export default mongoose.model('Hr', hrSchema);