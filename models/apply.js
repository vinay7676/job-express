import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    contact: {
        type: String,
        required: true,
        trim: true,
    },
    experience: {
        type: String,
        required: true,
        trim: true,
    },
    domain: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hr',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // ✅ NEW FIELD: Application Status
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Rejected'], // Allowed values
        default: 'Pending', // Default status upon creation
    },
}, { timestamps: true });

export default mongoose.model('Application', applicationSchema);