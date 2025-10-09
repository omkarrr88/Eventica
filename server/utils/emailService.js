import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Create email transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Generate 6-digit OTP
export const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

// Send OTP email
export const sendOTPEmail = async (email, otp) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: {
                name: 'Eventica',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: 'Email Verification - Eventica',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #5e72e4; margin: 0;">Eventica</h1>
                        <p style="color: #666; margin: 5px 0;">Event Management Platform</p>
                    </div>
                    
                    <h2 style="color: #333; text-align: center;">Email Verification Required</h2>
                    
                    <p style="color: #666; line-height: 1.6;">
                        Hello! Thank you for signing up with Eventica. To complete your registration, please verify your email address using the OTP below:
                    </p>
                    
                    <div style="background-color: #f8f9fe; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Your verification code is:</p>
                        <h1 style="color: #5e72e4; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold;">${otp}</h1>
                    </div>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="color: #856404; margin: 0; font-size: 14px;">
                            <strong>Important:</strong> This OTP will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes. Please use it promptly to verify your email.
                        </p>
                    </div>
                    
                    <p style="color: #666; line-height: 1.6;">
                        If you didn't request this verification, please ignore this email. Your account will not be created without verification.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    
                    <div style="text-align: center; color: #999; font-size: 12px;">
                        <p>This is an automated message from Eventica. Please do not reply to this email.</p>
                        <p>© ${new Date().getFullYear()} Eventica. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('OTP email sent successfully to:', email);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw new Error('Failed to send verification email. Please try again.');
    }
};

// Verify email configuration
export const verifyEmailConfig = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('✅ Email service configured successfully');
        return true;
    } catch (error) {
        console.error('❌ Email service configuration error:', error);
        return false;
    }
};