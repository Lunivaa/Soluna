// testing the backend chatbot logic
import { vi, describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import express from 'express';
import request from 'supertest';
import chatbotRouter from '../../backend/routes/chatbot.js';

// mock the database
vi.mock('../../backend/db.js', () => ({
  db: {
    query: vi.fn().mockResolvedValue([[{ id: 1, name: 'Test User' }]]),
    execute: vi.fn().mockResolvedValue([[{ affectedRows: 1 }]])
  }
}));

vi.mock('groq-sdk');

describe('Chatbot Backend Route', () => {
  let app;
  const secret = 'test-secret';

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/chatbot', chatbotRouter);
    process.env.JWT_SECRET = secret;
    process.env.GROQ_API_KEY = 'test-key';
  });

  // check if it blocks users without tokens
  it('should return 401 if no token is provided', async () => {
    const response = await request(app).post('/api/chatbot').send({ messages: [] });
    expect(response.status).toBe(401);
  });

  // check if it catches bad words or crisis keywords
  it('should identify crisis keywords', async () => {
    const token = jwt.sign({ email: 'test@example.com' }, secret);
    const response = await request(app)
      .post('/api/chatbot')
      .set('Authorization', `Bearer ${token}`)
      .send({ 
        messages: [{ sender: 'user', text: 'I want to kill myself' }],
        chatId: null
      });

    expect(response.status).toBe(200);
    expect(response.body.choices[0].message.content).toContain('Nepal');
  });
});
