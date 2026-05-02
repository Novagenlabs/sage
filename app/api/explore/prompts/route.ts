import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasEnoughCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_CREDITS = 2;

export type ExplorePrompt = {
  title: string; // 2-3 words, lowercase
  est: string; // human duration like "5 min"
  prompt: string; // first-message seed sent to chat
  color: string; // tailwind bg utility
  accent: string; // tailwind gradient-from utility
};

export type ExploreSection = {
  section: string; // lowercase category
  blurb: string; // 1-sentence subhead
  items: ExplorePrompt[]; // exactly 2
};

// Static seed used when:
//   - the user has no profile context yet (brand new account), or
//   - the LLM call fails / OpenRouter is unavailable.
const FALLBACK: ExploreSection[] = [
  {
    section: "creativity",
    blurb:
      "your daily dose of inspiration. spark lateral thinking and marvel at the ideas in your mind.",
    items: [
      {
        title: "reverse thinking",
        est: "5 min",
        color: "bg-ember-500/15",
        accent: "from-ember-500/30",
        prompt:
          "I want to do a reverse-thinking exercise. Pick something I'm trying to achieve, then ask me how I would guarantee the opposite outcome. Walk me through it step by step until I see the obstacles I'd been ignoring.",
      },
      {
        title: "magical realism",
        est: "5 min",
        color: "bg-bloom-400/15",
        accent: "from-bloom-400/30",
        prompt:
          "Help me explore an idea I have through magical realism. Ask me what's mundane about my situation, then nudge me to imagine one impossible thing about it that would change everything.",
      },
    ],
  },
  {
    section: "emotion",
    blurb: "tune into how you actually feel — name it, sit with it, move through it.",
    items: [
      {
        title: "what's underneath",
        est: "8 min",
        color: "bg-plum-400/15",
        accent: "from-plum-400/30",
        prompt:
          "I want to dig under a feeling I've been having. Ask me what I'm feeling on the surface, then guide me one layer at a time toward what's actually underneath. Don't let me settle for the first answer.",
      },
      {
        title: "dread inventory",
        est: "6 min",
        color: "bg-chamber-700/40",
        accent: "from-ember-500/20",
        prompt:
          "Help me do a dread inventory. Ask me what I've been avoiding lately — calls, decisions, conversations, feelings. List them out. Then ask which one, if I named it honestly, would loosen the most.",
      },
    ],
  },
  {
    section: "decision",
    blurb: "for the tough calls. lay it out, weigh it, hear yourself.",
    items: [
      {
        title: "the 10/10/10",
        est: "7 min",
        color: "bg-peach-500/20",
        accent: "from-ember-500/30",
        prompt:
          "Walk me through a 10/10/10 on a decision I'm sitting with. Ask me how I'll feel about this choice in 10 minutes, 10 months, and 10 years. Don't let me rush past any of the three.",
      },
      {
        title: "fork in the road",
        est: "10 min",
        color: "bg-gold-400/15",
        accent: "from-gold-400/30",
        prompt:
          "I'm stuck between two paths. Help me lay them both out — what each one costs, what each one gives me, and what I'm avoiding by not choosing. Ask me what I'd pick if no one would judge me.",
      },
    ],
  },
];

// Palette pool the LLM gets to pick from. We hard-validate against this so
// the model can't write through arbitrary tailwind classes.
const PALETTE = [
  { color: "bg-ember-500/15", accent: "from-ember-500/30" },
  { color: "bg-bloom-400/15", accent: "from-bloom-400/30" },
  { color: "bg-plum-400/15", accent: "from-plum-400/30" },
  { color: "bg-peach-500/20", accent: "from-peach-500/30" },
  { color: "bg-gold-400/15", accent: "from-gold-400/30" },
  { color: "bg-sage-400/15", accent: "from-sage-400/30" },
  { color: "bg-chamber-700/40", accent: "from-ember-500/20" },
];

const GENERATE_PROMPT = `You write personalised "explore" prompts for Sage — a Socratic dialogue companion.
You'll receive an abstracted memory of one user (no specifics, just patterns)
and you produce 3 sections × 2 prompts each that would feel useful for THIS person right now.

CRITICAL — perspective:
Each "prompt" is the USER's first message TO Sage. It is what the user types
to start a guided session. Write it from the user's first-person voice asking
Sage for help. Use "I" and "me" for the user, "you" for Sage.

  ✅ "I want to do a 10/10/10 on a decision I'm sitting with. Walk me through
     how I'll feel about this choice in 10 minutes, 10 months, and 10 years.
     Don't let me rush past any of the three."
  ✅ "Help me dig under a feeling I've been having. Ask me what I'm feeling
     on the surface, then guide me one layer at a time toward what's
     actually underneath."

  ❌ "I'd like to help you examine the tension between..."  (wrong — sounds
     like Sage talking to the user)
  ❌ "Let's explore what's been weighing on you."           (wrong — same issue)
  ❌ "Tell me about a time when..."                          (wrong — Sage's voice)

Output rules:
- Return JSON ONLY. No markdown, no preamble.
- 3 sections. Each section name is one lowercase word (e.g. "creativity", "emotion", "decision", "rest", "purpose", "courage", "boundaries").
- Each section: a one-sentence lowercase blurb + exactly 2 items.
- Each item:
  - title: 2-3 lowercase words, evocative, non-clinical (e.g. "what's underneath", "fork in the road", "10/10/10")
  - est: humanised duration like "5 min", "8 min", "10 min"
  - prompt: 2-4 sentences in the user's voice asking Sage to lead a specific
    exercise. Specific, not generic. Avoids "explore", "journey", "delve",
    "unpack" — those are dead.

Style:
- Lean into the user's recurring patterns where you can — without naming any specifics that could re-identify them or anyone else.
- Mix gentle/structural exercises (10/10/10, fork-in-the-road) with sharper/emotional ones (dread inventory, what's underneath).
- Don't repeat any of the patterns already used in their recent sessions verbatim — surface adjacent angles instead.

Self-check before returning: open each "prompt" and ask "is this the user
asking Sage for something, or Sage talking to the user?" If it sounds like
the second, rewrite it.

Schema:
{
  "sections": [
    {
      "section": string,
      "blurb": string,
      "items": [
        { "title": string, "est": string, "prompt": string },
        { "title": string, "est": string, "prompt": string }
      ]
    },
    ...
  ]
}`;

function pickPalette(idx: number) {
  return PALETTE[idx % PALETTE.length];
}

type LlmItem = { title?: string; est?: string; prompt?: string };
type LlmSection = { section?: string; blurb?: string; items?: LlmItem[] };
type LlmResp = { sections?: LlmSection[] };

function normalize(raw: LlmResp | null): ExploreSection[] | null {
  if (!raw?.sections || !Array.isArray(raw.sections)) return null;

  const sections: ExploreSection[] = [];
  let paletteIdx = 0;
  for (const s of raw.sections.slice(0, 3)) {
    if (typeof s.section !== "string" || typeof s.blurb !== "string") continue;
    const items: ExplorePrompt[] = [];
    for (const it of (s.items ?? []).slice(0, 2)) {
      if (
        typeof it.title !== "string" ||
        typeof it.prompt !== "string" ||
        typeof it.est !== "string"
      )
        continue;
      const swatch = pickPalette(paletteIdx++);
      items.push({
        title: it.title.toLowerCase().slice(0, 40),
        est: it.est.slice(0, 12),
        prompt: it.prompt.slice(0, 600),
        color: swatch.color,
        accent: swatch.accent,
      });
    }
    if (items.length === 2) {
      sections.push({
        section: s.section.toLowerCase().split(/\s+/)[0].slice(0, 24),
        blurb: s.blurb.toLowerCase(),
        items,
      });
    }
  }
  return sections.length === 3 ? sections : null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json(FALLBACK);
  }
  const userId = session.user.id;

  // Pull the user's context the same way text/voice do.
  const [user, recent] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { profileSummary: true },
    }),
    prisma.conversation.findMany({
      where: { userId, summary: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: { summary: true },
      take: 5,
    }),
  ]);

  const hasContext =
    !!user?.profileSummary || recent.some((c) => c.summary);

  // Brand-new users get the static seed — nothing to personalise on yet.
  if (!hasContext) {
    return Response.json(FALLBACK);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(FALLBACK);
  }

  // Light credit gate. If they're broke we just serve the fallback rather
  // than 402 — explore should always render something.
  if (!(await hasEnoughCredits(userId, MIN_CREDITS))) {
    return Response.json(FALLBACK);
  }

  const contextBlock = [
    user?.profileSummary
      ? `## What I Know About This Person\n${user.profileSummary}`
      : "",
    recent.length > 0
      ? `## Recent Sessions\n${recent
          .map((c) => `- ${c.summary}`)
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const resp = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          "X-Title": "Sage - Explore",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: GENERATE_PROMPT },
            { role: "user", content: contextBlock },
          ],
          temperature: 0.85,
          max_tokens: 1024,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!resp.ok) {
      console.error("[explore] LLM error:", resp.status);
      return Response.json(FALLBACK);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return Response.json(FALLBACK);

    let parsed: LlmResp | null = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          /* fall through */
        }
      }
    }

    const sections = normalize(parsed);
    if (!sections) return Response.json(FALLBACK);

    return Response.json(sections);
  } catch (err) {
    console.error("[explore] generation failed:", err);
    return Response.json(FALLBACK);
  }
}
