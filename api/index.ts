import express from "express";
import cors from "cors";
import helmet from "helmet";
import { VercelRequest, VercelResponse } from "@vercel/node";

// Simplified serverless handler - disable complex features for now
const initDB = async () => {
  console.log("Database initialization skipped for serverless deployment");
};

// Create Express app
const app = express();

// Get CORS origins for production
const getAllowedOrigins = () => {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(",");
  }

  // Default allowed origins for development and production
  return [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:4200",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
    "https://*.vercel.app",
    "https://intellimeet.vercel.app",
  ];
};

// Middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins();

      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      // Check if origin matches allowed origins (including wildcards)
      const isAllowed = allowedOrigins.some((allowedOrigin) => {
        if (allowedOrigin.includes("*")) {
          const pattern = allowedOrigin.replace(/\*/g, ".*");
          return new RegExp(pattern).test(origin);
        }
        return allowedOrigin === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Basic routes for deployment test
app.get("/api/test", (req, res) => {
  res.json({
    message: "IntelliMeet API is running!",
    timestamp: new Date().toISOString(),
    environment: "serverless",
  });
});

// Placeholder routes - will be implemented progressively
app.post("/api/rooms", (req, res) => {
  res.json({ error: "Feature temporarily disabled for deployment" });
});

app.get("/api/rooms/:id", (req, res) => {
  res.json({ error: "Feature temporarily disabled for deployment" });
});

app.post("/api/rooms/join", (req, res) => {
  res.json({ error: "Feature temporarily disabled for deployment" });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    message: "IntelliMeet API Health Check",
  });
});

// Basic error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// Export the handler for Vercel
export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Initialize database on first request
    await initDB();

    // Handle the request
    return app(req, res);
  } catch (error) {
    console.error("Serverless function error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
