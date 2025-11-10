import express from 'express';
import { createJob, getAllJobs, getMyJobs } from '../controllers/createjobController.js';

const router = express.Router();

// POST /api/job/create - Create a new job (HR authenticated)
router.post('/create', createJob);

// GET /api/job/all - Get all active jobs (public)
router.get('/all', getAllJobs);

// GET /api/job/my-jobs - Get jobs posted by the authenticated HR user
router.get('/my-jobs', getMyJobs);

export default router;