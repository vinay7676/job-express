import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['Full Time', 'Internship'],
  },
  position: {
    type: String,
    required: true,
    trim: true,
  },
  salary: {
    type: String,
    required: true,
    trim: true,
  },
  experience: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hr',
    required: true,
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'inactive'],
  },
}, { timestamps: true });

export default mongoose.model('Job', jobSchema);
