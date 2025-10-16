import express from "express";
import passport from "passport";
import { 
  loginUser, 
  registerUser, 
  sendOTP, 
  verifyOTP 
} from "../controllers/auth.controller.js";
import { addEventToGoogleCalendar } from "../controllers/googleCalendar.js";

export const authRouter = express.Router();

// ---------- OTP ROUTES ----------
authRouter.post("/send-otp", sendOTP);
authRouter.post("/verify-otp", verifyOTP);

// ---------- EMAIL AUTH ----------
authRouter.post("/signup", registerUser);
authRouter.post("/login", loginUser);

// ---------- GOOGLE OAUTH ----------
authRouter.get("/google", passport.authenticate("google"));

authRouter.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => res.send("Google Calendar Connected ✅")
);

// ---------- GOOGLE CALENDAR EVENT ----------
authRouter.post("/add-event", async (req, res) => {
  try {
    if (!req.user || !req.user.accessToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { summary, description, startDateTime, endDateTime, attendees } = req.body;

    const event = await addEventToGoogleCalendar(req.user.accessToken, {
      summary,
      description,
      startDateTime,
      endDateTime,
      attendees,
    });

    res.status(200).json({ message: "Event added successfully", event });
  } catch (err) {
    console.error("❌ Error adding Google Calendar event:", err);
    res.status(500).json({ message: "Failed to add event", error: err.message });
  }
});
