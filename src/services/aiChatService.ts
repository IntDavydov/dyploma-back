import axios from 'axios';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export const aiChatService = {
  async chat(messages: { role: string; content: string }[]) {
    if (!OPENROUTER_API_KEY) {
      throw new Error("OpenRouter API key is missing in environment variables");
    }

    try {
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'deepseek/deepseek-chat', // DeepSeek-V3 via OpenRouter
        messages: [
          { 
            role: 'system', 
            content: 'You are Nova, an expert AI financial assistant. Provide concise, professional, and helpful answers about stocks, bonds, market conditions, and strategies. YOUR RESPONSES MUST BE BRIEF. ABSOLUTE MAXIMUM LENGTH IS 600 CHARACTERS. Use clean formatting and do not use filler words.' 
          },
          ...messages
        ]
      }, {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message;
    } catch (error: any) {
      console.error('Nova AI Chat Error:', error?.response?.data || error.message);
      throw new Error('Failed to get response from Nova AI');
    }
  }
};
