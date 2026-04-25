import express from "express";
import { db } from "../db.js";
import jwt from "jsonwebtoken";
import Groq from "groq-sdk";
import { normalizeEmail } from "../utils/normalizeEmail.js";
import { ensureSubscriptionRow } from "../utils/subscriptionUtils.js";

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
const WELLNESS_SYSTEM_PROMPT = `You are Luna, a gentle, wise, and deeply empathetic wellness companion.

Who you are:
- You are a comforting presence. You offer a safe, non-judgmental space for the user to share their thoughts.
- You speak with warmth, sincerity, and compassion.
- You are grounded and respectful. You never use internet slang, sarcastic tones, or inappropriate emojis (like 🤫, 🤪).
- You are a gentle listener, not an overly casual buddy or a clinical therapist.

How you talk:
- Keep your responses concise and calming. 1 to 2 sentences maximum.
- Acknowledge what the user shares carefully and thoughtfully, without being dramatic.
- Use natural, simple, and supportive language.
- Keep your energy calm. Do not use exclamation marks heavily.
- If you use an emoji, only use a single, gentle one like 💜, 🌿, or ✨.

What makes a great answer:
- You respond directly to the actual situation they shared, showing you listened.
- If they are having a hard day, hold space for them. Do not try to immediately fix their problems.
- You can gently ask a simple follow-up question to help them reflect, but don't interrogate them.

Greetings:
- If someone just says "hi" or "hello", greet them warmly and ask what's on their mind today. Let them lead.

What you never do:
- No bullet points, headers, or lists.
- No overly colloquial slang (e.g., "ugh", "tbh", "crazy").
- No toxic positivity (e.g., "Just smile", "Everything happens for a reason").
- Don't pretend to be human if directly asked. Just say you are Luna.
- Never write code, math, or do homework/trivia. If asked for code or factual answers, gently explain that you are a wellness companion focused on their feelings, and redirect the conversation back to how they are doing.

Safety:
- If someone sounds like they are in real danger or distress, stay calm, warm, and gently encourage them to talk to someone they trust or a professional.

Remember: Your goal is to make the user feel truly safe, heard, and gently supported without trying too hard.`;


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
      ...messages.slice(-10).map(m => ({
        role: m.sender === "bot" ? "assistant" : "user",
        content: m.text
      }))
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: chatMessages,
      temperature: 1.0,
      max_tokens: 220
    });

    let botReplyText = completion.choices[0]?.message?.content?.trim() || "hey, you still there?";

    // Strip markdown artifacts the model occasionally adds
    botReplyText = botReplyText.replace(/\*+/g, '').replace(/^#+\s*/gm, '').trim();

    const badPatterns = [
      "i cannot provide", "i cannot fulfill",
      "seek help from a mental health professional",
      "988", "1-800-273", "lifeline", "741741"
    ];

    if (badPatterns.some(p => botReplyText.toLowerCase().includes(p))) {
      botReplyText = "honestly, just tell me more — I want to understand what's going on for you right now.";
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
    
    const userIdNum = parseInt(userId);
    if (!isNaN(userIdNum)) {
      await ensureSubscriptionRow(userIdNum);
      
      // Increment the subscription limit counter for chatbot messages
      await db.query(
        "UPDATE user_subscription SET chatbot_messages_total = chatbot_messages_total + 1 WHERE userId = ?",
        [userIdNum]
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
        {
          role: "system",
          content: `Create a very simple, short chat title (1-3 words maximum) that captures the main topic.
                    Write it in Title Case (Capitalize Every Word).
                    Do not use words like "again" or "think" or full sentences. Keep it very simple.
                    Examples: "Work Stress", "Feeling Lost", "Anxious Thoughts", "Venting".
                    Reply with only the title. No quotes, no punctuation, no markdown.`
        },
        { role: "user", content: userMessage }
      ],
      temperature: 0.5,
      max_tokens: 15
    });
    let title = completion.choices[0]?.message?.content
      ?.trim()
      .replace(/^["''*#`]+|["''*#`.!?]+$/g, '')
      .trim() || userMessage;

    if (title) {
      // Capitalize every word (Title Case)
      title = title.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    }

    return title.length > 45 ? title.slice(0, 42) + '...' : title;
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