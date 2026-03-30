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

                // Extract actual financial data from tool results
                let financialData = null;
                console.log('Tool results:', JSON.stringify(dataFetchResult.toolResults, null, 2));
                
                if (dataFetchResult.toolResults && dataFetchResult.toolResults.length > 0) {
                    // Look for get_financial_data tool result
                    const financeToolResult = dataFetchResult.toolResults.find(result => 
                        result.toolName === 'get_financial_data' && result.result
                    );
                    if (financeToolResult && financeToolResult.result.data) {
                        financialData = financeToolResult.result.data;
                        console.log('Found financial data in tool results:', financialData);
                    }
                }

                // If no tool results found, try parsing from the text response
                if (!financialData && dataFetchResult.data) {
                    console.log('Trying to parse from text response:', dataFetchResult.data);
                    
                    // Try to extract financial data from natural language response
                    try {
                        // Look for patterns in the natural language response
                        const text = dataFetchResult.data;
                        const monthlyIncomeMatch = text.match(/\* Monthly income: \$([\d,]+)/) || text.match(/\* Monthly Income: \$([\d,]+)/);
                        const totalBalanceMatch = text.match(/\* Total balance: \$([\d,]+)/) || text.match(/\* Total Balance: \$([\d,]+)/);
                        const totalExpensesMatch = text.match(/\* Total Expenses: \$([\d,]+)/) || text.match(/\* Total expenses: \$([\d,]+)/);
                        
                        if (monthlyIncomeMatch || totalBalanceMatch || totalExpensesMatch) {
                            const monthlyIncome = monthlyIncomeMatch ? parseFloat(monthlyIncomeMatch[1].replace(',', '')) : 0;
                            const totalBalance = totalBalanceMatch ? parseFloat(totalBalanceMatch[1].replace(',', '')) : 0;
                            const totalExpenses = totalExpensesMatch ? parseFloat(totalExpensesMatch[1].replace(',', '')) : 0;
                            
                            financialData = {
                                profile: {
                                    userId: userId,
                                    monthlyIncome: monthlyIncome,
                                    totalBalance: totalBalance,
                                    totalIncome: monthlyIncome, // Use monthlyIncome as fallback for totalIncome
                                    totalExpenses: totalExpenses,
                                    activeSavingsGoals: []
                                },
                                recentTransactions: []
                            };
                            console.log('Extracted financial data from natural language:', financialData);
                        }
                    } catch (e) {
                        console.log('Could not extract financial data from natural language:', e);
                    }
                }

                // Final fallback - if still no data, create a minimal structure
                if (!financialData) {
                    console.log('Using fallback financial data structure');
                    financialData = {
                        profile: {
                            userId: userId,
                            monthlyIncome: 0,
                            totalBalance: 0,
                            totalIncome: 0,
                            totalExpenses: 0,
                            activeSavingsGoals: []
                        },
                        recentTransactions: []
                    };
                }

                // Step 2b: Provide advice using the fetched data
                const adviceResponse = await provideFinancialAdvice(
                    orchestration.processedMessage,
                    financialData,
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
