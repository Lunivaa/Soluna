import express from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import axios from "axios"; // For making HTTP requests

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // Initialize Google OAuth client with client ID

// Route for Google login
router.post("/", async (req, res) => {
  try {
    const { token } = req.body; // Extract Google OAuth token from request body
    if (!token) return res.status(400).json({ message: "No token provided" }); 

    // Get user info from Google using the token
    const response = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const { sub, email } = response.data;

    // Create JWT token for our app with user ID and email
    const jwtToken = jwt.sign({ id: sub, email }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // Send JWT token and success message to client
    res.json({ token: jwtToken, message: "Successfully Logged In" });
  } catch (err) {
    console.error(err);
    // Send error response if Google authentication fails
    res.status(401).json({ message: "Google authentication failed.", error: err.message });
  }
});

export default router;