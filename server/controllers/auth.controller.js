import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateOTP, sendOTPEmail } from '../utils/emailService.js';

const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.SECRET_KEY, { expiresIn: '30d' });
};

// Send OTP for email verification - FIXED VERSION
export const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required',
                event: 'EVENTICA_EMAIL_REQUIRED'
            });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address',
                event: 'EVENTICA_INVALID_EMAIL_FORMAT'
            });
        }

        // Check if email is already registered and verified
        const existingUser = await User.findOne({ email });
        
        console.log('EVENTICA DEBUG: User lookup result:', {
            email,
            userExists: !!existingUser,
            isVerified: existingUser?.isEmailVerified || false
        });

        // CRITICAL FIX: Stop execution completely if email is already verified
        if (existingUser && existingUser.isEmailVerified === true) {
            console.log('EVENTICA DEBUG: Blocking OTP send - email already verified');
            return res.status(409).json({
                success: false,
                message: 'This email is already registered with Eventica. Please login to continue.',
                event: 'EVENTICA_EMAIL_ALREADY_REGISTERED',
                action: 'LOGIN_REQUIRED'
            });
        }

        // Generate OTP and set expiry only for unverified/new emails
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + (process.env.OTP_EXPIRY_MINUTES || 10) * 60 * 1000);

        // Handle unverified existing user or create new user
        if (existingUser && !existingUser.isEmailVerified) {
            console.log('EVENTICA DEBUG: Updating OTP for unverified user');
            existingUser.otp = otp;
            existingUser.otpExpiry = otpExpiry;
            await existingUser.save();
        } else {
            console.log('EVENTICA DEBUG: Creating new temporary user');
            // Create new user with OTP (without other details)
            const tempUser = new User({
                email,
                otp,
                otpExpiry,
                username: `temp_${Date.now()}`,
                password: 'temp_password',
                isEmailVerified: false
            });
            await tempUser.save();
        }

        // Send OTP email only after successful user creation/update
        console.log('EVENTICA DEBUG: Sending OTP email to:', email);
        await sendOTPEmail(email, otp);

        res.status(200).json({
            success: true,
            message: 'Verification code sent successfully to your email for Eventica registration',
            email: email,
            event: 'EVENTICA_OTP_SENT_SUCCESS',
            otpValidFor: `${process.env.OTP_EXPIRY_MINUTES || 10} minutes`
        });

    } catch (error) {
        console.error('EVENTICA Send OTP error:', error);
        
        if (error.message && error.message.includes('Failed to send verification email')) {
            res.status(500).json({
                success: false,
                message: 'Failed to send verification email. Please check your email address and try again.',
                event: 'EVENTICA_EMAIL_SEND_FAILED'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Server error while sending OTP. Please try again later.',
                event: 'EVENTICA_SERVER_ERROR'
            });
        }
    }
};

// Verify OTP - Updated with better error handling
export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Validate input
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required',
                event: 'EVENTICA_OTP_VERIFICATION_INCOMPLETE'
            });
        }

        // Validate OTP format (6 digits)
        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: 'OTP must be a 6-digit number',
                event: 'EVENTICA_INVALID_OTP_FORMAT'
            });
        }

        // Find user with matching email and OTP
        const user = await User.findOne({ 
            email, 
            otp,
            otpExpiry: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP',
                event: 'EVENTICA_OTP_INVALID_OR_EXPIRED'
            });
        }

        // Mark email as verified and clear OTP
        user.isEmailVerified = true;
        user.otp = null;
        user.otpExpiry = null;
        await user.save();

        console.log('EVENTICA DEBUG: Email verified successfully for:', email);

        res.status(200).json({
            success: true,
            message: 'Email verified successfully! You can now complete your Eventica registration.',
            isVerified: true,
            event: 'EVENTICA_EMAIL_VERIFIED_SUCCESS'
        });

    } catch (error) {
        console.error('EVENTICA Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during OTP verification',
            event: 'EVENTICA_SERVER_ERROR'
        });
    }
};

// Complete registration after OTP verification
export const registerUser = async (req, res) => {
    try {
        const { username, email, password, isEmailVerified } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide username, email, and password',
                event: 'EVENTICA_REGISTRATION_INCOMPLETE'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long',
                event: 'EVENTICA_INVALID_PASSWORD_LENGTH'
            });
        }

        // Check if email is verified
        if (!isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Please verify your email first',
                event: 'EVENTICA_EMAIL_NOT_VERIFIED'
            });
        }

        // Check if user exists and is verified
        const existingUser = await User.findOne({ email });
        if (!existingUser || !existingUser.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email not verified. Please verify your email first.',
                event: 'EVENTICA_EMAIL_VERIFICATION_REQUIRED'
            });
        }

        // Check if username is taken by another verified user
        const usernameExists = await User.findOne({ 
            username, 
            isEmailVerified: true,
            _id: { $ne: existingUser._id }
        });
        
        if (usernameExists) {
            return res.status(409).json({
                success: false,
                message: 'Username is already taken',
                event: 'EVENTICA_USERNAME_ALREADY_EXISTS'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update user with complete registration details
        existingUser.username = username;
        existingUser.password = hashedPassword;
        await existingUser.save();

        // Generate token
        const token = generateToken(existingUser._id);

        console.log('EVENTICA DEBUG: User registered successfully:', username);

        res.status(201).json({
            success: true,
            message: 'Welcome to Eventica! Your account has been created successfully.',
            token,
            user: {
                id: existingUser._id,
                username: existingUser.username,
                email: existingUser.email,
                isEmailVerified: existingUser.isEmailVerified
            },
            event: 'EVENTICA_REGISTRATION_SUCCESS'
        });

    } catch (error) {
        console.error('EVENTICA Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            event: 'EVENTICA_SERVER_ERROR'
        });
    }
};

// Login user
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password',
                event: 'EVENTICA_LOGIN_INCOMPLETE'
            });
        }

        // Find verified user
        const user = await User.findOne({ 
            email, 
            isEmailVerified: true 
        });
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password, or email not verified',
                event: 'EVENTICA_LOGIN_FAILED'
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
                event: 'EVENTICA_LOGIN_FAILED'
            });
        }

        // Generate token
        const token = generateToken(user._id);

        console.log('EVENTICA DEBUG: User logged in successfully:', user.username);

        res.status(200).json({
            success: true,
            message: `Welcome back to Eventica, ${user.username}!`,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                isEmailVerified: user.isEmailVerified
            },
            event: 'EVENTICA_LOGIN_SUCCESS'
        });

    } catch (error) {
        console.error('EVENTICA Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            event: 'EVENTICA_SERVER_ERROR'
        });
    }
};