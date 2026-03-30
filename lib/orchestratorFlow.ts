import { orchestrateRequest, OrchestratorResponse } from "./agents/orchestratorAgent";
import { executeBackendOperation } from "./agents/backendAgent";
import { provideFinancialAdvice } from "./agents/advisorAgent";

export interface FlowResponse {
    success: boolean;
    response: string;
    flow: string[];
    error?: string;
}

export async function processUserRequest(
    userMessage: string,
    userId: string,
    ollamaUrl?: string
): Promise<FlowResponse> {
    const flow: string[] = [];

    try {
        // Step 1: Orchestrator analyzes intent
        flow.push('orchestrator');
        const orchestration: OrchestratorResponse = await orchestrateRequest(userMessage, ollamaUrl);
        
        if (orchestration.intent === 'unknown') {
            return {
                success: false,
                response: "I'm not sure what you're asking for. Could you clarify?",
                flow
            };
        }

        // Step 2: Route based on orchestration
        switch (orchestration.agent) {
            case 'backend':
                // Transaction or Data request → Backend Agent only
                flow.push('backend');
                const backendResult = await executeBackendOperation(
                    orchestration.processedMessage,
                    userId,
                    ollamaUrl
                );
                
                if (!backendResult.success) {
                    return {
                        success: false,
                        response: backendResult.message || 'Backend operation failed',
                        flow
                    };
                }

                return {
                    success: true,
                    response: backendResult.data || 'Operation completed',
                    flow
                };

            case 'advisor':
                // This shouldn't happen with current logic, but handle it
                flow.push('fetch_data', 'advisor');
                
                // First fetch data
                const dataResult = await executeBackendOperation(
                    "Get my current financial summary",
                    userId,
                    ollamaUrl
                );
                
                if (!dataResult.success) {
                    return {
                        success: false,
                        response: 'Unable to fetch financial data for advice',
                        flow
                    };
                }

                // Then provide advice
                const advisorResponse = await provideFinancialAdvice(
                    orchestration.processedMessage,
                    dataResult.toolResults,
                    ollamaUrl
                );

                return {
                    success: advisorResponse.success,
                    response: advisorResponse.advice,
                    flow
                };

            case 'both':
                // Advice request → Backend (data) → Advisor
                flow.push('backend_data', 'advisor');
                
                // Step 2a: Fetch financial data via Backend Agent
                const dataFetchResult = await executeBackendOperation(
                    "Get my current financial summary",
                    userId,
                    ollamaUrl
                );
                
                if (!dataFetchResult.success) {
                    return {
                        success: false,
                        response: 'Unable to fetch financial data for advice',
                        flow
                    };
                }

                // Step 2b: Provide advice using the fetched data
                const adviceResponse = await provideFinancialAdvice(
                    orchestration.processedMessage,
                    dataFetchResult.toolResults,
                    ollamaUrl
                );

                return {
                    success: adviceResponse.success,
                    response: adviceResponse.advice,
                    flow
                };

            default:
                return {
                    success: false,
                    response: 'Invalid agent routing',
                    flow
                };
        }

    } catch (error) {
        console.error('Orchestrator flow error:', error);
        return {
            success: false,
            response: 'System error occurred while processing your request',
            flow,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
