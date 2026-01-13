// AI API endpoint for Playground
// Handles AI collaboration requests with Claude 3.5 Sonnet via Anthropic

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { AskAIRequest, AskAIResponse, AskAIMode } from "@/lib/ai/schema";
import { buildMarginEditorPrompt } from "@/lib/ai/prompt";

// Valid AI modes
const VALID_MODES: AskAIMode[] = ["critique", "synthesize"];

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// Configuration
const AI_MODEL = process.env.AI_MODEL || "claude-3-5-sonnet-20241022";
const AI_MAX_OUTPUT_TOKENS = parseInt(process.env.AI_MAX_OUTPUT_TOKENS || "2000", 10);
const AI_TIMEOUT_MS = 25000; // 25 seconds

/**
 * POST /api/ai
 * Handles AI collaboration requests
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Validate request structure
    const validationError = validateRequest(body);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    const req = body as AskAIRequest;

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("[AI API] Missing ANTHROPIC_API_KEY environment variable");
      return NextResponse.json(
        { message: "AI service is not configured. Please add your API key." },
        { status: 500 }
      );
    }

    // Build prompts
    const prompts = buildMarginEditorPrompt(req);

    // Log request (don't log full document text for privacy)
    console.log("[AI API] Mode:", req.mode);
    console.log("[AI API] User prompt length:", req.userPrompt.length);
    console.log("[AI API] Selected text length:", req.context.selectedText.length);

    // Call Anthropic API with timeout
    const response = await callAnthropicWithTimeout(prompts.system, prompts.user, req.mode);

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error("[AI API] Unexpected error:", error);

    // Return user-friendly error message
    return NextResponse.json(
      { message: "Sorry—AI request failed. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Validate the AI request structure
 */
function validateRequest(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return "Request body must be a JSON object";
  }

  const req = body as Record<string, unknown>;

  // Validate mode
  if (!req.mode) {
    return "Missing required field: mode";
  }
  if (typeof req.mode !== "string") {
    return "Field 'mode' must be a string";
  }
  if (!VALID_MODES.includes(req.mode as AskAIMode)) {
    return `Invalid mode: ${req.mode}. Must be one of: ${VALID_MODES.join(", ")}`;
  }

  // Validate userPrompt
  if (!req.userPrompt) {
    return "Missing required field: userPrompt";
  }
  if (typeof req.userPrompt !== "string") {
    return "Field 'userPrompt' must be a string";
  }
  if (req.userPrompt.trim().length === 0) {
    return "Field 'userPrompt' cannot be empty";
  }

  // Validate context
  if (!req.context) {
    return "Missing required field: context";
  }
  if (typeof req.context !== "object" || req.context === null) {
    return "Field 'context' must be an object";
  }

  const context = req.context as Record<string, unknown>;

  // Validate context.selectedText
  if (!context.selectedText) {
    return "Missing required field: context.selectedText";
  }
  if (typeof context.selectedText !== "string") {
    return "Field 'context.selectedText' must be a string";
  }
  if (context.selectedText.trim().length === 0) {
    return "Field 'context.selectedText' cannot be empty";
  }

  // Validate brain (optional, but must be valid if provided)
  if (req.brain) {
    if (typeof req.brain !== "object" || req.brain === null) {
      return "Field 'brain' must be an object";
    }

    const brain = req.brain as Record<string, unknown>;

    // Validate brain structure (basic checks)
    if (brain.goal !== undefined && typeof brain.goal !== "string") {
      return "Field 'brain.goal' must be a string";
    }
    if (brain.constraints !== undefined && !Array.isArray(brain.constraints)) {
      return "Field 'brain.constraints' must be an array";
    }
    if (brain.glossary !== undefined && !Array.isArray(brain.glossary)) {
      return "Field 'brain.glossary' must be an array";
    }
    if (brain.decisions !== undefined && !Array.isArray(brain.decisions)) {
      return "Field 'brain.decisions' must be an array";
    }
  }

  return null; // Valid
}

/**
 * Parse JSON response from AI (for synthesize mode)
 * Extracts JSON from markdown code blocks or raw JSON
 */
function parseJSONResponse(text: string): AskAIResponse | null {
  try {
    // Try multiple extraction strategies

    // 1. Try to extract JSON from markdown code block (most common)
    const jsonBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonBlockMatch) {
      try {
        const jsonStr = jsonBlockMatch[1].trim();
        console.log("[AI API] Extracted from code block:", jsonStr.substring(0, 100));
        const parsed = JSON.parse(jsonStr);
        if (parsed.message && parsed.proposedText) {
          return {
            message: parsed.message,
            proposedText: parsed.proposedText,
          };
        }
      } catch (e) {
        console.error("[AI API] Failed to parse code block JSON:", e);
      }
    }

    // 2. Try to find JSON object anywhere in the text (greedy match)
    const jsonObjectMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonObjectMatch) {
      try {
        console.log("[AI API] Found JSON object:", jsonObjectMatch[0].substring(0, 100));
        const parsed = JSON.parse(jsonObjectMatch[0]);
        if (parsed.message && parsed.proposedText) {
          return {
            message: parsed.message,
            proposedText: parsed.proposedText,
          };
        }
      } catch (e) {
        console.error("[AI API] Failed to parse extracted JSON:", e);
      }
    }

    // 3. Try to parse the entire text as JSON (fallback)
    try {
      const parsed = JSON.parse(text.trim());
      if (parsed.message && parsed.proposedText) {
        return {
          message: parsed.message,
          proposedText: parsed.proposedText,
        };
      }
    } catch (e) {
      console.error("[AI API] Failed to parse full text as JSON:", e);
    }

    return null;
  } catch (error) {
    console.error("[AI API] JSON parse error:", error);
    return null;
  }
}

/**
 * Call Anthropic API with timeout
 */
async function callAnthropicWithTimeout(
  systemPrompt: string,
  userPrompt: string,
  mode: AskAIMode
): Promise<AskAIResponse> {
  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error("AI request timed out"));
    }, AI_TIMEOUT_MS);
  });

  // Create API call promise
  const apiPromise = (async () => {
    try {
      const message = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: AI_MAX_OUTPUT_TOKENS,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      });

      // Extract text from response
      const textContent = message.content.find((block) => block.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text content in AI response");
      }

      const responseText = textContent.text;

      // For synthesize mode, try to parse JSON
      if (mode === "synthesize") {
        console.log("[AI API] Raw response text (full):", responseText);
        console.log("[AI API] Response length:", responseText.length);
        const parsed = parseJSONResponse(responseText);
        if (parsed) {
          console.log("[AI API] Successfully parsed JSON:", {
            hasMessage: !!parsed.message,
            hasProposedText: !!parsed.proposedText,
            proposedTextLength: parsed.proposedText?.length
          });
          return parsed;
        }
        // Fallback: treat entire response as message if JSON parsing fails
        console.warn("[AI API] Failed to parse JSON in synthesize mode, falling back to plain text");
      }

      // For critique mode or fallback, return as plain message
      return {
        message: responseText,
      };
    } catch (error: any) {
      console.error("[AI API] Anthropic API error:", error.message);

      // Return user-friendly error message
      if (error.status === 401) {
        return {
          message: "Sorry—API key is invalid. Please check your configuration.",
        };
      }

      if (error.status === 429) {
        return {
          message: "Sorry—rate limit exceeded. Please try again in a moment.",
        };
      }

      return {
        message: "Sorry—AI request failed. Please try again.",
      };
    }
  })();

  // Race between API call and timeout
  try {
    return await Promise.race([apiPromise, timeoutPromise]);
  } catch (error: any) {
    if (error.message === "AI request timed out") {
      return {
        message: "Sorry—AI request took too long. Please try again.",
      };
    }
    throw error;
  }
}

/**
 * Handle non-POST requests
 */
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
