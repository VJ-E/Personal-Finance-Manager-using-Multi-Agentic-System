// Configuration for the multi-agent system

export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'https://f6bbac8954c74a.lhr.life/api';

// Fallback to localhost for development (if you want to test locally)
// export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/api';

export const MOCK_USER_ID = process.env.MOCK_USER_ID || "user_123";
