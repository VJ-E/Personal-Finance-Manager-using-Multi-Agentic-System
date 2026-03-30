import { NextResponse } from "next/server";
import { processUserRequest } from "../../../lib/orchestratorFlow";
import { MOCK_USER_ID } from "../../../lib/config";

export async function POST(req: Request) {
    try {
        const { messages, ollamaUrl } = await req.json();

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
        }

        // Get the latest user message
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || lastMessage.role !== 'user') {
            return NextResponse.json({ error: "No user message found" }, { status: 400 });
        }

        // Mock User ID mapping for MVP
        const userId = MOCK_USER_ID;

        // Process the request using the multi-agent orchestrator flow
        const result = await processUserRequest(lastMessage.content, userId, ollamaUrl);

        console.log("Multi-agent flow executed:", result.flow);
        console.log("Response:", result.response);

        return NextResponse.json({ 
            reply: result.response,
            flow: result.flow,
            success: result.success
        });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: "Failed to generate response." },
            { status: 500 }
        );
    }
}
