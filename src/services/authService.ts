import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Normally these come from environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'mock-client-id';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export const authService = {
  // 1. Google OAuth Logic
  async authenticateWithGoogle(token: string) {
    try {
      let googleId = '';
      let username = '';

      if (token.startsWith('mock_')) {
        googleId = token;
        username = `MockUser_${token.slice(5)}`;
      } else {
        const ticket = await client.verifyIdToken({
          idToken: token,
          audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload) throw new Error('Invalid token payload');
        googleId = payload.sub;
        username = payload.name || payload.email?.split('@')[0] || 'User';
      }

      let [user] = await db.select().from(users).where(eq(users.googleId, googleId));
      
      if (!user) {
        // Fallback to check if username exists to avoid UNIQUE constraint error
        const [existingName] = await db.select().from(users).where(eq(users.username, username));
        const finalUsername = existingName ? `${username}_${Math.floor(Math.random()*1000)}` : username;

        [user] = await db.insert(users).values({
          googleId,
          username: finalUsername,
          balance: 100000.0,
          subscriptionTier: 'none'
        }).returning();
      }

      const appToken = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      return { 
        token: appToken, 
        user: { 
          id: user.id, 
          username: user.username, 
          balance: user.balance,
          subscriptionTier: user.subscriptionTier 
        } 
      };
    } catch (error) {
      console.error('Google Auth Error:', error);
      throw new Error('Authentication failed');
    }
  },

  // 2. Simple Local Registration (For Testing/Fallback)
  async registerLocal(username: string, passwordRaw: string) {
    if (!username || !passwordRaw) throw new Error('Username and password required');
    
    const [existing] = await db.select().from(users).where(eq(users.username, username));
    if (existing) throw new Error('Username already exists');

    const hashedPassword = await bcrypt.hash(passwordRaw, 10);
    const [user] = await db.insert(users).values({
      username,
      password: hashedPassword,
      balance: 100000.0 // Give testers the $100k starting balance
    }).returning();

    const appToken = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    return { 
      token: appToken, 
      user: { 
        id: user.id, 
        username: user.username, 
        balance: user.balance,
        subscriptionTier: user.subscriptionTier
      } 
    };
  },

  // 3. Simple Local Login (For Testing/Fallback)
  async loginLocal(username: string, passwordRaw: string) {
    if (!username || !passwordRaw) throw new Error('Username and password required');

    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user || !user.password) throw new Error('Invalid credentials'); // Ensure they have a local password

    const isValid = await bcrypt.compare(passwordRaw, user.password);
    if (!isValid) throw new Error('Invalid credentials');

    const appToken = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    return { 
      token: appToken, 
      user: { 
        id: user.id, 
        username: user.username, 
        balance: user.balance,
        subscriptionTier: user.subscriptionTier
      } 
    };
  },

  // 4. Token Verification
  verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
    } catch (e) {
      throw new Error('Invalid token');
    }
  }
};
