// Hand-curated initial Resource catalog for Sage's recommendation engine.
//
// Themes are intentionally PATTERN-LEVEL, not generic categories. They
// should mirror the language Sage actually uses in conversation summaries
// ("isolation-of-insight", "decision-paralysis"), so the matcher LLM can
// see the connection between user signal and resource fit.
//
// URLs default to Wikipedia for resources where a single canonical link
// doesn't exist. Replace via the admin UI at /admin/resources once you've
// found a definitive source.
//
// Idempotent: upserts on (title, author) — re-running won't duplicate rows
// but WILL refresh blurb/themes/why if you've edited them here.
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
  // ── Awareness, awakening, isolation of insight ────────────────────────────
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
    why: "For anyone who has 'seen something' — about themselves, a relationship, a system — and feels lonely or frustrated when the people closest to them can't see it too. Names the experience.",
  },
  {
    type: "lecture",
    title: "The Real You",
    author: "Alan Watts",
    url: "https://en.wikipedia.org/wiki/Alan_Watts",
    blurb:
      "Alan Watts on the costume of personality and the question 'who is the one who is asking?'",
    themes: ["identity", "ego", "self-as-construction", "who-am-i"],
    why: "When someone is sitting with the feeling of not knowing who they really are — beyond roles, beyond performance — Watts is a gentle door.",
  },
  {
    type: "lecture",
    title: "On Loneliness",
    author: "Jiddu Krishnamurti",
    url: "https://en.wikipedia.org/wiki/Jiddu_Krishnamurti",
    blurb:
      "Krishnamurti distinguishes loneliness (a state of inner poverty we run from) from aloneness (intimacy with what is).",
    themes: [
      "loneliness",
      "aloneness",
      "running-from-self",
      "solitude-vs-isolation",
    ],
    why: "When loneliness is the surface complaint but the deeper story is the inability to be alone with oneself.",
  },

  // ── Meaning, purpose, suffering ───────────────────────────────────────────
  {
    type: "book",
    title: "Man's Search for Meaning",
    author: "Viktor Frankl",
    url: "https://en.wikipedia.org/wiki/Man%27s_Search_for_Meaning",
    blurb:
      "Frankl's account of surviving the camps and the school of psychology born from it: that meaning, not pleasure or power, is what we need most.",
    themes: [
      "meaning-amid-suffering",
      "purpose",
      "will-to-meaning",
      "responsibility-as-freedom",
    ],
    why: "When someone is suffering and asking 'what is this for?' Frankl doesn't take the suffering away — he changes its grammar.",
  },
  {
    type: "book",
    title: "The Myth of Sisyphus",
    author: "Albert Camus",
    url: "https://en.wikipedia.org/wiki/The_Myth_of_Sisyphus",
    blurb:
      "Camus' answer to the absurd: not despair, not faith, but lucid revolt. We must imagine Sisyphus happy.",
    themes: ["absurdity", "meaning-making", "defiance", "doing-it-anyway"],
    why: "When someone's sitting with the meaninglessness of repetitive work or life and asking why bother. Camus doesn't fix the absurd; he reframes the relationship to it.",
  },
  {
    type: "book",
    title: "Letters to a Young Poet",
    author: "Rainer Maria Rilke",
    url: "https://en.wikipedia.org/wiki/Letters_to_a_Young_Poet",
    blurb:
      "Ten letters of patient counsel to a young writer: live the questions, do not seek answers prematurely, the difficulty itself is the work.",
    themes: ["patience", "becoming", "doubt-as-mentor", "living-the-questions"],
    why: "When someone is impatient with their own becoming — wanting an answer or a destination. Rilke's posture is the antidote.",
  },

  // ── Decision, paralysis, choice ───────────────────────────────────────────
  {
    type: "article",
    title: "10/10/10",
    author: "Suzy Welch",
    url: "https://en.wikipedia.org/wiki/Suzy_Welch",
    blurb:
      "A simple decision framework: how will I feel about this in 10 minutes, 10 months, 10 years?",
    themes: [
      "decision-paralysis",
      "decision-making",
      "perspective",
      "time-horizons",
    ],
    why: "When someone is stuck on a decision because they can't see past the immediate emotional weight. Three time-frames break the spell.",
  },
  {
    type: "book",
    title: "The Paradox of Choice",
    author: "Barry Schwartz",
    url: "https://en.wikipedia.org/wiki/The_Paradox_of_Choice",
    blurb:
      "More options ≠ more freedom. Schwartz on why infinite choice produces paralysis, regret, and chronic dissatisfaction.",
    themes: [
      "decision-paralysis",
      "maximizing-vs-satisficing",
      "regret",
      "freedom-as-constraint",
    ],
    why: "When the problem isn't a lack of options but the burden of having too many — and the doubt that follows every choice.",
  },

  // ── Vulnerability, shame, perfectionism ───────────────────────────────────
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
    type: "book",
    title: "Bird by Bird",
    author: "Anne Lamott",
    url: "https://en.wikipedia.org/wiki/Bird_by_Bird",
    blurb:
      "Lamott on the lifelong fight with perfectionism, shitty first drafts, and starting again every morning.",
    themes: [
      "perfectionism",
      "creative-block",
      "starting-anyway",
      "self-criticism",
    ],
    why: "When perfectionism is keeping someone from beginning at all. Lamott's voice is permission.",
  },
  {
    type: "book",
    title: "Radical Acceptance",
    author: "Tara Brach",
    url: "https://en.wikipedia.org/wiki/Tara_Brach",
    blurb:
      "Brach on the 'trance of unworthiness' and a practice for meeting yourself with the same care you'd offer a friend.",
    themes: [
      "self-criticism",
      "trance-of-unworthiness",
      "self-compassion",
      "acceptance",
    ],
    why: "When someone is being merciless with themselves and can't see it.",
  },

  // ── Groundlessness, change, uncertainty ───────────────────────────────────
  {
    type: "book",
    title: "When Things Fall Apart",
    author: "Pema Chödrön",
    url: "https://en.wikipedia.org/wiki/Pema_Ch%C3%B6dr%C3%B6n",
    blurb:
      "Pema Chödrön on staying present with groundlessness — the moments when our usual strategies stop working.",
    themes: [
      "groundlessness",
      "embracing-uncertainty",
      "fear-of-change",
      "staying-with-discomfort",
    ],
    why: "When someone's life has shifted and they're reaching for the old shape of things instead of meeting what's actually here.",
  },
  {
    type: "book",
    title: "Tao Te Ching",
    author: "Lao Tzu",
    url: "https://en.wikipedia.org/wiki/Tao_Te_Ching",
    blurb:
      "The classic of letting go, non-doing (wu-wei), and the strength of yielding.",
    themes: [
      "wu-wei",
      "non-action",
      "simplicity",
      "letting-go",
      "control-vs-acceptance",
    ],
    why: "When the pattern is over-control — gripping for an outcome that pushing harder won't produce.",
  },

  // ── Identity, parts of self, integration ──────────────────────────────────
  {
    type: "book",
    title: "No Bad Parts",
    author: "Richard Schwartz",
    url: "https://en.wikipedia.org/wiki/Internal_Family_Systems_Model",
    blurb:
      "An introduction to Internal Family Systems: every part of you (the inner critic, the protector, the wounded child) had a reason it became that way.",
    themes: [
      "parts-of-self",
      "inner-critic",
      "self-criticism",
      "integration",
      "self-as-leader",
    ],
    why: "When someone is at war with a part of themselves and trying to defeat it. IFS reframes the whole battle.",
  },
  {
    type: "article",
    title: "The Shadow",
    author: "Carl Jung",
    url: "https://en.wikipedia.org/wiki/Shadow_(psychology)",
    blurb:
      "Jung on the disowned parts of the psyche — what we hate in others is often what we cannot accept in ourselves.",
    themes: [
      "shadow-self",
      "projection",
      "integration",
      "what-we-hate-in-others",
    ],
    why: "When someone keeps reacting strongly to a quality in others. The reaction is information.",
  },
  {
    type: "book",
    title: "Siddhartha",
    author: "Hermann Hesse",
    url: "https://en.wikipedia.org/wiki/Siddhartha_(novel)",
    blurb:
      "A young man leaves home to find truth — first in renunciation, then in indulgence, finally beside a river that knows more than either.",
    themes: ["seeking", "identity", "river-as-metaphor", "the-long-detour"],
    why: "When someone has been seeking for so long they've forgotten what they were looking for.",
  },

  // ── Fear, control, anxiety ────────────────────────────────────────────────
  {
    type: "book",
    title: "Meditations",
    author: "Marcus Aurelius",
    url: "https://en.wikipedia.org/wiki/Meditations",
    blurb:
      "The private notebooks of a Roman emperor: daily reminders to do the work, accept what isn't yours to control, and remember death.",
    themes: [
      "control-vs-acceptance",
      "daily-practice",
      "mortality",
      "duty-as-anchor",
    ],
    why: "When someone is exhausted from trying to control what isn't theirs to control.",
  },
  {
    type: "book",
    title: "On the Shortness of Life",
    author: "Seneca",
    url: "https://en.wikipedia.org/wiki/De_Brevitate_Vitae_(Seneca)",
    blurb:
      "Seneca on the loudest paradox: that we treat our money as precious and our hours as infinite.",
    themes: ["time", "mortality", "urgency", "what-matters"],
    why: "When someone is sleepwalking through their own life and a small jolt would help.",
  },

  // ── Relationship, intimacy, distance ──────────────────────────────────────
  {
    type: "book",
    title: "Mating in Captivity",
    author: "Esther Perel",
    url: "https://en.wikipedia.org/wiki/Esther_Perel",
    blurb:
      "Perel on the central paradox of long-term partnership: we want safety AND aliveness, and they pull against each other.",
    themes: [
      "long-term-relationships",
      "desire",
      "distance",
      "intimacy-vs-aliveness",
    ],
    why: "When the relationship is stable but quiet — and someone is wondering what they're doing wrong.",
  },
  {
    type: "podcast",
    title: "Where Should We Begin?",
    author: "Esther Perel",
    url: "https://whereshouldwebegin.estherperel.com/",
    blurb:
      "Couples therapy, in real sessions, with permission. Eavesdropping that teaches you about your own relationships.",
    themes: ["relationships", "couples", "communication", "rupture-and-repair"],
    why: "When the conversation is about a specific relational dynamic and hearing it played out elsewhere helps name it.",
  },
  {
    type: "book",
    title: "Anam Cara",
    author: "John O'Donohue",
    url: "https://en.wikipedia.org/wiki/John_O%27Donohue",
    blurb:
      "Celtic wisdom on friendship, soul, longing, and the hospitality of inner life.",
    themes: ["friendship", "soul", "longing", "belonging"],
    why: "When the conversation is about loneliness or longing in a way that wants softer language than therapy.",
  },

  // ── Hero's journey, calling, transformation ───────────────────────────────
  {
    type: "video",
    title: "The Power of Myth",
    author: "Joseph Campbell",
    url: "https://en.wikipedia.org/wiki/The_Power_of_Myth",
    blurb:
      "Campbell's six-part conversation with Bill Moyers: myth as a map for the inner life and the call to follow your bliss.",
    themes: [
      "hero-journey",
      "calling",
      "follow-your-bliss",
      "meaning-making",
    ],
    why: "When someone is sensing a calling but can't quite name it — or is afraid to.",
  },
  {
    type: "book",
    title: "The Three Marriages",
    author: "David Whyte",
    url: "https://en.wikipedia.org/wiki/David_Whyte_(poet)",
    blurb:
      "Whyte on the marriages every person undertakes — to another, to work, and to oneself — and the impossibility of bargaining one against the others.",
    themes: ["work-self-other", "integration", "belonging", "vocation"],
    why: "When someone is splitting themselves between work and relationship and feeling no part of them is getting enough.",
  },

  // ── Death, regret, what matters ───────────────────────────────────────────
  {
    type: "book",
    title: "The Top Five Regrets of the Dying",
    author: "Bronnie Ware",
    url: "https://en.wikipedia.org/wiki/Bronnie_Ware",
    blurb:
      "A palliative-care nurse's record of the regrets her dying patients spoke aloud — none of them about money or status.",
    themes: ["regret", "authentic-life", "what-matters", "deathbed-clarity"],
    why: "When someone is choosing the safe path against the truer one, and the cost isn't yet visible.",
  },

  // ── Daily practice, presence ──────────────────────────────────────────────
  {
    type: "book",
    title: "The Book of Awakening",
    author: "Mark Nepo",
    url: "https://en.wikipedia.org/wiki/Mark_Nepo",
    blurb:
      "365 short reflections — one per day — on awakening to the life you already have.",
    themes: ["daily-practice", "awakening", "presence", "small-doors"],
    why: "When someone wants a practice but doesn't want a system. Small daily entry points.",
  },

  // ── Wounded healer, suffering as gift ─────────────────────────────────────
  {
    type: "book",
    title: "The Wounded Healer",
    author: "Henri Nouwen",
    url: "https://en.wikipedia.org/wiki/The_Wounded_Healer",
    blurb:
      "Nouwen on ministry from one's own woundedness — that what we offer most is what we ourselves have struggled with.",
    themes: [
      "woundedness-as-gift",
      "service-from-pain",
      "vulnerability",
      "calling",
    ],
    why: "When someone is hiding their wounds because they think it disqualifies them — when in fact it's the opposite.",
  },

  // ── Avoidance, values, ACT ────────────────────────────────────────────────
  {
    type: "book",
    title: "The Happiness Trap",
    author: "Russ Harris",
    url: "https://en.wikipedia.org/wiki/Acceptance_and_commitment_therapy",
    blurb:
      "An accessible introduction to Acceptance and Commitment Therapy: stop fighting your thoughts, clarify your values, take action anyway.",
    themes: [
      "avoidance",
      "values-clarification",
      "defusion",
      "experiential-avoidance",
    ],
    why: "When someone is in a long fight with their own thoughts. ACT changes the fight to a question of direction.",
  },
  {
    type: "book",
    title: "Pleasure Activism",
    author: "adrienne maree brown",
    url: "https://en.wikipedia.org/wiki/Adrienne_Maree_Brown",
    blurb:
      "brown on pleasure as a measure of liberation and a daily practice of returning to oneself.",
    themes: ["pleasure", "joy-as-resistance", "embodiment", "self-trust"],
    why: "When someone has earned a stripe of seriousness so deep they've forgotten what delight feels like.",
  },

  // ── Poetry that names patterns ────────────────────────────────────────────
  {
    type: "article",
    title: "Wild Geese",
    author: "Mary Oliver",
    url: "https://en.wikipedia.org/wiki/Mary_Oliver",
    blurb:
      "A short poem about belonging, self-acceptance, and the family of things.",
    themes: [
      "belonging",
      "self-acceptance",
      "you-do-not-have-to-be-good",
      "nature-as-mirror",
    ],
    why: "When the conversation has reached the place where prose stops working and a poem fits.",
  },

  // ── Long-form podcasts ────────────────────────────────────────────────────
  {
    type: "podcast",
    title: "On Being",
    author: "Krista Tippett",
    url: "https://onbeing.org/series/podcast/",
    blurb:
      "Long-form conversations with poets, scientists, theologians, activists — about the questions that don't have easy answers.",
    themes: [
      "meaning-making",
      "listening",
      "the-big-questions",
      "spiritual-but-not-religious",
    ],
    why: "When someone wants to hear a real conversation between thoughtful adults about what's actually hard.",
  },

  // ── Boundaries, family of origin ──────────────────────────────────────────
  {
    type: "article",
    title: "Differentiation of Self",
    author: "Murray Bowen",
    url: "https://en.wikipedia.org/wiki/Bowen_family_systems_theory",
    blurb:
      "Bowen's idea of differentiation: the capacity to stay connected to your family without dissolving into its anxiety.",
    themes: [
      "family-of-origin",
      "individuation",
      "anxiety-in-systems",
      "boundaries",
    ],
    why: "When someone keeps getting pulled back into a family pattern they thought they'd outgrown.",
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
