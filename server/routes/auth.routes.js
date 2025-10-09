import express from "express";
import { loginUser, registerUser, sendOTP, verifyOTP } from "../controllers/auth.controller.js";

const authRouter = express.Router();

// OTP routes
authRouter.post("/send-otp", sendOTP);
authRouter.post("/verify-otp", verifyOTP);

// Authentication routes
authRouter.post("/signup", registerUser);
authRouter.post("/login", loginUser);

export { authRouter };