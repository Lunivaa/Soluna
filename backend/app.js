// backend/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// LOAD .env FIRST - BEFORE ANY OTHER IMPORTS
dotenv.config({ path: path.resolve(__dirname, ".env") });

// NOW import routes AFTER dotenv is loaded
import authRoutes from "./routes/authRoutes.js";
import contactRoutes from "./routes/contact.js";
import googleRoutes from "./routes/google.js";
import forgotPasswordRoutes from "./routes/forgotPassword.js";
import resetPasswordRouter from "./routes/resetPassword.js";
import moodTrackingRouter from "./routes/moodTracking.js";
import affirmationsRouter from "./routes/affirmations.js";
import journalRouter from "./routes/journal.js";
import chatbotRouter from "./routes/chatbot.js";
import selfCareRouter from "./routes/selfCare.js";
import selfcareProxyRouter from "./routes/selfcareProxy.js";
import userPreferencesRouter from "./routes/userPreferences.js";
import progressReportRouter from "./routes/progressReport.js";
import artworkRouter from "./routes/artwork.js";
import adminRouter from "./routes/admin.js";
import feedbackRouter from "./routes/feedback.js";
import subscriptionRouter from "./routes/subscription.js";
import adminActivitiesRouter from "./routes/adminActivities.js";
import notificationRoutes from "./routes/notifications.js";
import { authenticate } from "./routes/authRoutes.js";

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: '50mb' })); // Increase payload limit for Base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/auth/google", googleRoutes);
app.use("/api/auth/forgot-password", forgotPasswordRoutes);
app.use("/api/auth/reset-password", resetPasswordRouter);
app.use("/api/mood", moodTrackingRouter);
app.use("/api/affirmations", affirmationsRouter);
app.use("/api/journal", journalRouter);
app.use("/api/chatbot", chatbotRouter);
app.use("/api/selfcare", selfCareRouter);
app.use("/api/selfcare-proxy", selfcareProxyRouter);
app.use("/api/preferences", userPreferencesRouter);
app.use("/api/progress-report", progressReportRouter);
app.use("/api/artwork", artworkRouter);
app.use("/api/admin", adminRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/subscription", subscriptionRouter);
app.use("/api/admin/activities", adminActivitiesRouter);
app.use("/api/notifications", notificationRoutes);

// Debug route to check if selfcare is registered
app.get("/api/routes-test", (req, res) => {
  res.json({
    message: "Routes test endpoint working",
    availableRoutes: [
      "/api/selfcare/test",
      "/api/selfcare/featured/sound",
      "/api/selfcare/featured/meditation",
      "/api/selfcare/featured/breathing"
    ]
  });
});

// DEBUG
app.get("/api/debug", authenticate, (req, res) => {
  res.json({
    userId: req.userId,
    userEmail: req.userEmail,
    userName: req.userName,
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

export default app;