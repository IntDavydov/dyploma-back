import yahooFinance from 'yahoo-finance2';
async function run() {
  try {
    const quote = await yahooFinance.quote("AAPL");
    const chart = await yahooFinance.chart("AAPL", { period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) });
    console.log("Quote:", quote.regularMarketPrice);
    console.log("Chart length:", chart.quotes.length);
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}
run();
