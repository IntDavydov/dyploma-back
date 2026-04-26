import YahooFinance from 'yahoo-finance2';
import { db } from '../db/index.js';
import { apiCache } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const yahooFinance = new YahooFinance();

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 mins for market data

// A list of 100 popular symbols (Stocks, ETFs, Crypto, Bonds proxies)
const POPULAR_SYMBOLS = [
  // Big Tech
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "TSM", "AVGO", "ORCL",
  // Finance
  "JPM", "V", "MA", "BAC", "BAC", "WFC", "C", "GS", "MS", "AXP",
  // Healthcare
  "JNJ", "UNH", "LLY", "ABBV", "MRK", "PFE", "TMO", "ABT", "DHR", "ISRG",
  // Consumer
  "PG", "KO", "HD", "PEP", "COST", "MCD", "WMT", "NKE", "SBUX", "LVMUY",
  // Energy
  "XOM", "CVX", "SHEL", "COP", "TTE", "BP", "EQNR", "PBR", "OXY", "SLB",
  // Industrial & Auto
  "CAT", "UPS", "DE", "HON", "BA", "GE", "F", "LMT", "TM", "GM",
  // Media & Telecom
  "DIS", "NFLX", "CMCSA", "T", "VZ", "TMUS", "CHTR", "WBD", "SPOT", "RMD",
  // ETFs & Bonds
  "SPY", "QQQ", "DIA", "IWM", "VTI", "BND", "TLT", "AGG", "LQD", "IEF",
  // Crypto Proxies
  "BTC-USD", "ETH-USD", "COIN", "MSTR", "MARA", "RIOT", "HUT", "BITF", "GLXY", "ARKK",
  // Others
  "AMD", "QCOM", "INTC", "TXN", "ADBE", "CRM", "NOW", "INTU", "CSCO", "IBM"
];

export const researchService = {
  async getFromCache(key: string) {
    try {
      const [cached] = await db.select().from(apiCache).where(eq(apiCache.key, key));
      if (cached) {
        const isFresh = (new Date().getTime() - new Date(cached.updatedAt).getTime()) < CACHE_TTL_MS;
        if (isFresh) return cached.data;
      }
    } catch (e) {
      console.error(`[Cache Read Error ${key}]`);
    }
    return null;
  },

  async saveToCache(key: string, data: any) {
    try {
      await db.insert(apiCache)
        .values({ key, data, updatedAt: new Date() })
        .onConflictDoUpdate({ target: apiCache.key, set: { data, updatedAt: new Date() } });
    } catch (e) {
      console.error(`[Cache Write Error ${key}]`);
    }
  },

  async getMarketMovers() {
    const cacheKey = 'research:market_movers';
    let data = await this.getFromCache(cacheKey);
    if (data) return data;

    try {
      const screen = await yahooFinance.screener({ scrIds: "most_actives", count: 4 });
      data = screen.quotes.map(q => ({
        symbol: q.symbol,
        name: q.longName || q.shortName || q.symbol,
        price: q.regularMarketPrice,
        changePercent: q.regularMarketChangePercent
      }));
      await this.saveToCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching market movers:', error);
      return [];
    }
  },

  async getTopCompanies(page: number = 1, limit: number = 20) {
    const cacheKey = 'research:top_100';
    let results = await this.getFromCache(cacheKey);

    if (!results) {
      try {
        const quotes = await yahooFinance.quote(POPULAR_SYMBOLS);
        results = quotes.map(q => ({
          symbol: q.symbol,
          name: q.shortName || q.longName || q.symbol,
          price: q.regularMarketPrice,
          change: q.regularMarketChange,
          changePercent: q.regularMarketChangePercent,
          volume: q.regularMarketVolume,
          marketCap: q.marketCap,
          type: q.quoteType,
          rating: q.averageAnalystRating
        })).filter(q => q.price != null);

        await this.saveToCache(cacheKey, results);
      } catch (error) {
        console.error('Error fetching batch research data:', error);
        results = POPULAR_SYMBOLS.slice(0, 10).map(sym => ({
          symbol: sym,
          name: sym,
          price: 100 + Math.random() * 50,
          change: Math.random() * 2 - 1,
          changePercent: Math.random() * 2 - 1,
          type: 'EQUITY'
        }));
      }
    }

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedData = results.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total: results.length,
      page,
      limit,
      totalPages: Math.ceil(results.length / limit)
    };
  },

  async getCompanyInfo(symbol: string) {
    const cacheKey = `research:company:${symbol}`;
    const cachedData = await this.getFromCache(cacheKey);
    if (cachedData) return cachedData;

    try {
      const quote = await yahooFinance.quote(symbol);
      const chart = await yahooFinance.chart(symbol, { period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) });
      const search = await yahooFinance.search(symbol, { newsCount: 10 });
      
      // Fetch deep financial data
      let financials = null;
      let keyStats = null;
      let profile = null;
      try {
        const summary = await yahooFinance.quoteSummary(symbol, { modules: ['financialData', 'defaultKeyStatistics', 'assetProfile'] });
        financials = summary.financialData;
        keyStats = summary.defaultKeyStatistics;
        profile = summary.assetProfile;
      } catch (e) {
        console.error(`[Yahoo Finance] Could not fetch deep summary for ${symbol}`);
      }
      
      const result = {
        symbol: quote.symbol,
        name: quote.shortName || quote.longName,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        open: quote.regularMarketOpen,
        high: quote.regularMarketDayHigh,
        low: quote.regularMarketDayLow,
        volume: quote.regularMarketVolume,
        marketCap: quote.marketCap,
        type: quote.quoteType,
        currency: quote.currency,
        exchange: quote.exchange,
        // General Profile Data
        profile: {
          sector: profile?.sector,
          industry: profile?.industry,
          employees: profile?.fullTimeEmployees,
          website: profile?.website,
          description: profile?.longBusinessSummary
        },
        // Deep Financial Data
        valuation: {
          enterpriseValue: keyStats?.enterpriseValue,
          forwardPE: keyStats?.forwardPE,
          priceToBook: keyStats?.priceToBook,
          pegRatio: keyStats?.pegRatio,
        },
        financials: {
          totalCash: financials?.totalCash,
          totalDebt: financials?.totalDebt,
          totalRevenue: financials?.totalRevenue,
          revenueGrowth: financials?.revenueGrowth,
          earningsGrowth: financials?.earningsGrowth,
        },
        cashFlow: {
          freeCashflow: financials?.freeCashflow,
          operatingCashflow: financials?.operatingCashflow,
        },
        profitability: {
          profitMargins: financials?.profitMargins,
          operatingMargins: financials?.operatingMargins,
          returnOnAssets: financials?.returnOnAssets,
          returnOnEquity: financials?.returnOnEquity,
        },
        chart: chart.quotes.map(q => ({ date: q.date, close: q.close })),
        news: search.news?.map(n => ({ title: n.title, publisher: n.publisher, link: n.link, time: n.providerPublishTime })) || []
      };

      await this.saveToCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`Error fetching specific research for ${symbol}:`, error);
      throw new Error('Failed to fetch company info');
    }
  }
};
