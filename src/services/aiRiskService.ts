import axios from 'axios';
import { researchService } from './researchService.js';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export const aiRiskService = {
  async analyzeRisk(symbol: string) {
    if (!OPENROUTER_API_KEY) {
      throw new Error("OpenRouter API key is missing in environment variables");
    }

    const companyData = await researchService.getCompanyInfo(symbol);
    const headlines = companyData.news.map((n: any) => n.title);
    
    if (headlines.length === 0) {
      return {
        score: 50,
        riskLevel: "Medium",
        sentiment: "Neutral",
        summary: "No recent news found to analyze.",
        recommendation: "Hold based on technicals, insufficient news data."
      };
    }

    const prompt = `
      As a Supply Chain and Investment Risk Assessor, analyze the following recent news headlines about the stock ticker "${symbol}":
      ${headlines.join('\n')}
      
      Provide a risk assessment JSON with the following exact fields:
      - score: (number from 0 to 100, where 100 is high risk/bearish, and 0 is extremely bullish)
      - riskLevel: (Low, Medium, High)
      - sentiment: (Bullish, Bearish, or Neutral)
      - summary: (1 concise sentence explanation)
      - recommendation: (Buy, Hold, or Sell)
      
      Return ONLY valid JSON format. Do not use markdown blocks.
    `;

    try {
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: prompt }]
      }, {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const content = response.data.choices[0].message.content;
      const jsonStr = content.replace(/```json|```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (error: any) {
      console.error('AI Analysis error:', error?.response?.data || error.message);
      return {
        score: 50,
        riskLevel: "Medium",
        sentiment: "Neutral",
        summary: "Unable to reach AI assessor. Manual review recommended.",
        recommendation: "Hold"
      };
    }
  }
};
