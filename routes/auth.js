import express from "express";
import { signup, login, requestOTP, resetPasswordWithOTP } from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/request-otp", requestOTP); // New: Request OTP
router.post("/reset-password", resetPasswordWithOTP); // New: Reset with OTP

export default router;