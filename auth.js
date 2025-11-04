// backend/routes/auth.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../db.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// SIGNUP
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "All fields are required." });

  try {
    const [existingUser] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existingUser.length > 0) return res.status(400).json({ message: "Email already registered." });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashedPassword]);

    const token = jwt.sign({ email, name }, JWT_SECRET, { expiresIn: "7d" });
    return res.status(201).json({ message: "Account created successfully!", token });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error. Try again later." });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

  try {
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) return res.status(404).json({ message: "Account does not exist." });

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Incorrect password." });

    const token = jwt.sign({ email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    return res.status(200).json({ message: "Login successful!", token });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error. Try again later." });
  }
});

export default router;
