import { db } from '../db/index.js';
import { users, portfolio, transactions } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export const portfolioService = {
  async topUpWallet(userId: number, amount: number) {
    if (amount <= 0) throw new Error("Amount must be positive");
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    const newBalance = user.balance + amount;
    await db.update(users).set({ balance: newBalance }).where(eq(users.id, userId));
    return { balance: newBalance };
  },

  async getPortfolio(userId: number) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    const holdings = await db.select().from(portfolio).where(eq(portfolio.userId, userId));
    
    // Get live prices for holdings
    const symbols = holdings.map(h => h.symbol);
    const quotes = symbols.length > 0 ? await yahooFinance.quote(symbols) : [];
    const quotesMap = quotes.reduce((acc, q) => {
      acc[q.symbol] = {
        price: q.regularMarketPrice || 0,
        name: q.shortName || q.longName || q.symbol
      };
      return acc;
    }, {} as Record<string, { price: number, name: string }>);

    let totalValue = user.balance;
    const enrichedHoldings = holdings.map(h => {
      const liveData = quotesMap[h.symbol];
      const currentPrice = liveData?.price || h.averagePrice;
      const name = liveData?.name || h.symbol;
      const value = currentPrice * h.quantity;
      totalValue += value;
      return {
        ...h,
        name,
        currentPrice,
        currentValue: value,
        returnPercent: ((currentPrice - h.averagePrice) / h.averagePrice) * 100
      };
    });

    return {
      balance: user.balance,
      totalValue,
      holdings: enrichedHoldings
    };
  },

  async executeTrade(userId: number, symbol: string, quantity: number, type: 'buy' | 'sell') {
    if (quantity <= 0) throw new Error("Quantity must be positive");

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    const quote = await yahooFinance.quote(symbol);
    if (!quote.regularMarketPrice) throw new Error("Price not available for symbol");
    const price = quote.regularMarketPrice;
    const totalCost = price * quantity;

    // Check if portfolio exists
    let [holding] = await db.select().from(portfolio).where(and(eq(portfolio.userId, userId), eq(portfolio.symbol, symbol)));

    if (type === 'buy') {
      if (user.balance < totalCost) throw new Error("Insufficient funds");
      
      // Deduct balance
      await db.update(users).set({ balance: user.balance - totalCost }).where(eq(users.id, userId));

      if (holding) {
        const newQuantity = holding.quantity + quantity;
        const newAvgPrice = ((holding.averagePrice * holding.quantity) + totalCost) / newQuantity;
        await db.update(portfolio).set({ quantity: newQuantity, averagePrice: newAvgPrice }).where(eq(portfolio.id, holding.id));
      } else {
        await db.insert(portfolio).values({
          userId,
          symbol,
          quantity,
          averagePrice: price,
          type: quote.quoteType || 'stock'
        });
      }
    } else if (type === 'sell') {
      if (!holding || holding.quantity < quantity) throw new Error("Insufficient shares");

      // Add balance
      await db.update(users).set({ balance: user.balance + totalCost }).where(eq(users.id, userId));

      const newQuantity = holding.quantity - quantity;
      if (newQuantity === 0) {
        await db.delete(portfolio).where(eq(portfolio.id, holding.id));
      } else {
        await db.update(portfolio).set({ quantity: newQuantity }).where(eq(portfolio.id, holding.id));
      }
    }

    // Record transaction
    await db.insert(transactions).values({
      userId,
      symbol,
      type,
      quantity,
      price
    });

    return this.getPortfolio(userId);
  }
};
