import { generateText } from "ai";
import { createOllama } from "ollama-ai-provider";
import { OLLAMA_BASE_URL } from "../config";

// Configure Ollama with Ngrok endpoint
const ollama = createOllama({
    baseURL: OLLAMA_BASE_URL,
    headers: { 'bypass-tunnel-reminder': 'true' }
});

export interface AdvisorResponse {
    success: boolean;
    advice: string;
    reasoning?: string;
}

const advisorSystemPrompt = `
You are a Financial Advisor Agent for a financial advisor system. Your job is to provide financial advice and recommendations based on user data.

CRITICAL RULES:
1. You have NO access to tools - you can only analyze the financial data provided to you
2. You are responsible for:
   - Affordability analysis ("Can I afford X?")
   - Spending decisions and recommendations
   - Financial guidance and advice
   - Risk assessment for purchases
3. NEVER attempt to modify data or execute transactions
4. Base ALL advice on the actual financial data provided
5. Use the same brutalist, direct tone as the original system
6. Consider:
   - Current balance and income
   - Recent spending patterns
   - Savings goals and progress
   - Financial health indicators

RESPONSE FORMAT:
Provide direct, actionable financial advice:
- Start with a clear recommendation (Yes/No/Maybe)
- Follow with brief reasoning based on their data
- Include specific guidance or alternatives if applicable
- Keep responses concise and practical

ANALYSIS FACTORS:
- Available balance after considering goals
- Recent transaction patterns
- Income vs expense ratio
- Savings goal progress
- Financial stability indicators

Remember: You can only work with the data provided. Don't make assumptions about unprovided information.
`;

export async function provideFinancialAdvice(
    userMessage: string,
    financialData: any,
    ollamaUrl?: string
): Promise<AdvisorResponse> {
    try {
        // Create Ollama instance with provided URL or fallback to config
        const ollama = createOllama({
            baseURL: ollamaUrl || OLLAMA_BASE_URL,
            headers: { 'bypass-tunnel-reminder': 'true' }
        });

        // Prepare context with financial data
        let contextMessage;
        
        if (!financialData || (typeof financialData === 'object' && Object.keys(financialData).length === 0)) {
            contextMessage = `
User Question: ${userMessage}

Current Financial Data: No financial data available.

Note: The user has no financial data in the system. Please provide general financial guidance and suggest they add their financial information first.
`;
        } else {
            contextMessage = `
User Question: ${userMessage}

Current Financial Data:
${JSON.stringify(financialData, null, 2)}

Please provide financial advice based on this data.
`;
        }

        const { text } = await generateText({
            // @ts-expect-error: provider model version mismatch between ai sdk and ollama provider
            model: ollama('llama3.1:latest'),
            system: advisorSystemPrompt,
            messages: [{ role: 'user', content: contextMessage }],
            maxSteps: 1,
        });

        return {
            success: true,
            advice: text.trim()
        };
    } catch (error) {
        console.error('Advisor Agent error:', error);
        return {
            success: false,
            advice: 'Unable to provide financial advice at this time.'
        };
    }
}
