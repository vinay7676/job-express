import jwt from 'jsonwebtoken';
import Job from '../models/createjob.js';
import Hr from '../models/hrmodel.js';

// ====================== CREATE JOB ======================
export const createJob = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hr = await Hr.findById(decoded.id);
    if (!hr || decoded.role !== 'hr') {
      return res.status(403).json({ message: 'HR access required' });
    }

    const { title, type, position, salary, experience, description } = req.body;

    if (!title || !type || !position || !salary || !experience || !description) {
      return res.status(400).json({ message: 'All job fields are required' });
    }

    const newJob = new Job({
      title,
      type,
      position,
      salary,
      experience,
      description,
      postedBy: hr._id,
      status: 'active',
    });

    await newJob.save();
    await newJob.populate('postedBy', 'name email');

    res.status(201).json({
      message: 'Job posted successfully',
      data: newJob,
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ message: 'Server error while posting job' });
  }
};

// ====================== GET ALL JOBS ======================
export const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'active' })
      .populate('postedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ data: jobs });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ message: 'Server error while fetching jobs' });
  }
};

// ====================== GET MY JOBS (New Function) ======================
export const getMyJobs = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hr = await Hr.findById(decoded.id);
    if (!hr || decoded.role !== 'hr') {
      return res.status(403).json({ message: 'HR access required' });
    }

    const jobs = await Job.find({ postedBy: hr._id, status: 'active' })
      .populate('postedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ data: jobs });
  } catch (error) {
    console.error('Error fetching my jobs:', error);
    res.status(500).json({ message: 'Server error while fetching jobs' });
  }
};


