import { generateText } from "ai";
import { createOllama } from "ollama-ai-provider";
import { OLLAMA_BASE_URL } from "../config";

// Configure Ollama with Ngrok endpoint
const ollama = createOllama({
    baseURL: OLLAMA_BASE_URL,
    headers: { 'bypass-tunnel-reminder': 'true' }
});

export interface OrchestratorResponse {
    intent: 'transaction' | 'advice' | 'data' | 'unknown';
    agent: 'backend' | 'advisor' | 'both';
    reasoning: string;
    processedMessage: string;
}

const orchestratorSystemPrompt = `
You are an Orchestrator Agent for a financial advisor system. Your job is to analyze user input and determine the appropriate routing to specialized agents.

CLASSIFICATION RULES:
1. TRANSACTION INTENT: User wants to record, modify, or delete financial data
   - Keywords: "add", "record", "spent", "paid", "bought", "delete", "remove", "update", "change", "correct"
   - Examples: "I spent $50 on groceries", "Delete transaction #A7F2", "Update my salary"

2. ADVICE INTENT: User seeks financial guidance, recommendations, or affordability analysis
   - Keywords: "can I afford", "should I", "recommend", "advice", "help me decide", "is it worth"
   - Examples: "Can I afford a new laptop?", "Should I invest in stocks?", "Is this purchase wise?"

3. DATA INTENT: User wants to view or query their financial information
   - Keywords: "show me", "what's my", "balance", "summary", "history", "transactions", "goals"
   - Examples: "What's my current balance?", "Show me recent transactions", "How are my savings goals?"

ROUTING LOGIC:
- TRANSACTION intent → route to Backend Operations Agent only
- ADVICE intent → route to Backend Operations Agent (for data) → then Advisor Agent
- DATA intent → route to Backend Operations Agent only

RESPONSE FORMAT:
You must respond with a JSON object containing:
{
  "intent": "transaction|advice|data|unknown",
  "agent": "backend|advisor|both", 
  "reasoning": "Brief explanation of your classification",
  "processedMessage": "The user's message, potentially clarified or rephrased for the target agent"
}

Do not provide financial advice. Do not access tools. Only classify and route.
`;

export async function orchestrateRequest(userMessage: string, ollamaUrl?: string): Promise<OrchestratorResponse> {
    try {
        // Create Ollama instance with provided URL or fallback to config
        const ollama = createOllama({
            baseURL: ollamaUrl || OLLAMA_BASE_URL,
            headers: { 'bypass-tunnel-reminder': 'true' }
        });

        const { text } = await generateText({
            // @ts-expect-error: provider model version mismatch between ai sdk and ollama provider
            model: ollama('llama3.1:latest'),
            system: orchestratorSystemPrompt,
            messages: [{ role: 'user', content: userMessage }],
            maxSteps: 1,
        });

        // Parse the JSON response
        const response = JSON.parse(text.trim());

        // Validate response structure
        if (!response.intent || !response.agent || !response.reasoning || !response.processedMessage) {
            throw new Error('Invalid orchestrator response structure');
        }

        return response as OrchestratorResponse;
    } catch (error) {
        console.error('Orchestrator error:', error);

        // Fallback classification
        const lowerMessage = userMessage.toLowerCase();
        let intent: 'transaction' | 'advice' | 'data' | 'unknown' = 'unknown';
        let agent: 'backend' | 'advisor' | 'both' = 'backend';

        if (lowerMessage.includes('add') || lowerMessage.includes('spent') || lowerMessage.includes('paid') ||
            lowerMessage.includes('delete') || lowerMessage.includes('update')) {
            intent = 'transaction';
            agent = 'backend';
        } else if (lowerMessage.includes('can i afford') || lowerMessage.includes('should i') ||
            lowerMessage.includes('recommend') || lowerMessage.includes('advice')) {
            intent = 'advice';
            agent = 'both';
        } else if (lowerMessage.includes('balance') || lowerMessage.includes('show') ||
            lowerMessage.includes('what\'s my') || lowerMessage.includes('summary')) {
            intent = 'data';
            agent = 'backend';
        }

        return {
            intent,
            agent,
            reasoning: 'Fallback classification due to error',
            processedMessage: userMessage
        };
    }
}
