import { pgTable, serial, varchar, integer, timestamp, jsonb, doublePrecision } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  googleId: varchar('google_id', { length: 256 }).unique(),
  username: varchar('username', { length: 256 }).unique().notNull(),
  password: varchar('password', { length: 256 }), // For local testing
  subscriptionTier: varchar('subscription_tier', { length: 50 }).notNull().default('none'), // none, go, plus, pro
  messageCount: integer('message_count').notNull().default(0),
  chatsCreated: integer('chats_created').notNull().default(0),
  balance: doublePrecision('balance').notNull().default(100000.0), // $100k starting cash
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const portfolio = pgTable('portfolio', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  symbol: varchar('symbol', { length: 50 }).notNull(),
  quantity: integer('quantity').notNull(),
  averagePrice: doublePrecision('average_price').notNull(),
  type: varchar('type', { length: 50 }).notNull().default('stock'), // stock, bond, etf
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  symbol: varchar('symbol', { length: 50 }).notNull(),
  type: varchar('type', { length: 10 }).notNull(), // 'buy' or 'sell'
  quantity: integer('quantity').notNull(),
  price: doublePrecision('price').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const apiCache = pgTable('api_cache', {
  key: varchar('key', { length: 256 }).primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const chats = pgTable('chats', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chatHistory = pgTable('chat_history', {
  id: serial('id').primaryKey(),
  chatId: integer('chat_id').references(() => chats.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  content: varchar('content', { length: 2000 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
