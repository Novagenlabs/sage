// Hand-curated initial Resource catalog for Sage's recommendation engine.
//
// CURATION RULE — every item must satisfy at least one of:
//   1. Plays in-app — YouTube embed, Spotify episode, direct audio file.
//   2. Reads in one click on a public, paywall-free page.
//
// This rules out "Wikipedia article about a copyrighted book the user
// would have to go buy." We replaced those with TED talks, Project
// Gutenberg / Wikisource, free essays, and foundation-archive URLs.
//
// Themes are intentionally PATTERN-LEVEL ("isolation-of-insight",
// "decision-paralysis"), not generic categories — they're what the matcher
// LLM uses to bridge user signal to a resource.
//
// Idempotent: upserts on (title, author). Re-running the seed refreshes
// blurb/themes/why/url for retained items. After upsert, any active
// Resource NOT in the SEED list below is marked isActive: false (preserves
// existing recommendation rows but hides dropped items from new matches).
//
// Run with: npx tsx prisma/seed-resources.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedResource {
  type: "book" | "article" | "lecture" | "podcast" | "video" | "audiobook";
  title: string;
  author: string;
  url: string;
  blurb: string;
  themes: string[];
  why: string;
}

const SEED: SeedResource[] = [
  // ── Public-domain texts (full read in browser, no paywall) ────────────
  {
    type: "book",
    title: "Meditations",
    author: "Marcus Aurelius",
    url: "https://www.gutenberg.org/ebooks/2680",
    blurb:
      "The private notebooks of a Roman emperor: daily reminders to do the work, accept what isn't yours to control, and remember death.",
    themes: [
      "control-vs-acceptance",
      "daily-practice",
      "mortality",
      "duty-as-anchor",
    ],
    why: "When someone is exhausted from trying to control what isn't theirs to control. The Long translation is in the public domain — entire book reads in a browser tab.",
  },
  {
    type: "book",
    title: "Tao Te Ching",
    author: "Lao Tzu",
    url: "https://www.gutenberg.org/ebooks/216",
    blurb:
      "The classic of letting go, non-doing (wu-wei), and the strength of yielding.",
    themes: [
      "wu-wei",
      "non-action",
      "simplicity",
      "letting-go",
      "control-vs-acceptance",
    ],
    why: "When the pattern is over-control — gripping for an outcome that pushing harder won't produce. James Legge's full PD translation, free to read.",
  },
  {
    type: "book",
    title: "Siddhartha",
    author: "Hermann Hesse",
    url: "https://www.gutenberg.org/ebooks/2500",
    blurb:
      "A young man leaves home to find truth — first in renunciation, then in indulgence, finally beside a river that knows more than either.",
    themes: ["seeking", "identity", "river-as-metaphor", "the-long-detour"],
    why: "When someone has been seeking for so long they've forgotten what they were looking for. 1922 — public domain in the US, full text on Gutenberg.",
  },
  {
    type: "book",
    title: "Letters to a Young Poet",
    author: "Rainer Maria Rilke",
    url: "https://en.wikisource.org/wiki/Letters_to_a_Young_Poet",
    blurb:
      "Ten letters of patient counsel to a young writer: live the questions, do not seek answers prematurely, the difficulty itself is the work.",
    themes: ["patience", "becoming", "doubt-as-mentor", "living-the-questions"],
    why: "When someone is impatient with their own becoming — wanting an answer or a destination. Rilke's posture is the antidote.",
  },

  // ── TED talks (free, with transcripts) ────────────────────────────────
  {
    type: "video",
    title: "Plato's Allegory of the Cave",
    author: "TED-Ed (Alex Gendler)",
    url: "https://www.youtube.com/watch?v=1RWOpQXTltA",
    blurb:
      "A short animated retelling of Plato's parable: prisoners chained in a cave, mistaking shadows for reality, and the one who escapes — and what happens when he tries to return.",
    themes: [
      "isolation-of-insight",
      "awakening",
      "alienation-from-others",
      "seeing-what-others-cant",
      "frustration-with-others-blindness",
    ],
    why: "For anyone who has 'seen something' — about themselves, a relationship, a system — and feels lonely or frustrated when the people closest to them can't see it too.",
  },
  {
    type: "video",
    title: "The Power of Vulnerability",
    author: "Brené Brown",
    url: "https://www.ted.com/talks/brene_brown_the_power_of_vulnerability",
    blurb:
      "Brown's research on connection, the cost of armoring up, and what 'whole-hearted' people have in common.",
    themes: [
      "shame",
      "vulnerability",
      "hiding-from-others",
      "whole-heartedness",
    ],
    why: "When the pattern is keeping people at arm's length to stay safe — and Sage notices the cost of that protection.",
  },
  {
    type: "video",
    title: "The Paradox of Choice",
    author: "Barry Schwartz",
    url: "https://www.ted.com/talks/barry_schwartz_the_paradox_of_choice",
    blurb:
      "Schwartz's TED talk on why infinite options produce paralysis, regret, and chronic dissatisfaction — and the difference between maximisers and satisficers.",
    themes: [
      "decision-paralysis",
      "maximizing-vs-satisficing",
      "regret",
      "freedom-as-constraint",
    ],
    why: "When the problem isn't a lack of options but the burden of having too many — and the doubt that follows every choice.",
  },
  {
    type: "video",
    title: "The Secret to Desire in a Long-Term Relationship",
    author: "Esther Perel",
    url: "https://www.ted.com/talks/esther_perel_the_secret_to_desire_in_a_long_term_relationship",
    blurb:
      "Perel's TED talk on the central paradox of long-term partnership: we want safety AND aliveness, and they pull against each other.",
    themes: [
      "long-term-relationships",
      "desire",
      "distance",
      "intimacy-vs-aliveness",
    ],
    why: "When the relationship is stable but quiet — and someone is wondering what they're doing wrong.",
  },
  {
    type: "video",
    title: "12 Truths I Learned From Life and Writing",
    author: "Anne Lamott",
    url: "https://www.ted.com/talks/anne_lamott_12_truths_i_learned_from_life_and_writing",
    blurb:
      "Lamott's TED talk: twelve hard-won pieces of wisdom about creative work, perfectionism, and starting again every morning.",
    themes: [
      "perfectionism",
      "creative-block",
      "starting-anyway",
      "self-criticism",
    ],
    why: "When perfectionism is keeping someone from beginning at all. Lamott's voice is permission.",
  },
  {
    type: "video",
    title: "Listening to Shame",
    author: "Brené Brown",
    url: "https://www.ted.com/talks/brene_brown_listening_to_shame",
    blurb:
      "Brown's follow-up TED talk on the difference between guilt and shame — and how naming shame robs it of power.",
    themes: [
      "shame",
      "self-criticism",
      "guilt-vs-shame",
      "trance-of-unworthiness",
    ],
    why: "When someone is using the word guilt but Sage hears shame — the I-am-bad versus I-did-bad distinction.",
  },

  // ── Famous speeches (free, public archive or YouTube) ─────────────────
  {
    type: "video",
    title: "Stanford Commencement Address (2005)",
    author: "Steve Jobs",
    url: "https://news.stanford.edu/2005/06/14/jobs-061505/",
    blurb:
      "Three stories: connecting the dots backward, love and loss, and death. Stanford has the full video and transcript.",
    themes: ["calling", "mortality", "follow-your-bliss", "what-matters"],
    why: "When someone is sleepwalking through a path they didn't really choose. Jobs's 'don't waste it living someone else's life' is the kind of slap that lands.",
  },
  {
    type: "article",
    title: "This Is Water",
    author: "David Foster Wallace",
    url: "https://fs.blog/david-foster-wallace-this-is-water/",
    blurb:
      "DFW's 2005 Kenyon commencement address. The default-setting parable about what it actually takes to be conscious in adult life.",
    themes: [
      "awareness",
      "default-mode",
      "self-centeredness",
      "the-everyday-as-spiritual",
    ],
    why: "When the conversation is about boredom, irritation, the supermarket-at-rush-hour aspect of being alive — and choosing what to think about.",
  },
  {
    type: "article",
    title: "Letter from Birmingham Jail",
    author: "Martin Luther King Jr.",
    url: "https://www.africa.upenn.edu/Articles_Gen/Letter_Birmingham.html",
    blurb:
      "Written from a cell in 1963 in response to white clergy who told him to wait. A masterclass in moral clarity under pressure.",
    themes: [
      "moral-clarity",
      "patience-vs-urgency",
      "speaking-up",
      "what-justice-asks",
    ],
    why: "When someone is being told to wait for justice they can already see is overdue. Or when they're the one telling someone else to wait.",
  },
  {
    type: "article",
    title: "The Transformation of Silence into Language and Action",
    author: "Audre Lorde",
    url: "https://www.lehigh.edu/~ineng/syll/syll-transformation_of_silence.pdf",
    blurb:
      "Lorde's 1977 talk: the cost of staying quiet, the freedom that comes when you finally don't.",
    themes: ["speaking-up", "shame", "self-betrayal", "voice"],
    why: "When someone has been silent so long they've started to confuse their silence for safety.",
  },

  // ── Long-form free essays / blog posts ────────────────────────────────
  {
    type: "article",
    title: "The Tail End",
    author: "Tim Urban",
    url: "https://waitbutwhy.com/2015/12/the-tail-end.html",
    blurb:
      "Tim Urban draws out a life in months — and especially how few times you'll see the people you love. Quiet gut-punch in essay form.",
    themes: ["mortality", "what-matters", "time", "deathbed-clarity"],
    why: "When someone is putting off seeing a parent or a friend because there'll be time later. Urban shows there isn't as much later as we think.",
  },
  {
    type: "article",
    title: "The Crossroads of Should and Must",
    author: "Elle Luna",
    url: "https://medium.com/@elleluna/the-crossroads-of-should-and-must-90c75eb7c5b0",
    blurb:
      "A short, illustrated essay about choosing the path you must walk — even when the path you should walk looks safer.",
    themes: ["calling", "vocation", "should-vs-must", "self-betrayal"],
    why: "When someone is at a fork between the safe path and the truer one, and naming the difference makes it harder to keep ignoring.",
  },
  {
    type: "article",
    title: "The Top Five Regrets of the Dying",
    author: "Bronnie Ware",
    url: "https://bronnieware.com/blog/regrets-of-the-dying/",
    blurb:
      "A palliative-care nurse's record of the regrets her dying patients spoke aloud — none of them about money or status. The original blog post that became a book.",
    themes: ["regret", "authentic-life", "what-matters", "deathbed-clarity"],
    why: "When someone is choosing the safe path against the truer one, and the cost isn't yet visible.",
  },
  {
    type: "article",
    title: "Total Eclipse",
    author: "Annie Dillard",
    url: "https://www.theatlantic.com/magazine/archive/2017/08/annie-dillards-classic-total-eclipse-essay/536271/",
    blurb:
      "Dillard's 1982 essay on watching a total eclipse. The most precise English-language description of what it feels like when the floor of reality drops away.",
    themes: ["awe", "groundlessness", "small-self", "the-numinous"],
    why: "When someone has had an experience that broke their frame and they don't have words for it yet.",
  },

  // ── Foundation/teacher archives (audio + video lectures, free) ────────
  // URLs go to the official archive home so you can swap them for a
  // specific episode/talk via /admin/resources when you've picked one.
  {
    type: "lecture",
    title: "On Loneliness",
    author: "Jiddu Krishnamurti",
    url: "https://jkrishnamurti.org/content/loneliness",
    blurb:
      "Krishnamurti distinguishes loneliness (a state of inner poverty we run from) from aloneness (intimacy with what is). Free lectures in the official KFA archive.",
    themes: [
      "loneliness",
      "aloneness",
      "running-from-self",
      "solitude-vs-isolation",
    ],
    why: "When loneliness is the surface complaint but the deeper story is the inability to be alone with oneself.",
  },
  {
    type: "lecture",
    title: "On Fear",
    author: "Jiddu Krishnamurti",
    url: "https://jkrishnamurti.org/content/fear",
    blurb:
      "Krishnamurti on the difference between fear of a real thing and the fear that lives in the mind — and what looking at it directly does.",
    themes: ["fear", "conditioning", "escape-mechanisms", "looking-directly"],
    why: "When someone is constantly afraid of something but can't pin down what.",
  },
  {
    type: "lecture",
    title: "The Real You",
    author: "Alan Watts",
    url: "https://alanwatts.org/transcripts/the-real-you/",
    blurb:
      "Watts on the costume of personality and the question 'who is the one who is asking?' Free transcript and audio in the official Alan Watts archive.",
    themes: ["identity", "ego", "self-as-construction", "who-am-i"],
    why: "When someone is sitting with the feeling of not knowing who they really are — beyond roles, beyond performance.",
  },

  // ── Free podcast episodes / interviews ────────────────────────────────
  {
    type: "podcast",
    title: "Where Should We Begin?",
    author: "Esther Perel",
    url: "https://whereshouldwebegin.estherperel.com/",
    blurb:
      "Couples therapy, in real sessions, with permission. Eavesdropping that teaches you about your own relationships. Free first episode of every season.",
    themes: ["relationships", "couples", "communication", "rupture-and-repair"],
    why: "When the conversation is about a specific relational dynamic and hearing it played out elsewhere helps name it.",
  },
  {
    type: "podcast",
    title: "On Being",
    author: "Krista Tippett",
    url: "https://onbeing.org/series/podcast/",
    blurb:
      "Long-form conversations with poets, scientists, theologians, activists — about the questions that don't have easy answers. Full archive free.",
    themes: [
      "meaning-making",
      "listening",
      "the-big-questions",
      "spiritual-but-not-religious",
    ],
    why: "When someone wants to hear a real conversation between thoughtful adults about what's actually hard.",
  },
  {
    type: "podcast",
    title: "John O'Donohue — The Inner Landscape of Beauty",
    author: "On Being / Krista Tippett",
    url: "https://onbeing.org/programs/john-odonohue-the-inner-landscape-of-beauty/",
    blurb:
      "One of the most-played episodes of On Being. Celtic mystic O'Donohue on friendship, beauty, longing, and the soul. Recorded shortly before his death.",
    themes: ["friendship", "soul", "longing", "belonging", "beauty"],
    why: "When the conversation is about loneliness or longing in a way that wants softer language than therapy.",
  },

  // ── Practice / guided audio ───────────────────────────────────────────
  {
    type: "audiobook",
    title: "The RAIN of Self-Compassion",
    author: "Tara Brach",
    url: "https://www.tarabrach.com/rain/",
    blurb:
      "Tara Brach's free guided meditation: a four-step practice (Recognize, Allow, Investigate, Nurture) for meeting yourself when you're being merciless with yourself.",
    themes: [
      "self-criticism",
      "trance-of-unworthiness",
      "self-compassion",
      "acceptance",
    ],
    why: "When someone is being cruel to themselves and would benefit from being walked through the practice instead of just being told about it.",
  },
  {
    type: "video",
    title: "ACT in a Nutshell",
    author: "Russ Harris",
    url: "https://www.actmindfully.com.au/free-stuff/free-videos/",
    blurb:
      "Russ Harris's free intro videos to Acceptance and Commitment Therapy: stop fighting your thoughts, clarify your values, take action anyway.",
    themes: [
      "avoidance",
      "values-clarification",
      "defusion",
      "experiential-avoidance",
    ],
    why: "When someone is in a long fight with their own thoughts. ACT changes the fight to a question of direction.",
  },

  // ── Working from inside the catalog of accessible long classics ───────
  {
    type: "lecture",
    title: "The Hero's Adventure (The Power of Myth, Ep. 1)",
    author: "Joseph Campbell, with Bill Moyers",
    url: "https://www.jcf.org/learn/the-hero-with-a-thousand-faces",
    blurb:
      "Campbell on myth as a map for the inner life. The Joseph Campbell Foundation hosts the conversations and supplementary writings.",
    themes: ["hero-journey", "calling", "follow-your-bliss", "meaning-making"],
    why: "When someone is sensing a calling but can't quite name it — or is afraid to.",
  },
  {
    type: "podcast",
    title: "David Whyte — Living the Questions",
    author: "On Being / Krista Tippett",
    url: "https://onbeing.org/programs/david-whyte-the-conversational-nature-of-reality/",
    blurb:
      "Poet David Whyte on the three marriages — to another, to work, and to self — and the impossibility of bargaining one against the others.",
    themes: ["work-self-other", "integration", "belonging", "vocation"],
    why: "When someone is splitting themselves between work and relationship and feeling no part of them is getting enough.",
  },
];

async function main() {
  console.log(`Seeding ${SEED.length} resources...`);
  let created = 0;
  let updated = 0;
  for (const item of SEED) {
    const existing = await prisma.resource.findFirst({
      where: { title: item.title, author: item.author },
    });
    if (existing) {
      await prisma.resource.update({
        where: { id: existing.id },
        data: {
          type: item.type,
          url: item.url,
          blurb: item.blurb,
          themes: item.themes,
          why: item.why,
          isActive: true,
        },
      });
      updated++;
    } else {
      await prisma.resource.create({
        data: {
          type: item.type,
          title: item.title,
          author: item.author,
          url: item.url,
          blurb: item.blurb,
          themes: item.themes,
          why: item.why,
        },
      });
      created++;
    }
  }

  // Deactivation pass — anything that's still active in the DB but not in
  // the new SEED list gets isActive: false. Preserves existing recommendation
  // rows but hides the dropped items from new matches and from /library.
  const seedKeys = new Set(SEED.map((s) => `${s.title}::${s.author}`));
  const allActive = await prisma.resource.findMany({
    where: { isActive: true },
    select: { id: true, title: true, author: true },
  });
  const toDeactivate = allActive.filter(
    (r) => !seedKeys.has(`${r.title}::${r.author ?? ""}`)
  );
  if (toDeactivate.length > 0) {
    await prisma.resource.updateMany({
      where: { id: { in: toDeactivate.map((r) => r.id) } },
      data: { isActive: false },
    });
    console.log(
      `Deactivated ${toDeactivate.length} stale resource(s) not in current seed:`
    );
    for (const r of toDeactivate) {
      console.log(`  - ${r.title} (${r.author})`);
    }
  }

  console.log(`Done. Created ${created}, updated ${updated}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
