// backend/routes/google.js
import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { db } from "../db.js";
import { normalizeEmail } from "../utils/normalizeEmail.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { token, intent } = req.body;
    if (!token) return res.status(400).json({ message: "No token" });

    const { data } = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { sub: googleId, email, name, picture } = data;
    const normEmail = normalizeEmail(email);

    const [rows] = await db.query("SELECT id, name, avatar FROM users WHERE email = ?", [normEmail]);
    const userExists = rows.length > 0;

    if (intent === "signup") {
      if (userExists) return res.status(409).json({ message: "Email already registered." });

      await db.query(
        "INSERT INTO users (name, email, googleId, avatar) VALUES (?, ?, ?, ?)",
        [name || "User", normEmail, googleId, picture]
      );
      const [newUser] = await db.query("SELECT id, name, avatar FROM users WHERE email = ?", [normEmail]);

      const appToken = jwt.sign(
        { id: newUser[0].id, email: normEmail, name: newUser[0].name },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.json({ token: appToken, message: "Account created!" });
    }

    if (intent === "login") {
      if (!userExists) return res.status(404).json({ message: "No account. Sign up first." });

      const user = rows[0];
      const appToken = jwt.sign(
        { id: user.id, email: normEmail, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.json({ token: appToken, message: "Logged in!" });
    }
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Invalid token" });
  }
});

export default router;