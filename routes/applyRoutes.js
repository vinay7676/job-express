import express from 'express';
import {
    createApplication,
    getUserApplications,
    getApplicationsForHr,
    updateApplicationStatus // ✅ NEW: Import the update function
} from '../controllers/Applycontroller.js';

const router = express.Router();

// Create new application
router.post('/create', createApplication);

// Get all applications by specific user
router.get('/user/:userId', getUserApplications);

// Get all applications for a specific HR
router.get("/hr/:hrId", getApplicationsForHr);

// ✅ NEW ROUTE: Update application status (used by Accept/Reject buttons)
router.put('/:id', updateApplicationStatus);


export default router;