import mongoose from 'mongoose';
import Application from '../models/apply.js';
import Job from '../models/createjob.js';
import { sendAcceptanceEmail, sendRejectionEmail } from '../utils/emailService.js'; // Ensure the path is correct

// ✅ Create new application (No change needed here)
export const createApplication = async (req, res) => {
    try {
        const { name, contact, experience, domain, message, jobId, postedBy, userId } = req.body;

        // 1️⃣ Validate required fields
        if (!name || !contact || !experience || !domain || !message || !jobId || !postedBy || !userId) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required.',
            });
        }

        // 2️⃣ Validate ObjectId format before using findById
        if (![jobId, postedBy, userId].every(id => mongoose.Types.ObjectId.isValid(id))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ObjectId format in jobId, postedBy, or userId.',
            });
        }

        // 3️⃣ Check if job exists
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found',
            });
        }

        // 4️⃣ Create application
        const application = await Application.create({
            name,
            contact,
            experience,
            domain,
            message,
            jobId,
            postedBy,
            userId,
        });

        return res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: application,
        });
    } catch (error) {
        console.error('❌ Error in createApplication:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Error submitting application',
            error: error.message,
        });
    }
};

// ✅ Get all applications by specific user (Kept as is)
export const getUserApplications = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid userId format.',
            });
        }

        const applications = await Application.find({ userId })
            .populate('jobId', 'title position type salary experience')
            .populate('postedBy', 'name email')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: applications.length,
            data: applications,
        });
    } catch (error) {
        console.error('❌ Error in getUserApplications:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Error fetching applications',
            error: error.message,
        });
    }
};

// ✅ Get all applications for a specific HR (Kept as is)
export const getApplicationsForHr = async (req, res) => {
    try {
        const { hrId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(hrId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid HR ID format.",
            });
        }

        const applications = await Application.find({ postedBy: hrId })
            .populate("jobId", "title position type salary experience")
            .populate("userId", "name email contact")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: applications.length,
            data: applications,
        });
    } catch (error) {
        console.error("❌ Error in getApplicationsForHr:", error.message);
        return res.status(500).json({
            success: false,
            message: "Error fetching HR applications",
            error: error.message,
        });
    }
};

// ✅ FINAL COMBINED FUNCTION: Update Application Status + Send Email
export const updateApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params; // The application ID
        const { status } = req.body; // 'Accepted' or 'Rejected'

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid application ID format.' });
        }

        // Basic validation for the status value
        if (!status || !['Accepted', 'Rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid or missing status value. Must be Accepted or Rejected.' });
        }

        // 1️⃣ Update the application status
        const updatedApplication = await Application.findByIdAndUpdate(
            id,
            { status: status },
            { new: true, runValidators: true }
        );

        if (!updatedApplication) {
            return res.status(404).json({ success: false, message: 'Application not found.' });
        }

        // 2️⃣ Fetch the updated application with populated fields for email data
        const fullApplication = await Application.findById(id)
            .populate({
                path: 'userId',
                select: 'email',
            })
            .populate({
                path: 'jobId',
                select: 'title',
            })
            // 👇 NEW: Populate the HR (postedBy) details for the email signature
            .populate({ 
                path: 'postedBy', 
                select: 'name email', // Fetch HR's name and email
            });

        const candidateEmail = fullApplication?.userId?.email;
        const jobTitle = fullApplication?.jobId?.title;
        // 👇 NEW: Extract HR details
        const hrName = fullApplication?.postedBy?.name;
        const hrEmail = fullApplication?.postedBy?.email;


        if (candidateEmail && jobTitle && hrName && hrEmail) {
            // 3️⃣ Send Email based on the new status
            if (status === 'Accepted') {
                // 👇 NEW: Pass HR name and email
                await sendAcceptanceEmail(candidateEmail, jobTitle, hrName, hrEmail);
            } else if (status === 'Rejected') {
                // 👇 NEW: Pass HR name and email
                await sendRejectionEmail(candidateEmail, jobTitle, hrName, hrEmail);
            }
        } else {
            console.warn(`⚠️ Warning: Missing required data (Email, Job Title, or HR details) for application ${id}. Email not sent.`);
        }

        // 4️⃣ Send response back to the frontend
        return res.status(200).json({
            success: true,
            data: updatedApplication,
            message: `Application status updated to ${status}. Email notification sent.`,
        });

    } catch (error) {
        console.error("❌ Error in updateApplicationStatus:", error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to update application status or send email.',
            error: error.message,
        });
    }
};