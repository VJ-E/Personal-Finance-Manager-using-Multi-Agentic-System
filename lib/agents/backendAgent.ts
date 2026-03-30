import { generateText } from "ai";
import { createOllama } from "ollama-ai-provider";
import { agentTools } from "../agentTools";
import { OLLAMA_BASE_URL } from "../config";

// Configure Ollama with Ngrok endpoint
const ollama = createOllama({
    baseURL: OLLAMA_BASE_URL,
    headers: { 'bypass-tunnel-reminder': 'true' }
});

export interface BackendResponse {
    success: boolean;
    data?: any;
    message?: string;
    toolResults?: any[];
}

const backendSystemPrompt = `
You are a Backend Operations Agent for a financial advisor system. Your job is to handle ALL tool interactions and data operations.

CRITICAL RULES:
1. You MUST use tools for ALL data operations - never make assumptions about user data
2. You are responsible for:
   - Fetching financial data (get_financial_data)
   - Recording transactions (add_transaction)
   - Updating/deleting transactions (update_transaction, delete_transaction)
   - Managing savings goals (create_goal, fund_goal)
3. The User ID is provided at the start of each message. You MUST use this exact userId when calling tools.
4. NEVER provide financial advice or recommendations
5. Focus on accurate data retrieval and transaction execution
6. Return factual information only - no opinions or suggestions
7. If a user asks for advice, respond with the data they requested and indicate that advice will be provided by another agent

IMPORTANT: Always use the User ID provided in the message when calling any tool. Do not invent or guess user IDs.

RESPONSE FORMAT:
Provide clear, factual responses about:
- What data was retrieved
- What transactions were executed
- Current balances or goal statuses
- Any errors or confirmations

Do not analyze the data or provide recommendations. Stick to the facts.
`;

export async function executeBackendOperation(
    userMessage: string,
    userId: string,
    ollamaUrl?: string
): Promise<BackendResponse> {
    try {
        // Create Ollama instance with provided URL or fallback to config
        const ollama = createOllama({
            baseURL: ollamaUrl || OLLAMA_BASE_URL,
            headers: { 'bypass-tunnel-reminder': 'true' }
        });

        const messageWithUserId = `User ID: ${userId}\n\nUser Request: ${userMessage}`;

        const { text, toolResults } = await generateText({
            // @ts-expect-error: provider model version mismatch between ai sdk and ollama provider
            model: ollama('llama3.1:latest'),
            system: backendSystemPrompt,
            messages: [{ role: 'user', content: messageWithUserId }],
            tools: agentTools,
            maxSteps: 5,
        });

        return {
            success: true,
            data: text,
            toolResults: toolResults
        };
    } catch (error) {
        console.error('Backend Agent error:', error);
        return {
            success: false,
            message: 'Failed to execute backend operation'
        };
    }
}
