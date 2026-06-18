# Sage

AI-powered reflective dialogue platform that uses Socratic questioning to help people think through problems and discover their own insights. Supports both text chat with streaming LLM responses and real-time voice conversations.

## Features

- **Text Chat** -- Streaming LLM dialogue with phase-based conversation flow (opening, exploring, examining, challenging, expanding, synthesizing, concluding)
- **Real-Time Voice** -- Low-latency voice dialogue (~75ms TTS) powered by LiveKit, Deepgram STT, and ElevenLabs Flash v2.5 with multiple selectable voices
- **Ghost Mode** -- Unsaved conversations for private exploration with no data persistence
- **Conversation Insights** -- Automatic extraction of realizations, assumptions, patterns, and key questions during dialogue
- **User Profiles** -- Consolidated summaries built across sessions so Sage remembers context between conversations
- **Credit System** -- Token-based usage tracking with three purchasable tiers (Starter / Plus / Pro) via Paystack
- **3D Voice Orb** -- Three.js animated orb that visualizes voice activity during real-time sessions

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15, React 19, TypeScript |
| Database | PostgreSQL (Neon) via Prisma ORM |
| Auth | NextAuth v5 (Google OAuth + credentials) |
| LLM | OpenRouter (Claude Sonnet 4, GPT-4o Mini) |
| Voice (real-time) | LiveKit agents |
| Speech-to-Text | Deepgram |
| Text-to-Speech | ElevenLabs Flash v2.5 |
| Background Jobs | Inngest |
| Payments | Paystack |
| 3D | Three.js via React Three Fiber |
| Deployment | Docker (multi-stage build) |

## Project Structure

```
sage/
  app/                  # Next.js app router
    api/                # API routes (chat, conversations, payments, auth, livekit, inngest)
    auth/               # Sign-in / sign-up pages
    chat/               # Main chat page
    credits/            # Credit purchase page
    profile/            # User profile page
  agent/                # LiveKit voice agent (standalone Node.js service)
    src/agent.js        # Voice agent entry point
  components/           # React components
    voice-orb-3d/       # Three.js 3D orb visualization
    voice-chat.tsx      # Real-time voice chat UI
    sidebar.tsx         # Conversation history sidebar
    chat-input.tsx      # Chat input with model/voice selectors
    phase-indicator.tsx # Dialogue phase display
  lib/                  # Shared utilities
    prompts.ts          # Socratic system prompt and phase definitions
    credits.ts          # Credit calculation and management
    paystack.ts         # Paystack payment integration
    voices.ts           # ElevenLabs voice configuration
    models.ts           # Available LLM models
    inngest/            # Background job definitions
  prisma/
    schema.prisma       # Database schema
```

## Database Models

`User`, `Account`, `Session`, `VerificationToken`, `Conversation`, `Message`, `UsageRecord`, `ConversationInsight`, `UserInsight`, `Payment`

## Prerequisites

- Node.js 20+
- PostgreSQL database (or Neon serverless)
- Accounts / API keys for: OpenRouter, ElevenLabs, Deepgram, LiveKit, Paystack, Google OAuth

## Environment Variables

Create a `.env` file in the project root:

```
# Database
DATABASE_URL=

# Auth
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# LLM
OPENROUTER_API_KEY=

# Voice agent
OPENAI_API_KEY=
ELEVEN_API_KEY=
DEEPGRAM_API_KEY=

# LiveKit
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# Payments
PAYSTACK_SECRET_KEY=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Public (client-side)
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_LIVEKIT_URL=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
```

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma client and run migrations
npx prisma generate
npx prisma db push

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Voice Agent

The voice agent runs as a separate service that connects to LiveKit:

```bash
cd agent
npm install
node src/agent.js dev
```

## Docker

Build and run both the web app and voice agent:

```bash
docker compose up --build
```

This starts two services:

- **web** -- Next.js application on port 3001 (mapped to internal 3000)
- **agent** -- LiveKit voice agent

## Credit Packages

| Package | Credits | Price (NGN) |
|---|---|---|
| Starter | 500 | 1,000 |
| Plus | 1,500 | 2,500 |
| Pro | 5,000 | 7,000 |

New users receive 1,000 free credits on signup. Credits are consumed at a rate of 1 credit per 10 tokens.

## License

Private repository. All rights reserved.
