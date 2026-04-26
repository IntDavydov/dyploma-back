import YahooFinance from 'yahoo-finance2';
const yf = new YahooFinance();
async function run() {
  const result = await yf.search("AAPL", { newsCount: 3 });
  console.log("News count:", result.news?.length);
  if (result.news?.length > 0) {
    console.log("Sample news title:", result.news[0].title);
  }
}
run().catch(console.error);
