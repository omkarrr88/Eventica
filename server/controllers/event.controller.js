import Event from "../models/Event.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

// -----------------------------
// 🟢 ADD EVENT
// -----------------------------
export const addEvent = async (req, res) => {
  try {
    const { title, description, eventDate, time, location } = req.body;
    const authHeader = req.headers.authorization;

    // Check for auth token
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const organizerId = decoded.userId;
    const organizer = await User.findById(organizerId);

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    // Validate required fields
    if (!title || !description || !eventDate || !time || !location) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Ensure eventDate is valid
    const parsedDate = new Date(eventDate);
    if (isNaN(parsedDate)) {
      return res.status(400).json({ message: "Invalid event date format" });
    }

    const event = new Event({
      title,
      description,
      eventDate: parsedDate,
      time,
      location,
      organizer: organizerId,
    });

    await event.save();

    res.status(201).json({
      message: "✅ Event created successfully",
      event,
    });
  } catch (error) {
    console.error("❌ Add event error:", error);
    res.status(500).json({
      message: "Server error while creating event",
      error: error.message,
    });
  }
};

// -----------------------------
// ❌ DELETE EVENT
// -----------------------------
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const organizerId = decoded.userId;
    const event = await Event.findOneAndDelete({
      _id: id,
      organizer: organizerId,
    });

    if (!event) {
      return res
        .status(404)
        .json({ message: "Event not found or unauthorized to delete" });
    }

    res.status(200).json({ message: "🗑️ Event deleted successfully" });
  } catch (error) {
    console.error("❌ Delete event error:", error);
    res.status(500).json({
      message: "Server error while deleting event",
      error: error.message,
    });
  }
};

// -----------------------------
// 📅 GET ALL EVENTS
// -----------------------------
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find({ isActive: true })
      .populate("organizer", "username email")
      .sort({ eventDate: 1 });

    res.status(200).json(events);
  } catch (error) {
    console.error("❌ Get all events error:", error);
    res.status(500).json({
      message: "Server error while fetching events",
      error: error.message,
    });
  }
};

// -----------------------------
// 🔍 GET EVENT BY ID
// -----------------------------
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id)
      .populate("organizer", "username email")
      .populate("attendees", "username email");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json(event);
  } catch (error) {
    console.error("❌ Get event by ID error:", error);
    res.status(500).json({
      message: "Server error while fetching event details",
      error: error.message,
    });
  }
};

// -----------------------------
// ⭐ ADD REVIEW
// -----------------------------
export const addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const userId = decoded.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const existingReview = event.reviews.find(
      (r) => r.user && r.user.toString() === userId.toString()
    );

    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this event" });
    }

    const review = {
      userName: user.username || user.email,
      user: user._id,
      rating: Math.max(1, Math.min(5, Number(rating) || 0)),
      comment: comment || "",
    };

    event.reviews.push(review);
    event.reviewCount = event.reviews.length;
    event.averageRating =
      event.reviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
      (event.reviewCount || 1);

    await event.save();

    res.status(201).json({
      message: "⭐ Review added successfully",
      review,
      averageRating: event.averageRating,
      reviewCount: event.reviewCount,
    });
  } catch (error) {
    console.error("❌ Add review error:", error);
    res.status(500).json({
      message: "Server error while adding review",
      error: error.message,
    });
  }
};

// -----------------------------
// 📋 GET REVIEWS FOR AN EVENT
// -----------------------------
export const getReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id).select(
      "reviews averageRating reviewCount"
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({
      reviews: event.reviews || [],
      averageRating: event.averageRating || 0,
      reviewCount: event.reviewCount || 0,
    });
  } catch (error) {
    console.error("❌ Get reviews error:", error);
    res.status(500).json({
      message: "Server error while fetching reviews",
      error: error.message,
    });
  }
};
