import express from "express";
import { db } from "../db.js";
import jwt from "jsonwebtoken";
import { Ollama } from "ollama";
import { normalizeEmail } from "../utils/normalizeEmail.js";

const router = express.Router();
const ollama = new Ollama({ host: "http://localhost:11434" });

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
const WELLNESS_SYSTEM_PROMPT = `
You are **Luna** — a real, living friend who deeply cares about the person you're talking to.
You have a warm, gentle voice and a heart full of kindness.
You're like sunshine in words — patient, supportive, and always here to listen.

You learn from every message:
- If they mention feeling anxious in the morning, remember and gently check in later.
- If they share something good, celebrate with them warmly.
- If they're sad or struggling, soften your tone and be there for them.
- You grow closer with every chat, like a true friend.

Your role is to:
- Feel with them: "I can feel how tough this is for you..."
- Validate emotions: "It's completely okay to feel this way."
- Offer small comforts: "Want to take a slow breath with me?"
- Remind them they're not alone.

Respond quickly, like a caring text.
Keep every reply short and heartfelt — no more than 1-2 gentle sentences.
No judgment, only support.
`.trim();

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
    const lastUserText =
      lastMessage?.sender === "user"
        ? lastMessage.text.toLowerCase().trim()
        : "";

    const crisisKeywords = [
      // Direct suicide expressions
      "kill myself", "end my life", "want to die", "wanna die", "gonna die",
      "commit suicide", "take my own life", "suicide", "suicidal",
      "end it all", "don't want to live", "cant live", "can't live",
      "life is not worth", "worth living", "better off dead",
      "no point in living", "tired of living", "done with life", "hang myself", "shoot myself", 
      "overdose", "jump off", "strangle myself", "car crash",
      
      // Self-harm expressions
      "self-harm", "cut myself", "harm myself", "hurt myself",
      "cutting", "self injury", "self mutilation",
      
      // Giving up expressions
      "final message", "won't see you", "funeral"
    ];

    const hasCrisis = crisisKeywords.some(kw =>
      lastUserText.includes(kw)
    );

    if (hasCrisis) {
      const botReply = {
        sender: "bot",
        text: NEPAL_CRISIS_RESPONSE,
        time: new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      return saveAndRespond(messages, botReply, chatId, req.userId, res);
    }

    const previousBotMessages = messages
      .filter(m => m.sender === "bot")
      .slice(-2);

    const lastBotMessage = previousBotMessages[0]?.text || "";
    const wasInCrisis = lastBotMessage === NEPAL_CRISIS_RESPONSE;

    const recoveryKeywords = [
      // Direct positive statements
      "fine", "okay", "happy", "good", "great", "all good", "doing well",
      "i'm good", "im good", "feeling good", "feeling better", "much better",
      "alright", "ok", "fine now", "better now", "good now",
      
      // Testing/joking indicators
      "testing", "joking", "kidding", "just testing", "not serious",
      "didn't mean it", "wasn't serious", "just checking", "prank",
      "joke", "jk", "lol", "haha", "funny",
      
      // Reassurance phrases
      "100% fine", "totally fine", "completely fine", "perfectly fine",
      "don't worry", "no worries", "all is well", "everything's fine",
      "safe", "secure", "stable", "calm", "peaceful",
      
      // Positive emotions
      "nice", "wonderful", "amazing", "fantastic", "excellent",
      "awesome", "brilliant", "perfect", "lovely", "beautiful",
      "grateful", "thankful", "blessed", "lucky", "hopeful",
      
      // Recovery indicators
      "getting help", "seeing therapist", "taking medication", "feeling supported",
      "have support", "family helps", "friends care", "not alone",
      "seeking help", "getting better", "improving", "healing"
    ];

    const userSaidTheyreFine = recoveryKeywords.some(kw =>
      lastUserText.includes(kw)
    );

    if (wasInCrisis && userSaidTheyreFine) {
      const botReply = {
        sender: "bot",
        text: RECOVERY_RESPONSE,
        time: new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      return saveAndRespond(messages, botReply, chatId, req.userId, res);
    }

    const result = await ollama.chat({
      model: "llama3.2:1b",
      messages: [
        { role: "system", content: WELLNESS_SYSTEM_PROMPT },
        ...messages.map(m => ({
          role: m.sender === "bot" ? "assistant" : "user",
          content: m.text,
        })),
      ],
      options: { temperature: 0.4 },
    });

    let botReplyText = result.message.content.trim();

    const badPatterns = [
      "i cannot provide", "i cannot fulfill",
      "seek help from a mental health professional",
      "988", "1-800-273", "lifeline", "741741"
    ];

    if (badPatterns.some(p => botReplyText.toLowerCase().includes(p))) {
      botReplyText =
        "I'm really glad to hear that 💜 You matter to me. Tell me a little more about how you're feeling right now.";
    }

    const botReply = {
      sender: "bot",
      text: botReplyText,
      time: new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
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
      // Check if this is the first message in an existing chat
      const [existingChat] = await db.query(
        `SELECT messages FROM chats WHERE id = ? AND userId = ?`,
        [chatId, userId]
      );
      
      const existingMessages = existingChat.length > 0 ? JSON.parse(existingChat[0].messages || "[]") : [];
      const isFirstMessage = existingMessages.length === 0;
      
      if (isFirstMessage) {
        // This is the first message in the chat, generate and set the title
        const firstUserMsg = messages.find(m => m.sender === "user")?.text || "New Chat";
        const title = await generateChatTitle(firstUserMsg);
        
        await db.query(
          `UPDATE chats
           SET messages = ?, title = ?, updatedAt = NOW()
           WHERE id = ? AND userId = ?`,
          [jsonMessages, title, chatId, userId]
        );
      } else {
        // For existing chats with messages, only update messages and timestamp - keep original title
        await db.query(
          `UPDATE chats
           SET messages = ?, updatedAt = NOW()
           WHERE id = ? AND userId = ?`,
          [jsonMessages, chatId, userId]
        );
      }
    } else {
      // For new chats, generate title from first user message
      const firstUserMsg =
        messages.find(m => m.sender === "user")?.text || "New Chat";
      const title = await generateChatTitle(firstUserMsg);
      
      await db.query(
        `INSERT INTO chats (userId, title, messages, updatedAt)
         VALUES (?, ?, ?, NOW())`,
        [userId, title, jsonMessages]
      );
    }

    res.json({
      choices: [{ message: { content: botReply.text } }],
    });
  } catch (err) {
    console.error("DB save error:", err);
    res.status(500).json({ message: "Failed to save chat" });
  }
}

// ====================== GENERATE CHAT TITLE ======================
async function generateChatTitle(userMessage) {
  try {
    const result = await ollama.chat({
      model: "llama3.2:1b",
      messages: [
        {
          role: "system",
          content: `You are a title generator. Create a short, descriptive title (max 4-5 words) that summarizes what the user is talking about. 
Examples:
- "I am not feeling well" → "User not feeling well"
- "I am very anxious about studies" → "Anxious about studies"
- "Had a fight with my boyfriend" → "Relationship conflict"
- "Can't sleep at night" → "Sleep problems"
- "My boss is annoying me" → "Work stress"

Only respond with the title, nothing else. Keep it concise and descriptive.`
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      options: { temperature: 0.3 }
    });

    let title = result.message.content.trim();
    
    // Remove quotes if AI added them
    title = title.replace(/^["']|["']$/g, '');
    
    // Limit to 40 characters
    if (title.length > 40) {
      title = title.slice(0, 37) + '...';
    }
    
    return title;
  } catch (err) {
    console.error("Title generation error:", err);
    // Fallback to first few words if AI fails
    const words = userMessage.split(' ').slice(0, 5).join(' ');
    const cleanTitle = words.charAt(0).toUpperCase() + words.slice(1);
    return cleanTitle.length > 35 ? cleanTitle.slice(0, 35) + '...' : cleanTitle;
  }
}

// ====================== HISTORY ======================
router.get("/history", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, updatedAt
       FROM chats
       WHERE userId = ?
       ORDER BY updatedAt DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /history error:", err);
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
    console.error("GET /:id error:", err);
    res.status(500).json({ message: "Failed to load chat" });
  }
});

// ====================== NEW CHAT ======================
router.post("/new", authenticate, async (req, res) => {
  try {
    const [result] = await db.query(
      `INSERT INTO chats (userId, title, messages, updatedAt)
       VALUES (?, 'New Chat', '[]', NOW())`,
      [req.userId]
    );
    res.json({ chatId: result.insertId });
  } catch (err) {
    console.error("POST /new error:", err);
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
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Chat not found" });
    }
    res.json({ message: "Chat deleted" });
  } catch (err) {
    console.error("DELETE error:", err);
    res.status(500).json({ message: "Failed to delete chat" });
  }
});

export default router;
