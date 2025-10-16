import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateOTP, sendOTPEmail } from '../utils/emailService.js';

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.SECRET_KEY, { expiresIn: '30d' });
};

// -----------------------------
// 📩 SEND OTP FOR VERIFICATION
// -----------------------------
export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser && existingUser.isEmailVerified) {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered. Please login.',
      });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + (process.env.OTP_EXPIRY_MINUTES || 10) * 60 * 1000);

    if (existingUser && !existingUser.isEmailVerified) {
      existingUser.otp = otp;
      existingUser.otpExpiry = otpExpiry;
      await existingUser.save();
    } else {
      const tempUser = new User({
        email,
        otp,
        otpExpiry,
        username: `temp_${Date.now()}`,
        password: 'temp_password',
        isEmailVerified: false,
      });
      await tempUser.save();
    }

    await sendOTPEmail(email, otp);

    res.status(200).json({
      success: true,
      message: 'Verification code sent successfully to your email.',
      email,
      otpValidFor: `${process.env.OTP_EXPIRY_MINUTES || 10} minutes`,
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending verification email.',
    });
  }
};

// -----------------------------
// 🔍 VERIFY OTP
// -----------------------------
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({
      email,
      otp,
      otpExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    user.isEmailVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now complete registration.',
      isVerified: true,
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ success: false, message: 'Server error during OTP verification' });
  }
};

// -----------------------------
// 📝 COMPLETE REGISTRATION
// -----------------------------
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, isEmailVerified } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first before registering.',
      });
    }

    if (!existingUser.isEmailVerified && !isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email not verified. Please verify your email first.',
      });
    }

    const usernameTaken = await User.findOne({
      username,
      isEmailVerified: true,
      _id: { $ne: existingUser._id },
    });

    if (usernameTaken) {
      return res.status(409).json({
        success: false,
        message: 'Username is already taken',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    existingUser.username = username;
    existingUser.password = hashedPassword;
    existingUser.isEmailVerified = true;

    await existingUser.save();

    const token = generateToken(existingUser._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: existingUser._id,
        username: existingUser.username,
        email: existingUser.email,
        isEmailVerified: true,
      },
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
};

// -----------------------------
// 🔐 LOGIN USER
// -----------------------------
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email, isEmailVerified: true });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or email not verified',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.username}!`,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};
