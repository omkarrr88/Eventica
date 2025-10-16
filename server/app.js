import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { MongoMemoryServer } from "mongodb-memory-server";

// ---------- LOAD ENVIRONMENT VARIABLES ----------
dotenv.config(); // looks for .env in the same directory as app.js

// Debug logs to verify environment variables
console.log("🧩 Checking .env values...");
console.log("MONGO_URI:", JSON.stringify(process.env.MONGO_URI));
console.log("SECRET_KEY:", process.env.SECRET_KEY ? "✅ Found" : "❌ Missing");

if (!process.env.SECRET_KEY) {
  console.error("❌ SECRET_KEY not found in environment variables");
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI not found! Make sure .env is in /server/ and correctly formatted.");
  process.exit(1);
}

// ---------- FILE PATHS ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- MONGODB CONNECTION ----------
async function connectMongo() {
  try {
    let uri;

    if (process.env.MONGO_URI === "IN_MEMORY") {
      console.log("🧪 Starting in-memory MongoDB server...");
      const mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
    } else {
      uri = process.env.MONGO_URI.trim();
    }

    console.log("🔗 Connecting to MongoDB with URI:", JSON.stringify(uri));

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}
await connectMongo();

// ---------- EXPRESS APP SETUP ----------
const app = express();
const PORT = process.env.PORT || 3000;

// ---------- MIDDLEWARE ----------
app.use(
  cors({
    origin: [
      "https://eventica.netlify.app",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5500",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// ---------- SESSION + PASSPORT ----------
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ---------- GOOGLE OAUTH ----------
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
      scope: ["profile", "email", "https://www.googleapis.com/auth/calendar"],
    },
    (accessToken, refreshToken, profile, done) => {
      const user = { profile, accessToken, refreshToken };
      return done(null, user);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get("/auth/google", passport.authenticate("google"));
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    console.log("✅ Google user authenticated:", req.user);
    res.send("Google Calendar Connected ✅");
  }
);

// ---------- FRONTEND STATIC ----------
const frontendPath = path.join(__dirname, "../");
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ---------- IMPORT ROUTES ----------
import { authRouter } from "./routes/auth.routes.js";
import { profileRouter } from "./routes/profile.routes.js";
import { eventRouter } from "./routes/event.routes.js";

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/events", eventRouter);

// ---------- HEALTH CHECK ----------
app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "Eventica server is running!",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// ---------- 404 HANDLER ----------
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
  });
});

// ---------- ERROR HANDLER ----------
app.use((err, req, res, next) => {
  console.error("❌ EVENTICA Server Error:", err);
  res.status(500).json({
    message: "Internal server error",
  });
});

// ---------- START SERVER ----------
app.listen(PORT, () => {
  console.log(`🚀 EVENTICA Server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
});
