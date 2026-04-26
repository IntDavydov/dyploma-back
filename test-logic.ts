import 'dotenv/config';
import { authService } from './src/services/authService.js';
import { portfolioService } from './src/services/portfolioService.js';
import { researchService } from './src/services/researchService.js';

async function test() {
  console.log("--- Testing Auth (Mock Login) ---");
  const auth = await authService.authenticateWithGoogle('mock_test_user');
  console.log("User:", auth.user);
  const userId = auth.user.id;

  console.log("\n--- Testing Research (Top Companies) ---");
  const top = await researchService.getTopCompanies();
  console.log("Top Companies Count:", top.length);
  if (top.length > 0) {
    console.log("Sample Company:", top[0].symbol, top[0].price);
  }

  console.log("\n--- Testing Research (Specific Company: AAPL) ---");
  const aapl = await researchService.getCompanyInfo("AAPL");
  console.log("AAPL Price:", aapl.price);
  console.log("AAPL Chart Points:", aapl.chart?.length);

  console.log("\n--- Testing Portfolio (TopUp) ---");
  const topup = await portfolioService.topUpWallet(userId, 5000);
  console.log("Balance after topup:", topup.balance);

  console.log("\n--- Testing Portfolio (Buy Trade) ---");
  const buy = await portfolioService.executeTrade(userId, "AAPL", 2, "buy");
  console.log("Total Value after buy:", buy.totalValue);
  console.log("Holdings:", buy.holdings.map(h => `${h.quantity}x ${h.symbol}`));

  console.log("\n--- Testing Portfolio (Sell Trade) ---");
  const sell = await portfolioService.executeTrade(userId, "AAPL", 1, "sell");
  console.log("Total Value after sell:", sell.totalValue);
  console.log("Holdings:", sell.holdings.map(h => `${h.quantity}x ${h.symbol}`));
  console.log("Balance after sell:", sell.balance);

  process.exit(0);
}

test().catch(err => {
  console.error("TEST ERROR:", err);
  process.exit(1);
});
