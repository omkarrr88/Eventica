import Event from '../models/Event.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const addEvent = async (req, res) => {
    try {
        const { title, description, eventDate, time, location } = req.body;
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ error: "No token provided." });
        }

        // FIXED: Proper token extraction with 
        const token = authHeader.split(" ")[1];
        let decoded;
        
        try {
            decoded = jwt.verify(token, process.env.SECRET_KEY);
        } catch (err) {
            return res.status(401).json({ error: "Invalid or expired token." });
        }

        const organizerId = decoded.userId;
        const organizer = await User.findById(organizerId);
        
        if (!organizer) {
            return res.status(404).json({ error: "Organizer not found." });
        }

        if (!title || !description || !eventDate || !time || !location) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const event = new Event({
            title,
            description,
            eventDate: new Date(eventDate),
            time,
            location,
            organizer: organizerId
        });
        
        await event.save();
        res.status(201).json({ message: "Event created successfully.", event });
        
    } catch (error) {
        console.error("Add event error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ error: "No token provided." });
        }

        // FIXED: Proper token extraction with 
        const token = authHeader.split(" ");
        let decoded;
        
        try {
            decoded = jwt.verify(token, process.env.SECRET_KEY);
        } catch (err) {
            return res.status(401).json({ error: "Invalid or expired token." });
        }

        const organizerId = decoded.userId;
        const event = await Event.findOneAndDelete({ _id: id, organizer: organizerId });
        
        if (!event) {
            return res.status(404).json({ message: "Event not found or unauthorized." });
        }

        res.status(200).json({ message: "Event deleted successfully." });
        
    } catch (error) {
        console.error("Delete event error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const getAllEvents = async (req, res) => {
    try {
        const events = await Event.find({ isActive: true })
            .populate("organizer", "username email")
            .sort({ eventDate: 1 });
        res.status(200).json(events);
    } catch (error) {
        console.error("Get all events error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const getEventById = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await Event.findById(id)
            .populate("organizer", "username email")
            .populate("attendees", "username email");
            
        if (!event) {
            return res.status(404).json({ message: "Event not found." });
        }

        res.status(200).json(event);
    } catch (error) {
        console.error("Get event by ID error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

export { addEvent, deleteEvent, getAllEvents, getEventById };
