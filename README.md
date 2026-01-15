# Workshop

Workshop is a Notion-like writing and ideation editor with a **persistent AI collaborator**. The AI behaves like a **margin editor**: scoped, quiet, contextual, and respectful of author intent.

The goal is to explore **true human-AI collaboration for creative work**, especially writing, thinking, and iteration.

[Video Demo](https://www.loom.com/share/338830bbc54e4d7f8848f8091f87a1b3)

## Features

- **Selection-Aware AI Collaborator** - Highlight text and ask AI for critique or synthesis
- **Persistent Project Brain** - Maintain structured context (goals, constraints, glossary, decisions)
- **Patch Suggestions** - AI proposes rewrites that you can accept or reject
- **Comment Threads** - Collaborate with AI through margin comments
- **Tiptap Editor** - Rich text editing with keyboard shortcuts
- **Local Storage** - All data persisted locally in your browser

## Prerequisites

- Node.js (v14 or higher)
- Anthropic API key

## Setup

Clone the repository:

```bash
git clone https://github.com/SaiNel7/workshop.git
cd workshop
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file in the root directory:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
AI_MODEL=claude-sonnet-4-5-20250929
```

## Running the Application

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to http://localhost:3000

## Usage

1. **Create a document** - Click "New document" in the sidebar
2. **Write content** - Start typing in the editor
3. **Ask AI** - Highlight text and click "Ask AI" to open a comment thread
4. **Choose mode**:
   - **Critique** - Get feedback and suggestions (concise responses)
   - **Synthesize** - Get rewrite proposals with accept/reject options
5. **Manage comments** - View all comments in the right sidebar
6. **Accept/Reject patches** - Review AI suggestions and apply or dismiss them

## Building for Production

```bash
npm run build
npm start
```

## Design Philosophy

1. **AI is non-intrusive** - AI never acts unless explicitly invoked
2. **AI works locally, not globally** - Focuses on selected text and nearby context
3. **AI collaborates via comments** - Responses live in comment threads
4. **Authorship stays with the human** - All AI edits are Accept/Reject
5. **Memory is explicit** - Project Brain updates only with user confirmation

## v2 Roadmap

- Image integration in editor
- External sources attachable in project brain
- Include neighboring writer's notes (comment threads) in context
- Implement cleaner undo/redo for patch suggestions
- Export to .doc or .pdf
- Data privacy features
- Security and authentication
- Word editor extra functionality: word/char count
- Specialize for more niche use cases
- Write better emails (email composition assistant)
- For PMs: ingest feature specs and legacy documentation to help write PRDs
