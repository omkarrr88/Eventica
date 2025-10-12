import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Load environment variables
dotenv.config();

// SECRET_KEY is required for JWT signing/verification
if (!process.env.SECRET_KEY) {
  console.error("❌ SECRET_KEY not found in environment variables");
  process.exit(1);
}

// Connect to MongoDB. If MONGO_URI is exactly "IN_MEMORY", use an in-memory MongoDB for local testing.
async function connectMongo() {
  try {
    if (process.env.MONGO_URI === "IN_MEMORY") {
      console.log("🧪 Starting in-memory MongoDB server...");
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
      console.log("✅ Connected to in-memory MongoDB");
      // Keep mongod alive by not stopping it; process exit will cleanup.
    } else {
      if (!process.env.MONGO_URI) {
        console.error("❌ MONGO_URI not found in environment variables");
        process.exit(1);
      }
      await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
      console.log("✅ MongoDB connected successfully");
    }
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

connectMongo();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(
  cors({
    origin: [
      "https://eventica.netlify.app",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5500"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Body parsers
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Serve frontend static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "../"); // adjust if frontend folder is elsewhere
app.use(express.static(frontendPath));
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Import routers with correct relative paths
import { authRouter } from "./routes/auth.routes.js";
import { eventRouter } from "./routes/event.routes.js";
import { profileRouter } from "./routes/profile.routes.js";

// Mount routers under /api prefix
app.use("/api/auth", authRouter);
app.use("/api/events", eventRouter);
app.use("/api/profile", profileRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "Server is running!",
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({
    message: "Internal server error"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
