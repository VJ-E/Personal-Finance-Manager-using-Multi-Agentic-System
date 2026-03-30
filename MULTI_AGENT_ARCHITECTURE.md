# Multi-Agent Financial Advisor System Architecture

## 🎯 Overview

This system has been refactored from a single-agent architecture to a **3-agent multi-agent system** with clear separation of responsibilities. All agents use the same remote Ollama model via Ngrok endpoint.

## 🏗️ Architecture Components

### 1. Orchestrator Agent (`lib/agents/orchestratorAgent.ts`)
**Role**: Central controller and traffic manager
- Analyzes user input and determines intent
- Routes requests to appropriate agents
- Coordinates multi-step flows
- **NO tool access**
- **NO business logic**

**Intent Classification**:
- `transaction` → Backend Operations Agent
- `advice` → Backend Operations Agent → Advisor Agent  
- `data` → Backend Operations Agent
- `unknown` → Error response

### 2. Backend Operations Agent (`lib/agents/backendAgent.ts`)
**Role**: Tool execution and data operations
- **ONLY agent with tool access**
- Handles all database operations
- Executes transactions and data modifications
- Fetches financial data
- **NO financial advice**
- **NO reasoning or recommendations**

**Available Tools**:
- `get_financial_data` - Fetch user financial summary
- `add_transaction` - Record new transactions
- `update_transaction` - Modify existing transactions
- `delete_transaction` - Remove transactions
- `create_goal` - Create savings goals
- `fund_goal` - Transfer funds to goals

### 3. Advisor Agent (`lib/agents/advisorAgent.ts`)
**Role**: Financial reasoning and advice
- Provides financial recommendations
- Analyzes affordability ("Can I afford X?")
- Offers spending guidance
- **NO tool access**
- **NO data modification**

## 🔄 Request Flows

### Transaction Requests
```
User Input → Orchestrator → Backend Agent → Tool Execution → Response
```

### Data Requests  
```
User Input → Orchestrator → Backend Agent → Data Fetch → Response
```

### Advice Requests
```
User Input → Orchestrator → Backend Agent (fetch data) → Advisor Agent (analyze) → Response
```

## 📁 File Structure

```
lib/
├── config.ts                    # Configuration (Ngrok URL, User ID)
├── agentTools.ts               # Shared tools object (Backend only)
├── orchestratorFlow.ts         # Main flow controller
└── agents/
    ├── orchestratorAgent.ts    # Intent classification & routing
    ├── backendAgent.ts         # Tool execution & data ops
    └── advisorAgent.ts        # Financial advice & reasoning
```

## ⚙️ Configuration

### Ngrok Setup
1. Update `lib/config.ts` with your Ngrok URL:
```typescript
export const OLLAMA_BASE_URL = 'https://your-actual-ngrok-url.ngrok.io/api';
```

2. Or set environment variable:
```bash
OLLAMA_BASE_URL=https://your-actual-ngrok-url.ngrok.io/api
```

### Environment Variables
- `OLLAMA_BASE_URL` - Your Ngrok-exposed Ollama endpoint
- `MOCK_USER_ID` - User ID for testing (defaults to "user_123")

## 🚀 API Response Format

The API now returns additional flow information:
```json
{
  "reply": "Response text",
  "flow": ["orchestrator", "backend"],
  "success": true
}
```

**Flow Types**:
- `["orchestrator", "backend"]` - Transaction/Data operations
- `["orchestrator", "backend_data", "advisor"]` - Advice requests
- `["orchestrator"]` - Intent classification errors

## 🛡️ Separation of Concerns

### Strict Tool Access Control
- **Orchestrator**: NO tools
- **Backend**: ALL tools  
- **Advisor**: NO tools

### Responsibility Boundaries
- **Orchestrator**: Routing and coordination only
- **Backend**: Data operations and execution only
- **Advisor**: Analysis and recommendations only

## 🔧 Migration Notes

### What Changed
- Single agent → 3 specialized agents
- Direct tool access → Orchestrated flow
- Localhost → Ngrok endpoint configuration
- Added intent classification system
- Separated tool access by role

### What Stayed Same
- All existing tool implementations
- Database logic and models
- API endpoint structure
- Response format compatibility
- Financial business rules

## 🚦 Testing the System

1. **Transaction Test**: "I spent $50 on groceries"
   - Flow: `["orchestrator", "backend"]`
   - Should record transaction

2. **Data Test**: "What's my balance?"
   - Flow: `["orchestrator", "backend"]`
   - Should return financial summary

3. **Advice Test**: "Can I afford a new laptop?"
   - Flow: `["orchestrator", "backend_data", "advisor"]`
   - Should analyze and provide advice

## 🔍 Debugging

Check console logs for:
- `"Multi-agent flow executed:"` - Shows which agents were used
- `"Response:"` - Shows the final response
- Individual agent errors are logged separately

## 📈 Benefits

1. **Scalability**: Easy to add new specialized agents
2. **Maintainability**: Clear separation of responsibilities
3. **Reliability**: Fallback mechanisms for each agent
4. **Observability**: Detailed flow tracking
5. **Flexibility**: Remote model access via Ngrok
