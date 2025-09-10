import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const getProfile = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "No token provided." });
        }

        // FIXED: Proper token extraction with 
        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Invalid token format." });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        res.status(200).json({
            message: "Profile fetched successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                registeredEvents: user.registeredEvents,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error("Error during profile retrieval:", error);
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ error: "Invalid token." });
        }
        res.status(500).json({ error: "An error occurred while fetching the profile." });
    }
};

const editProfile = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "No token provided." });
        }

        // FIXED: Proper token extraction with 
        const token = authHeader.split(' ');
        if (!token) {
            return res.status(401).json({ error: "Invalid token format." });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const { username, email, password } = req.body;
        
        if (username) user.username = username;
        if (email) user.email = email;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        res.json({
            message: "Profile updated successfully.",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Error during profile update:", error);
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ error: "Invalid token." });
        }
        res.status(500).json({ error: "An error occurred while updating the profile." });
    }
};

const deleteProfile = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "No token provided." });
        }

        // FIXED: Proper token extraction with 
        const token = authHeader.split(' ');
        
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        await User.findByIdAndDelete(decoded.userId);
        res.json({ message: "Profile deleted successfully." });

    } catch (error) {
        console.error("Error during profile deletion:", error);
        res.status(500).json({ error: "An error occurred while deleting the profile." });
    }
};

export { getProfile, editProfile, deleteProfile };
