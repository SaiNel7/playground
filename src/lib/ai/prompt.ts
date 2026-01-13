// Prompt construction for the margin editor AI
// Encodes the product constitution from CLAUDE.md

import type { AskAIRequest } from "./schema";

/**
 * Builds the system and user prompts for the AI margin editor.
 * Reflects the core design principles: non-intrusive, local, concise, respectful.
 */
export function buildMarginEditorPrompt(req: AskAIRequest): {
  system: string;
  user: string;
} {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(req);

  return {
    system: systemPrompt,
    user: userPrompt,
  };
}

/**
 * System prompt encoding the AI's identity and behavior constraints.
 */
function buildSystemPrompt(): string {
  return `You are a calm, respectful margin editor—a collaborator who helps writers think clearly.

Core behavior:
- You only respond when explicitly asked; never offer unsolicited follow-ups
- Focus exclusively on the selected text and its immediate context
- Provide concise, actionable feedback (target 50-100 words unless asked otherwise)
- Respect the writer's voice and intent; suggest, never dictate
- If the user's intent is unclear, ask at most ONE clarifying question instead of guessing

Constraints:
- Work locally—do not suggest changes outside the selection
- Stay quiet after responding (no "Anything else?" or "Let me know if...")
- Do not hallucinate sources; if unsure, say so
- The writer has final authority over all changes
- Respect the Project Brain (goal, constraints, glossary, decisions) when provided

You are helping a writer think, not writing for them. Be a margin comment, not an essay.`;
}

/**
 * User prompt structuring the specific request with full context.
 */
function buildUserPrompt(req: AskAIRequest): string {
  const parts: string[] = [];

  // Mode and user's request
  parts.push(`**Mode**: ${req.mode}`);
  parts.push(`**User's request**: ${req.userPrompt}`);
  parts.push("");

  // Selected text (primary focus)
  parts.push("**Selected text**:");
  parts.push(req.context.selectedText);
  parts.push("");

  // Local context (surrounding paragraphs)
  if (req.context.localContext) {
    parts.push("**Context** (surrounding text):");
    parts.push(req.context.localContext);
    parts.push("");
  }

  // Document structure
  if (req.context.outline) {
    parts.push("**Document structure**:");
    parts.push(req.context.outline);
    parts.push("");
  }

  // Project Brain
  const brain = req.brain;
  if (brain.goal || brain.constraints.length > 0 || brain.glossary.length > 0 || brain.decisions.length > 0) {
    parts.push("**Project Brain**:");

    if (brain.goal) {
      parts.push(`Goal: ${brain.goal}`);
    }

    if (brain.constraints.length > 0) {
      parts.push(`Constraints: ${brain.constraints.join(", ")}`);
    }

    if (brain.glossary.length > 0) {
      parts.push("Glossary:");
      brain.glossary.forEach(({ term, definition }) => {
        parts.push(`  - ${term}: ${definition}`);
      });
    }

    if (brain.decisions.length > 0) {
      parts.push("Past decisions:");
      brain.decisions.forEach(({ text }) => {
        parts.push(`  - ${text}`);
      });
    }

    parts.push("");
  }

  // Full document (only if explicitly provided)
  if (req.context.fullDocText) {
    parts.push("**Full document** (for reference only):");
    parts.push(req.context.fullDocText);
    parts.push("");
  }

  // Sources (future feature)
  if (req.context.sources && req.context.sources.length > 0) {
    parts.push("**Attached sources**:");
    req.context.sources.forEach((source) => {
      parts.push(`- ${source.title}: ${source.excerpt}`);
    });
    parts.push("");
  }

  // Final instruction based on mode
  if (req.mode === "critique") {
    parts.push("Provide feedback on the selected text. Be specific and constructive.");
  } else if (req.mode === "synthesize") {
    parts.push("Suggest an improved version of the selected text. Keep the writer's voice and intent.");
    parts.push("");
    parts.push("**IMPORTANT**: Return your response as JSON with this exact structure:");
    parts.push('```json');
    parts.push('{');
    parts.push('  "message": "Brief explanation of your changes (50-100 words)",');
    parts.push('  "proposedText": "Your improved version of the selected text"');
    parts.push('}');
    parts.push('```');
    parts.push("");
    parts.push("The proposedText must be a direct replacement for the selected text only—do not include surrounding context.");
  }

  return parts.join("\n");
}
