import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { db } from './db/index.js';
import { authService } from './services/authService.js';
import { researchService } from './services/researchService.js';
import { portfolioService } from './services/portfolioService.js';
import { aiChatService } from './services/aiChatService.js';
import { aiRiskService } from './services/aiRiskService.js';
import { chatHistory, transactions, chats, users } from './db/schema.js';
import { eq, asc, count, and } from 'drizzle-orm';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Middleware for authentication
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Operational' });
});

// 1. Auth Endpoints
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });
  
  try {
    const authData = await authService.authenticateWithGoogle(token);
    res.json(authData);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const authData = await authService.registerLocal(username, password);
    res.json(authData);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const authData = await authService.loginLocal(username, password);
    res.json(authData);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

// 2. Research Endpoints
app.get('/api/research', async (req: express.Request, res: express.Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  try {
    const data = await researchService.getTopCompanies(page, limit);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/research/:symbol', async (req: express.Request, res: express.Response) => {
  try {
    const data = await researchService.getCompanyInfo((req.params.symbol as string).toUpperCase());
    res.json(data);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

app.get('/api/risk/:symbol', async (req: express.Request, res: express.Response) => {
  try {
    const data = await aiRiskService.analyzeRisk((req.params.symbol as string).toUpperCase());
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Portfolio Endpoints (Protected)
app.get('/api/portfolio', authenticate, async (req: any, res: any) => {
  try {
    const data = await portfolioService.getPortfolio(req.user.userId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/portfolio/history', authenticate, async (req: any, res: any) => {
  try {
    const history = await db.select().from(transactions)
      .where(eq(transactions.userId, req.user.userId))
      .orderBy(asc(transactions.timestamp));
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/portfolio/topup', authenticate, async (req: any, res: any) => {
  const { amount } = req.body;
  try {
    const data = await portfolioService.topUpWallet(req.user.userId, Number(amount));
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/portfolio/trade', authenticate, async (req: any, res: any) => {
  const { symbol, quantity, type } = req.body;
  if (!symbol || !quantity || !type) return res.status(400).json({ error: 'Missing parameters' });
  
  try {
    const data = await portfolioService.executeTrade(req.user.userId, symbol.toUpperCase(), Number(quantity), type);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 4. Market Movers
app.get('/api/market/movers', async (req: express.Request, res: express.Response) => {
  try {
    const movers = await researchService.getMarketMovers();
    res.json(movers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch market movers' });
  }
});

// --- CHAT MANAGEMENT ENDPOINTS ---

// 1. Get all chat sessions
app.get('/api/chats', authenticate, async (req: any, res: any) => {
  try {
    const userChats = await db.select().from(chats)
      .where(eq(chats.userId, req.user.userId))
      .orderBy(asc(chats.createdAt));
    res.json(userChats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Create a new chat session
app.post('/api/chats', authenticate, async (req: any, res: any) => {
  const { title } = req.body;
  try {
    const [newChat] = await db.insert(chats).values({
      userId: req.user.userId,
      title: title || `New Chat ${new Date().toLocaleDateString()}`
    }).returning();
    res.json(newChat);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Delete a chat session
app.delete('/api/chats/:id', authenticate, async (req: any, res: any) => {
  try {
    await db.delete(chats)
      .where(and(eq(chats.id, parseInt(req.params.id)), eq(chats.userId, req.user.userId)));
    res.json({ message: 'Chat deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get history for a specific chat
app.get('/api/chat/:id/history', authenticate, async (req: any, res: any) => {
  try {
    const history = await db.select().from(chatHistory)
      .where(eq(chatHistory.chatId, parseInt(req.params.id)))
      .orderBy(asc(chatHistory.createdAt));
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Reset Chat (Pro only - delete messages, reset count, increment chatsCreated)
app.delete('/api/chat/:id/reset', authenticate, async (req: any, res: any) => {
  const chatId = parseInt(req.params.id);
  
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.userId));
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 1. Tier Check
    if (user.subscriptionTier !== 'pro') {
      return res.status(403).json({ error: 'Only PRO users can reset chat sessions.' });
    }

    // 2. Quota Check
    if (user.chatsCreated >= 3) {
      return res.status(400).json({ error: 'Reset limit reached', message: 'You can only reset chats 3 times.' });
    }

    // 3. Perform Reset
    // Delete messages for this specific chat
    await db.delete(chatHistory).where(eq(chatHistory.chatId, chatId));
    
    // Update user stats
    await db.update(users)
      .set({ 
        messageCount: 0, 
        chatsCreated: (user.chatsCreated || 0) + 1 
      })
      .where(eq(users.id, req.user.userId));

    res.json({ 
      message: 'Chat history reset successfully',
      messageCount: 0,
      chatsCreated: (user.chatsCreated || 0) + 1
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Bulk Delete Chat History (Pro only)
app.delete('/api/chat/history', authenticate, async (req: any, res: any) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.userId));
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.subscriptionTier !== 'pro') {
      return res.status(403).json({ error: 'Only PRO users can reset global chat history.' });
    }

    if (user.chatsCreated >= 3) {
      return res.status(400).json({ error: 'Reset limit reached' });
    }

    await db.delete(chatHistory).where(eq(chatHistory.userId, req.user.userId));
    await db.update(users).set({ messageCount: 0, chatsCreated: (user.chatsCreated || 0) + 1 }).where(eq(users.id, req.user.userId));

    res.json({ message: 'All chat history reset', messageCount: 0, chatsCreated: (user.chatsCreated || 0) + 1 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Send message to a specific chat (with dynamic limits)
app.post('/api/chat/:id', authenticate, async (req: any, res: any) => {
  const chatId = parseInt(req.params.id);
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'An array of messages is required' });
  }

  try {
    const [chat] = await db.select().from(chats).where(eq(chats.id, chatId));
    if (!chat || chat.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized access to this chat' });
    }

    // 2. Fetch user to check subscription tier
    const [user] = await db.select().from(users).where(eq(users.id, req.user.userId));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const limits: Record<string, number> = {
      'none': 0,
      'go': 0,
      'plus': 30,
      'pro': 50
    };

    const userLimit = limits[user.subscriptionTier || 'none'] || 0;

    // 3. Enforce subscription-based message limit per session
    const [{ count: messageCount }] = await db.select({ count: count() })
      .from(chatHistory)
      .where(eq(chatHistory.chatId, chatId));
    
    if (Number(messageCount) >= userLimit) {
      return res.status(400).json({ 
        error: 'Chat limit reached', 
        message: `Your ${user.subscriptionTier} plan is limited to ${userLimit} messages per session. Please upgrade or start a new chat.` 
      });
    }

    const userMessage = messages[messages.length - 1];
    if (userMessage.content && userMessage.content.length > 302) {
      return res.status(400).json({ error: 'Message exceeds maximum length of 302 characters' });
    }

    await db.insert(chatHistory).values({
      chatId,
      userId: req.user.userId,
      role: 'user',
      content: userMessage.content
    });

    const aiResponse = await aiChatService.chat(messages);
    
    await db.insert(chatHistory).values({
      chatId,
      userId: req.user.userId,
      role: 'assistant',
      content: aiResponse.content
    });

    // Increment global message count for the user
    await db.update(users)
      .set({ messageCount: (user.messageCount || 0) + 1 })
      .where(eq(users.id, req.user.userId));

    res.json({ 
      ...aiResponse, 
      messageCount: (user.messageCount || 0) + 1 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. User & Settings Endpoints
app.get('/api/user/me', authenticate, async (req: any, res: any) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.userId));
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      id: user.id,
      username: user.username,
      balance: user.balance,
      subscriptionTier: user.subscriptionTier,
      messageCount: user.messageCount,
      chatsCreated: user.chatsCreated,
      createdAt: user.createdAt
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/user/subscription', authenticate, async (req: any, res: any) => {
  const { tier } = req.body;
  
  // Validation: Only allow specific tiers
  const validTiers = ['none', 'go', 'plus', 'pro'];
  if (!validTiers.includes(tier)) {
    return res.status(400).json({ error: 'Invalid subscription tier. Must be none, go, plus, or pro.' });
  }

  try {
    const [updatedUser] = await db.update(users)
      .set({ subscriptionTier: tier })
      .where(eq(users.id, req.user.userId))
      .returning();

    res.json({ 
      message: `Successfully upgraded to ${tier} plan`,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        subscriptionTier: updatedUser.subscriptionTier
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
