import express from 'express';
import { createHr, loginHr, getAllHrs, requestOTPForHr, resetPasswordWithOTPForHr } from '../controllers/hrController.js';

const router = express.Router();

// POST /api/hr/create - Create a new HR
router.post('/create', createHr);

// POST /api/hr/login - HR login
router.post('/login', loginHr);

// ✅ GET /api/hr/all - Get all HRs
router.get('/all', getAllHrs);

// ✅ POST /api/hr/request-otp - Request OTP for HR password reset
router.post('/request-otp', requestOTPForHr);

// ✅ POST /api/hr/reset-password - Reset HR password with OTP
router.post('/reset-password', resetPasswordWithOTPForHr);

export default router;