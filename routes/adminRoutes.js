import express from 'express';
import { adminLogin, getAdminProfile } from '../controllers/adminController.js';
import { authenticateToken, isAdmin } from '../middleware/adminauth.js';

const router = express.Router();

// Public route
router.post('/alogin', adminLogin);

// Protected routes
router.get('/profile', authenticateToken, isAdmin, getAdminProfile);

export default router;