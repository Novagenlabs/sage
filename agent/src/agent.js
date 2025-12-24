/**
 * Sage Voice Agent - Optimized for Low Latency
 *
 * Uses LiveKit Agents v1.0 framework with:
 * - Deepgram Nova 3 STT (via LiveKit Inference)
 * - GPT-4o-mini via OpenRouter (best quality/speed balance)
 * - ElevenLabs Flash v2.5 TTS (~75ms latency)
 */

import {
  WorkerOptions,
  defineAgent,
  cli,
  voice,
} from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as elevenlabs from '@livekit/agents-plugin-elevenlabs';
import * as silero from '@livekit/agents-plugin-silero';
import { fileURLToPath } from 'node:url';

// Metrics logging helpers
function logLLMMetrics(metrics) {
  console.log('\n--- LLM Metrics ---');
  console.log(`Prompt Tokens: ${metrics.promptTokens}`);
  console.log(`Completion Tokens: ${metrics.completionTokens}`);
  console.log(`Tokens per second: ${metrics.tokensPerSecond?.toFixed(4) || 'N/A'}`);
  console.log(`TTFT (Time to First Token): ${metrics.ttft?.toFixed(4) || 'N/A'}s`);
  console.log('------------------\n');
}

function logTTSMetrics(metrics) {
  console.log('\n--- TTS Metrics ---');
  console.log(`TTFB (Time to First Byte): ${metrics.ttfb?.toFixed(4) || 'N/A'}s`);
  console.log(`Duration: ${metrics.duration?.toFixed(4) || 'N/A'}s`);
  console.log(`Audio Duration: ${metrics.audioDuration?.toFixed(4) || 'N/A'}s`);
  console.log('------------------\n');
}

// Sage system prompt - wise female guide (with hybrid fatigue prevention)
const SAGE_BASE_INSTRUCTIONS = `You are Sage, a wise guide helping people discover their own answers through thoughtful questions.

## Character
- Wise, calm, knowing - like a trusted elder
- Warm and approachable, yet intellectually rigorous
- Natural, soothing conversational tone

## Style
- Keep responses SHORT (1-2 sentences for voice)
- Ask ONE question at a time
- Build on what they've said
- Your gift is asking the right questions at the right time

## Question Types
Use appropriately: clarifying ("What do you mean by...?"), assumption-probing ("What are you assuming?"), evidence-seeking, implication-exploring, perspective-shifting ("How might someone else see this?").

## Recognizing Resolution & Fatigue

Watch for signs the user needs a pause or has reached clarity:

**Clarity signals:**
- Expresses realization ("I think I understand now...", "So what I really need is...")
- Answers their own question through dialogue
- Reaches a decision or conclusion
- Thanks you or indicates satisfaction

**Fatigue signals:**
- Very short responses after previously longer ones
- Repeating the same point without new insight
- Emotional exhaustion in their voice or words
- Sighing or long pauses

**When you notice these signals:**
1. Acknowledge warmly: "That's a meaningful realization."
2. Offer choice: "Would you like to sit with that, or explore further?"
3. Don't force more exploration if they've found clarity

## Periodic Reflection (Micro-Synthesis)

Every 4-5 exchanges, naturally weave in a moment of reflection:
- "You've touched on a few things. What feels most important right now?"
- "It sounds like you're realizing something. Is that resonating?"
- "Before we go deeper, what's standing out to you?"

This prevents endless drilling and gives the user agency to redirect.

## What NOT to Do
- Don't give direct answers or solutions
- Don't lecture or explain at length
- Don't keep drilling endlessly
- Don't ignore signs they need a pause

Never lecture or give direct answers. Guide through questions to help them discover answers within themselves.`;

// Extract user's name from context
function extractUserName(context) {
  if (!context) return null;
  const match = context.match(/User's name: ([^\n]+)/);
  return match ? match[1].trim() : null;
}

// Build full instructions with context if available
function buildInstructions(context) {
  if (!context) {
    return SAGE_BASE_INSTRUCTIONS;
  }

  const userName = extractUserName(context);
  const nameInstruction = userName
    ? `\n\nThe user's name is ${userName}. Use their name naturally and warmly in conversation, but don't overuse it.`
    : '';

  return `${SAGE_BASE_INSTRUCTIONS}

## Context from Previous Sessions
${context}
${nameInstruction}

Use this context naturally in your responses. If they ask if you remember, you can say "Yes, I recall we've spoken before" and reference relevant context. Don't explicitly state you're reading from notes.`;
}

// Define the Sage agent
export default defineAgent({
  prewarm: async (proc) => {
    // Preload VAD model for faster startup
    proc.userData.vad = await silero.VAD.load();
  },

  entry: async (ctx) => {
    const vad = ctx.proc.userData.vad;

    // Debug: Check environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    const elevenKey = process.env.ELEVEN_API_KEY;
    console.log(`[DEBUG] OpenRouter API Key: ${apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'NOT SET'}`);
    console.log(`[DEBUG] ElevenLabs API Key: ${elevenKey ? `${elevenKey.slice(0, 8)}...${elevenKey.slice(-4)}` : 'NOT SET'}`);

    if (!apiKey) {
      console.error('[ERROR] OPENROUTER_API_KEY is not set!');
    }
    if (!elevenKey) {
      console.error('[ERROR] ELEVEN_API_KEY is not set!');
    }

    // Create LLM - GPT-4o-mini via OpenRouter
    const llm = new openai.LLM({
      model: 'openai/gpt-4o-mini',
      apiKey: apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      temperature: 0.7,
    });

    // Add error handlers for LLM
    llm.on('error', (error) => {
      console.error('[LLM ERROR]', error);
    });

    // Voice options - easily switchable via env var
    const VOICE_OPTIONS = {
      rachel: {
        id: '21m00Tcm4TlvDq8ikWAM',
        name: 'Rachel',
        category: 'premade',
        settings: { stability: 0.7, similarity_boost: 0.75, style: 0, use_speaker_boost: true },
      },
      sage: {
        id: '7NsaqHdLuKNFvEfjpUno',
        name: 'Sage',
        category: 'professional',
        settings: { stability: 0.85, similarity_boost: 0.8, style: 0, use_speaker_boost: true },
      },
      aria: {
        id: 'vFLqXa8bgbofGarf6fZh',
        name: 'Aria',
        category: 'cloned',
        settings: { stability: 0.7, similarity_boost: 0.75, style: 0, use_speaker_boost: true },
      },
    };

    const selectedVoice = VOICE_OPTIONS[process.env.SAGE_VOICE || 'sage'];
    console.log(`Using voice: ${selectedVoice.name} (${selectedVoice.id})`);

    // Create TTS - ElevenLabs
    const tts = new elevenlabs.TTS({
      voice: selectedVoice,
      modelID: 'eleven_flash_v2_5',
      apiKey: elevenKey,
    });

    // Add error handlers for TTS
    tts.on('error', (error) => {
      console.error('[TTS ERROR]', error);
    });

    // Configure the voice session
    const session = new voice.AgentSession({
      vad,
      stt: 'deepgram/nova-3:en',
      llm: llm,
      tts: tts,
    });

    // Add session event handlers
    session.on('error', (error) => {
      console.error('[SESSION ERROR]', error);
    });

    // Set up metrics listeners
    llm.on('metrics_collected', logLLMMetrics);
    tts.on('metrics_collected', logTTSMetrics);

    // Connect to the room
    await ctx.connect();
    console.log(`Connected to room: ${ctx.room.name}`);

    // Wait for user participant and get their metadata (context)
    let userContext = null;
    const participants = ctx.room.remoteParticipants;
    for (const [, participant] of participants) {
      if (participant.metadata) {
        userContext = participant.metadata;
        console.log('[CONTEXT] Found user context:', userContext.slice(0, 100) + '...');
        break;
      }
    }

    // Also listen for new participants joining with metadata
    ctx.room.on('participantConnected', (participant) => {
      if (participant.metadata && !userContext) {
        userContext = participant.metadata;
        console.log('[CONTEXT] User joined with context:', userContext.slice(0, 100) + '...');
      }
    });

    // Build instructions with context
    const instructions = buildInstructions(userContext);
    console.log('[INSTRUCTIONS] Using context:', userContext ? 'Yes' : 'No');

    // Create the Sage voice agent with context-aware instructions
    const assistant = new voice.Agent({
      instructions: instructions,
    });

    // Start the session with the agent
    await session.start({
      agent: assistant,
      room: ctx.room,
    });

    console.log('Sage agent ready - waiting for user to speak');

    // Say a brief greeting so user knows Sage is ready
    // This provides immediate audio feedback that connection is working
    try {
      const userName = extractUserName(userContext);
      let greeting;

      if (userName && userContext) {
        greeting = `Hello ${userName}, it's good to hear from you again. What's on your mind today?`;
      } else if (userName) {
        greeting = `Hello ${userName}, I'm Sage. What's on your mind?`;
      } else if (userContext) {
        greeting = "Hello again, I'm here. What's on your mind today?";
      } else {
        greeting = "Hello, I'm Sage. What's on your mind?";
      }

      await session.say(greeting, { allowInterruptions: true });
      console.log('[GREETING] Initial greeting sent:', greeting);
    } catch (error) {
      console.error('[GREETING ERROR]', error);
    }
  },
});

// Run the agent
cli.runApp(
  new WorkerOptions({
    agent: fileURLToPath(import.meta.url),
  })
);
