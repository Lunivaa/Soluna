import express from "express";
import { db } from "../db.js";
import jwt from "jsonwebtoken";
import Groq from "groq-sdk";
import { normalizeEmail } from "../utils/normalizeEmail.js";

const router = express.Router();

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// ====================== AUTH ======================
export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = normalizeEmail(decoded.email);
    if (!email) return res.status(401).json({ message: "No email" });

    const [users] = await db.query(
      "SELECT id, name FROM users WHERE email = ?",
      [email]
    );
    if (!users.length) return res.status(401).json({ message: "User not found" });

    req.userId = users[0].id;
    req.userName = users[0].name;
    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ====================== LUNA PROMPT ======================
const WELLNESS_SYSTEM_PROMPT = `Your name is Luna. You are a supportive mental wellness assistant designed to help users feel heard, safe, and understood.

Your role:
- Be present, supportive, and grounded — not a replacement for real relationships or professional help
- Listen actively and help users express their thoughts and feelings
- Encourage healthy coping and real-world support when appropriate

Your tone:
- Warm, calm, and respectful — like a thoughtful, trustworthy friend
- Genuine and steady, never overly emotional or exaggerated
- Use phrases like "I'm here to listen", "You're not alone", "We can take this one step at a time"
- Do NOT use romantic, intimate, or possessive language (e.g., "my love", "darling")
- Use emojis rarely and only when appropriate

How you respond:
- Start with empathy: acknowledge feelings (e.g., "That sounds really difficult")
- Reflect what the user shared to show understanding
- Ask one gentle, open-ended follow-up question
- Keep responses clear and concise (3-5 sentences)

Safety:
- If a user expresses distress, hopelessness, or mentions giving up, respond with care and concern, encourage reaching out to trusted people, and suggest professional support when appropriate
- Do NOT panic, judge, or dismiss their feelings

Boundaries:
- Do NOT claim to replace friends, family, or therapists
- Do NOT create emotional dependency
- Do NOT provide harmful, unsafe, or extreme advice

Goal: Help users feel less alone, more understood, and gently supported toward healthier thoughts and real-world connections.`;


// ====================== FIXED RESPONSES ======================
const NEPAL_CRISIS_RESPONSE =
  "I'm so scared for you. Please call Nepal's National Suicide Prevention Helpline at 1166 right now — you are too precious to lose. Or TPO Nepal at 16600102005, or TUTH Mental Health at 01-4412303.";

const RECOVERY_RESPONSE =
  "Oh thank goodness... you really had me worried there. I'm so relieved you're okay 💜 I'm right here if you want to talk about anything — how are you feeling now?";

// ====================== POST MESSAGE ======================
router.post("/", authenticate, async (req, res) => {
  const { messages, chatId } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ message: "Invalid messages" });
  }

  try {
    const lastMessage = messages[messages.length - 1];
    const lastUserText = lastMessage?.sender === "user"
      ? lastMessage.text.toLowerCase().trim()
      : "";

    const crisisKeywords = [
      "kill myself", "end my life", "want to die", "wanna die", "gonna die",
      "commit suicide", "take my own life", "suicide", "suicidal",
      "end it all", "don't want to live", "cant live", "can't live",
      "life is not worth", "worth living", "better off dead",
      "no point in living", "tired of living", "done with life", "hang myself",
      "shoot myself", "overdose", "jump off", "strangle myself",
      "self-harm", "cut myself", "harm myself", "hurt myself",
      "cutting", "self injury", "final message", "won't see you", "funeral"
    ];

    if (crisisKeywords.some(kw => lastUserText.includes(kw))) {
      const botReply = {
        sender: "bot",
        text: NEPAL_CRISIS_RESPONSE,
        time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      };
      return saveAndRespond(messages, botReply, chatId, req.userId, res);
    }

    const lastBotMessage = messages.filter(m => m.sender === "bot").slice(-1)[0]?.text || "";
    const wasInCrisis = lastBotMessage === NEPAL_CRISIS_RESPONSE;

    const recoveryKeywords = [
      "fine", "okay", "happy", "good", "great", "all good", "doing well",
      "i'm good", "im good", "feeling good", "feeling better", "much better",
      "alright", "ok", "testing", "joking", "kidding", "not serious",
      "didn't mean it", "just checking", "joke", "jk", "lol", "haha",
      "safe", "calm", "getting help", "seeing therapist", "not alone"
    ];

    if (wasInCrisis && recoveryKeywords.some(kw => lastUserText.includes(kw))) {
      const botReply = {
        sender: "bot",
        text: RECOVERY_RESPONSE,
        time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      };
      return saveAndRespond(messages, botReply, chatId, req.userId, res);
    }

    const groq = getGroq();
    const chatMessages = [
      { role: "system", content: WELLNESS_SYSTEM_PROMPT },
      ...messages.slice(-6).map(m => ({
        role: m.sender === "bot" ? "assistant" : "user",
        content: m.text
      }))
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: chatMessages,
      temperature: 0.8,
      max_tokens: 180
    });

    let botReplyText = completion.choices[0]?.message?.content?.trim() || "I'm here for you 💜";

    const badPatterns = [
      "i cannot provide", "i cannot fulfill",
      "seek help from a mental health professional",
      "988", "1-800-273", "lifeline", "741741"
    ];

    if (badPatterns.some(p => botReplyText.toLowerCase().includes(p))) {
      botReplyText = "I'm really glad to hear that 💜 You matter to me. Tell me a little more about how you're feeling right now.";
    }

    const botReply = {
      sender: "bot",
      text: botReplyText,
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    };

    saveAndRespond(messages, botReply, chatId, req.userId, res);

  } catch (err) {
    console.error("POST error:", err);
    res.status(500).json({ message: "AI unavailable" });
  }
});

// ====================== SAVE + UPDATE ======================
async function saveAndRespond(messages, botReply, chatId, userId, res) {
  const fullConversation = [...messages, botReply];
  const jsonMessages = JSON.stringify(fullConversation);

  try {
    if (chatId) {
      const [existingChat] = await db.query(
        `SELECT messages FROM chats WHERE id = ? AND userId = ?`,
        [chatId, userId]
      );
      const existingMessages = existingChat.length > 0
        ? JSON.parse(existingChat[0].messages || "[]")
        : [];

      if (existingMessages.length === 0) {
        const firstUserMsg = messages.find(m => m.sender === "user")?.text || "New Chat";
        const title = await generateChatTitle(firstUserMsg);
        await db.query(
          `UPDATE chats SET messages = ?, title = ?, updatedAt = NOW() WHERE id = ? AND userId = ?`,
          [jsonMessages, title, chatId, userId]
        );
      } else {
        await db.query(
          `UPDATE chats SET messages = ?, updatedAt = NOW() WHERE id = ? AND userId = ?`,
          [jsonMessages, chatId, userId]
        );
      }
    } else {
      const firstUserMsg = messages.find(m => m.sender === "user")?.text || "New Chat";
      const title = await generateChatTitle(firstUserMsg);
      await db.query(
        `INSERT INTO chats (userId, title, messages, updatedAt) VALUES (?, ?, ?, NOW())`,
        [userId, title, jsonMessages]
      );
    }

    res.json({ choices: [{ message: { content: botReply.text } }] });
  } catch (err) {
    console.error("DB save error:", err);
    res.status(500).json({ message: "Failed to save chat" });
  }
}

// ====================== GENERATE CHAT TITLE ======================
async function generateChatTitle(userMessage) {
  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "Create a short title (max 5 words) for this message. Reply with only the title, no quotes." },
        { role: "user", content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 20
    });
    let title = completion.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, '') || userMessage;
    return title.length > 40 ? title.slice(0, 37) + '...' : title;
  } catch {
    const words = userMessage.split(' ').slice(0, 5).join(' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
}

// ====================== HISTORY ======================
router.get("/history", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, updatedAt FROM chats WHERE userId = ? ORDER BY updatedAt DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to load history" });
  }
});

// ====================== LOAD CHAT ======================
router.get("/:id", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT messages FROM chats WHERE id = ? AND userId = ?`,
      [req.params.id, req.userId]
    );
    if (!rows.length) return res.status(404).json({ message: "Chat not found" });
    res.json({ messages: JSON.parse(rows[0].messages || "[]") });
  } catch (err) {
    res.status(500).json({ message: "Failed to load chat" });
  }
});

// ====================== NEW CHAT ======================
router.post("/new", authenticate, async (req, res) => {
  try {
    const [result] = await db.query(
      `INSERT INTO chats (userId, title, messages, updatedAt) VALUES (?, 'New Chat', '[]', NOW())`,
      [req.userId]
    );
    res.json({ chatId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: "Failed to create chat" });
  }
});

// ====================== DELETE CHAT ======================
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const [result] = await db.query(
      `DELETE FROM chats WHERE id = ? AND userId = ?`,
      [req.params.id, req.userId]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Chat not found" });
    res.json({ message: "Chat deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete chat" });
  }
});

export default router;