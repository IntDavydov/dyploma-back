import yahooFinance from 'yahoo-finance2';
async function run() {
  const yf = new yahooFinance();
  const quote = await yf.quote("AAPL");
  console.log("Quote:", quote.regularMarketPrice);
}
run().catch(console.error);
