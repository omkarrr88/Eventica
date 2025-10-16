import express from "express";
import {
  addEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  addReview,
  getReviews
} from "../controllers/event.controller.js";

import { addEventToGoogleCalendar } from "../controllers/googleCalendar.js";

const eventRouter = express.Router();

/**
 * 🧾 Event Management Routes
 */
eventRouter.post("/add", addEvent);
eventRouter.delete("/delete/:id", deleteEvent);
eventRouter.get("/allevents", getAllEvents);
eventRouter.get("/:id", getEventById);

/**
 * 💬 Review Routes
 */
eventRouter.post("/:id/reviews", addReview);
eventRouter.get("/:id/reviews", getReviews);

/**
 * 📅 Google Calendar Integration
 * POST /api/events/google/add
 * Body: { summary, description, startDateTime, endDateTime, attendees }
 */
eventRouter.post("/google/add", async (req, res) => {
  try {
    // Check if user is logged in via Google
    if (!req.user || !req.user.accessToken) {
      return res.status(401).json({ message: "Not authenticated with Google" });
    }

    const { summary, description, startDateTime, endDateTime, attendees } = req.body;

    if (!summary || !startDateTime || !endDateTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const event = await addEventToGoogleCalendar(req.user.accessToken, {
      summary,
      description,
      startDateTime,
      endDateTime,
      attendees,
    });

    res.status(200).json({ message: "Event added successfully", event });
  } catch (err) {
    res.status(500).json({ message: "Failed to add event", error: err.message });
  }
});

export { eventRouter };
