// Hand-curated Resource catalog for Sage's recommendation engine.
//
// CURATION RULE — every active item has either:
//   1. An iframe-embeddable source (TED, YouTube, Spotify) that plays
//      inside the app, OR
//   2. Sage's original commentary in `bodyText` so the user always has
//      something to read in-app even if the external URL goes stale.
//
// `bodyText` is Sage's transformative reading of the work — original
// commentary, not reproduction. Cited via `bodySource` and linked via
// `url`. Modeled on long-form essay reading apps (Readwise, Pocket,
// The Marginalian's "weekly digest" framing).
//
// Idempotent: upserts on (title, author). Re-running refreshes
// blurb/themes/why/url/bodyText/bodyKind/bodySource for retained items.
// After upsert, any active Resource NOT in this SEED list is marked
// isActive: false (preserves existing recommendation rows but hides
// dropped items from new matches and from /library).
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
  bodyText?: string;
  bodyKind?: "commentary" | "passage";
  bodySource?: string;
}

// Markdown-ish: paragraphs separated by blank lines. The reader component
// renders this with editorial typography (Cormorant body, drop cap on
// the first paragraph, generous line height).

const SEED: SeedResource[] = [
  // ───────── classical / public-domain ─────────
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
    bodyKind: "commentary",
    bodySource:
      "Source: Plato, Republic Book VII, ~375 BCE (public domain). Animation by TED-Ed.",
    bodyText: `Most stories about waking up are heroic. Plato's isn't. Plato's is about the part nobody warns you about — that *after* you've seen something true, you have to go back. Back to the people you love who haven't seen it. Back into a room where they will look at you like you're talking nonsense.

The story is short. Some people are chained inside a cave so they can only see the back wall. Behind them, a fire and a parade of objects make shadows. They name the shadows. They have whole arguments about which shadow is which. The shadows are reality, as far as they know.

One of them is dragged out. The sun blinds him. Slowly his eyes adjust and he sees what was actually casting the shadows — trees, animals, the world. He goes back down to tell the others. They mock him. They are sure his eyes have been ruined. Some of them, Plato says, would kill him if they could.

Sage notices when this pattern is in the room. Someone has shifted — about themselves, a relationship, a system they used to take for granted — and now their family or partner or coworker keeps insisting they go back to the way things were. The person isn't crazy. They've just stopped seeing what everyone else still sees.

The honest reading of Plato is that this is the hard part of growth, not a sign you're doing it wrong. The frustration is information. The loneliness is information. They mean you've gone somewhere the others haven't been yet — not that what you've seen isn't real.

The TED-Ed version is six minutes. Watch it. Then ask yourself which way the loneliness in your life points: toward the cave, or away from it.`,
  },
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
    bodyKind: "commentary",
    bodySource:
      "Source: Marcus Aurelius, Meditations, ~170s CE. Long's English translation, 1862 (public domain). Full text on Project Gutenberg.",
    bodyText: `Marcus Aurelius wrote these notes to himself. He wasn't writing a book. He was the most powerful person in the Roman world, surrounded by people whose job it was to flatter him, and his most reliable friend was his own notebook. Most mornings before dawn he would write down the same handful of things, in slightly different words, because he kept forgetting them.

That's the surprise of *Meditations* the first time you read it. It isn't grand. It's a man trying to talk himself out of resentment, out of self-pity, out of overreaction. The same problems we have. The same trick of forgetting in the afternoon what you knew at sunrise.

The central instruction repeats so many times you stop being able to ignore it: *some things are in your control, most things are not, and confusion about which is which is the source of nearly all your suffering.* Other people's opinions of you, the weather, your reputation after death, what your colleague said about you — not in your control. The quality of your attention, the integrity of your reaction, your willingness to do the next decent thing — those are.

Sage points to Marcus when you're at war with the wrong thing. When the problem is "my partner did X" but the actual leak is "I keep replaying that they did X." When the situation is genuinely outside your grip but you're still treating your grip as the variable.

The Long translation is in the public domain. You can read it in a single tab. Most people read four or five pages and stop, not because it's hard, but because every paragraph is a small accusation. Read slowly. Read one entry at a time. The book is best as a daily five-minute practice — a man you can't argue with telling you, again, what you already know.`,
  },
  {
    type: "book",
    title: "Tao Te Ching",
    author: "Lao Tzu",
    url: "https://www.gutenberg.org/ebooks/216",
    blurb:
      "Eighty-one short verses on letting go, non-doing (wu-wei), and the strength of yielding.",
    themes: [
      "wu-wei",
      "non-action",
      "simplicity",
      "letting-go",
      "control-vs-acceptance",
    ],
    why: "When the pattern is over-control — gripping for an outcome that pushing harder won't produce.",
    bodyKind: "commentary",
    bodySource:
      "Source: Lao Tzu, Tao Te Ching, traditionally dated 6th c. BCE. James Legge's English translation, 1891 (public domain). Full text on Project Gutenberg.",
    bodyText: `The *Tao Te Ching* keeps making one observation in eighty-one different ways: the world responds better to softness than to force, but we are bad at trusting this.

Water cuts stone. Bamboo bends in the storm and stands up after. The empty space inside a bowl is what makes it useful. The wheel turns because of the hole at its centre. Almost every metaphor in the book is about how *not-doing* — yielding, leaving room, letting things ripen — is the more powerful move. Not because doing nothing is virtuous, but because most of what we call "doing" is really *forcing*, and forcing has a long record of producing the opposite of what we wanted.

There's a particular flavor of stuckness Sage sees often where you might be gripping. Gripping a relationship that is asking for distance. Gripping a goal that is asking to be set down. Gripping your own personality, refusing the version of you that wants to come next. The gripping feels like effort, like discipline. The *Tao* would call it the most expensive kind of laziness — a refusal to trust that things move on their own when you stop pushing them.

The trick of the book is that it doesn't argue. It just keeps coming at the same idea sideways: *the sage acts without acting; he is firm by yielding.* Either the line lands or it doesn't. If it doesn't, you read the next verse and try again.

It's short. Most translations clock in under thirty pages. The Legge translation on Project Gutenberg is free. Read it the way you'd read a book of poetry — one verse, sit with it, come back tomorrow. Sage's nudge: pick the verse that annoys you most. That's where the work is.`,
  },
  {
    type: "book",
    title: "Letters to a Young Poet",
    author: "Rainer Maria Rilke",
    url: "https://archive.org/details/letterstoyoungpo0000rilk",
    blurb:
      "Ten letters of patient counsel to a young writer: live the questions, do not seek answers prematurely, the difficulty itself is the work.",
    themes: ["patience", "becoming", "doubt-as-mentor", "living-the-questions"],
    why: "When someone is impatient with their own becoming — wanting an answer or a destination.",
    bodyKind: "commentary",
    bodySource:
      "Source: Rainer Maria Rilke, Letters to a Young Poet, written 1903–1908. M. D. Herter Norton's English translation. Read the full book in the Internet Archive's library reader.",
    bodyText: `Rilke was twenty-seven when a stranger — a nineteen-year-old cadet at a military academy — sent him some poems and asked, in earnest, whether he should keep going. Rilke wrote back. Then again. Ten letters across five years. The cadet, Franz Kappus, eventually published them.

The letters are about writing on the surface. Underneath they are about something almost no one teaches: the difference between *being given an answer* and *being able to live with a question.*

Kappus keeps wanting to know — am I a real poet, should I quit, is this anything? Rilke refuses every time. He says: stop hunting the verdict. Stop measuring yourself against an imagined critic. Go inward and ask whether, if writing were forbidden, you would die. If yes, build your life around that yes. If no, that's also a real answer.

The instruction Sage notices most often is from the fourth letter — *be patient toward all that is unsolved in your heart and try to love the questions themselves.* You might come into a session wanting Sage to hand you the verdict. *Should I leave him. Should I quit. Am I a good person.* Rilke would say: the question is the place you live. You don't graduate from the question. The question matures with you, and when it has matured enough, it stops sounding like a question and starts sounding like a life.

Read the fourth and the eighth letters first. They're each two or three pages. Slow paragraphs in a green-covered book. Whoever you are, whatever you're avoiding by waiting for an answer, Rilke saw you in 1903 and was kind to you anyway.`,
  },
  {
    type: "book",
    title: "Siddhartha",
    author: "Hermann Hesse",
    url: "https://www.gutenberg.org/ebooks/2500",
    blurb:
      "A young man leaves home to find truth — first in renunciation, then in indulgence, finally beside a river that knows more than either.",
    themes: ["seeking", "identity", "river-as-metaphor", "the-long-detour"],
    why: "When someone has been seeking for so long they've forgotten what they were looking for.",
    bodyKind: "commentary",
    bodySource:
      "Source: Hermann Hesse, Siddhartha, 1922 (public domain in the U.S.). Full English translation on Project Gutenberg.",
    bodyText: `Siddhartha is a short novel about a young man who tries every available path to enlightenment and finds them all almost-right. He fasts as an ascetic and learns the discipline but not the joy. He becomes a wealthy merchant and a lover and learns the joy but not the discipline. By the time he is middle-aged he is rich and miserable.

The book turns on a moment most spiritual stories skip. Siddhartha realizes he has been *running away from running away* — first from comfort, then back into comfort — and that what he was looking for has been quietly available the whole time, in any place he was actually paying attention. He becomes a ferryman on a small river. His teacher, in the end, is the water.

Sage points to Siddhartha when you've been seeking for so long that the seeking itself has become the problem. You keep adding practices, books, retreats, frameworks. You keep waiting for the thing that will finally fix you. Hesse's argument — written in 1922, before any of the modern self-help vocabulary existed — is that the fix doesn't come from above. It comes from staying long enough in one place that the place starts to teach you.

The novel is short, ninety pages, about one young man, told in a voice that's almost a fable. The English translation is public domain on Project Gutenberg. Read it across two evenings. Read the last twenty pages slowly — they're about the river, and about realizing that the people you used to disagree with were never wrong, exactly. They were just on a different bank.`,
  },

  // ───────── TED talks ─────────
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
    bodyKind: "commentary",
    bodySource:
      "Source: Brené Brown, 'The Power of Vulnerability,' TEDxHouston, June 2010. Full talk and transcript on TED.com.",
    bodyText: `Brené Brown is a researcher. She studied shame and connection for years, and the talk is what happened when her data refused to behave.

The question she started with was simple: what predicts whether a person feels truly connected — to other people, to their own life? She had spreadsheets full of interviews. Her hypothesis was that connection came from emotional regulation, communication, the kind of skills that can be coached.

What the data kept saying, instead, was that the people who felt most connected had something else in common: they were *willing to be seen.* Not theatrically, not performatively. They were willing to be the first to say I love you, willing to risk being misread, willing to do the thing without knowing if it would work. The data forced her to use a word she didn't want to use as a researcher: vulnerability.

Sage points to this talk when you've built a life out of *not being a problem.* You've made yourself easy. You've practiced never quite needing anything. You're exhausted, and you suspect — accurately — that your carefulness has become the wall between you and the people you love.

Brown's reframing is that vulnerability isn't weakness. It's the precondition of every experience worth having. Joy, love, belonging, courage — all of them require being seen with your guard down. The armor we built to keep out the bad feelings has been keeping out the good ones too, on the same channel.

The talk is twenty minutes. Watch it once for the laughs, then watch it again for the moment near the end where she stops being a researcher and starts being a person. Then ask yourself which "armor" of yours is overdue.`,
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
    bodyKind: "commentary",
    bodySource:
      "Source: Brené Brown, 'Listening to Shame,' TED2012. Full talk and transcript on TED.com.",
    bodyText: `Two years after the vulnerability talk went viral, Brown came back to give the talk she actually wanted to give. The first one had been about why being seen matters. This one was about the thing that prevents it.

Her precise distinction: *guilt* says I did a bad thing. *Shame* says I am a bad thing. Guilt is about behavior; you can apologize for it, fix it, learn. Shame is about identity; there's no apology that resolves it because what's "wrong" is you, not what you did. Guilt is generally adaptive. Shame is generally corrosive.

The reason this matters in a session: people use these words interchangeably, but Sage usually hears shame when they think they're describing guilt. *I feel so guilty about how I handled that conversation* — okay, what would help, an apology? *No, that wouldn't fix it.* That's because the underlying belief isn't *I behaved badly,* it's *I am the kind of person who behaves like that, and that's never going to change.* Shame.

Brown's intervention is almost embarrassingly simple: shame can't survive being spoken. Said out loud to one person who doesn't recoil, it loses ninety percent of its power. Kept in the dark, it grows. The whole talk is essentially an argument for finding *one* person you can say the worst thing to — not a partner, not a follower count, just one trustworthy human.

Sage points here when you're in a long internal whisper of you-are-broken. The whisper is louder than it should be because nothing has ever interrupted it. The talk gives you the vocabulary to interrupt it, and the permission to actually try.

It's about fifteen minutes. Watch it on a quiet morning, not before a meeting. It hits harder than people expect.`,
  },
  {
    type: "video",
    title: "The Paradox of Choice",
    author: "Barry Schwartz",
    url: "https://www.ted.com/talks/barry_schwartz_the_paradox_of_choice",
    blurb:
      "Schwartz's TED talk on why infinite options produce paralysis, regret, and chronic dissatisfaction — and the difference between maximizers and satisficers.",
    themes: [
      "decision-paralysis",
      "maximizing-vs-satisficing",
      "regret",
      "freedom-as-constraint",
    ],
    why: "When the problem isn't a lack of options but the burden of having too many — and the doubt that follows every choice.",
    bodyKind: "commentary",
    bodySource:
      "Source: Barry Schwartz, 'The Paradox of Choice,' TEDGlobal, July 2005. Full talk and transcript on TED.com.",
    bodyText: `Schwartz is a psychologist who noticed an awkward fact: the modern story we tell ourselves is that more options equals more freedom equals more happiness. The data, when he looked, said the opposite. Past a certain point, adding more options makes us *more* paralyzed, *more* regretful about the option we chose, and *less* satisfied with what we end up with.

Three things go wrong, all at once. First, paralysis — when the choice has thirty defensible answers, even small decisions become research projects. Second, opportunity-cost thinking — every option you take comes packaged with the ghosts of all the options you passed up, and those ghosts whisper at you afterward. Third, escalating expectations — when you can theoretically have anything, *anything you actually have* feels like a compromise.

The lever Schwartz offers is small but real: *be a satisficer, not a maximizer.* A satisficer figures out what's good enough, and once they find it, they stop. A maximizer tries to find the best, which means they have to evaluate every option against every other, and they suspect even after the choice that there was a better one. Maximizers are objectively more successful by external measures and reliably less happy.

Sage points to this when you describe yourself as "indecisive" or "overthinking." You're usually neither. You're running a maximizer's algorithm in a world that has too many options for that algorithm to terminate. The fix isn't to think harder. It's to lower the bar from *the best* to *good enough,* and then to actually let the deciding be done when it's done.

The talk is twenty minutes, sharp and funny. Watch it before any choice you've been re-litigating for more than a week.`,
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
    bodyKind: "commentary",
    bodySource:
      "Source: Esther Perel, 'The Secret to Desire in a Long-Term Relationship,' TED2013. Full talk and transcript on TED.com.",
    bodyText: `Perel is a couples therapist who has had the same conversation a thousand times: we love each other, our life works, we are kind to each other — and the spark is gone. They blame themselves. They blame the relationship. The talk is her arguing they're blaming the wrong thing.

Her core observation, drawn from interviews across many countries, is that desire and security live in different rooms of the psyche. *Love* wants closeness, predictability, knowing the other person all the way through. *Desire* wants distance, mystery, novelty — the experience of looking at someone and not being entirely sure where they end. Both are real. Both are essential. They tend to undermine each other, which is awkward, because we now expect one person to provide both.

The trick of the talk is the question Perel asks her clients. Not *when do you feel close to your partner?* That's familiar territory. The question that breaks something open is *when do I find myself most drawn to my partner?* The answers cluster: when they're across the room confidently doing something they're good at. When they're laughing with someone else. When they're separate, in their own life, briefly outside the gravitational pull of *us.*

Sage points to Perel when the pattern in your long-term relationship is the slow erosion of *individuality* in the name of closeness. You've merged. You share everything. There are no friends or projects or interior life that doesn't involve the other. You've made yourselves perfectly known to each other, and you're quietly bored.

The talk is nineteen minutes. Watch it with the person you live with. Then talk about what each of you used to do alone, and stopped.`,
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
    bodyKind: "commentary",
    bodySource:
      "Source: Anne Lamott, '12 Truths I Learned From Life and Writing,' TED2017. Full talk and transcript on TED.com.",
    bodyText: `Lamott has been writing books about how to write for thirty years. The TED talk is her short version. It's twelve numbered things, told fast, and somewhere between point three and point seven the room stops laughing and starts paying attention in a different way.

She is funny on purpose. Underneath the humor, the talk is about the part of creative work no one wants to talk about: *most of doing the work is the part where you're sure you've forgotten how.* The blank page. The second draft that's worse than the first. The morning where you sit down and produce nothing and decide you should never have tried in the first place. Her argument is that this isn't a sign of failure — it's the climate the work is grown in. Real writers, she says, write *despite* this, not on the days they feel inspired.

The single most useful thing in the talk is the line about *first drafts being shitty drafts and that's okay.* It's been quoted so often it's become a meme, but Lamott's actual claim is steeper than the meme suggests: the only way to get to a good piece of work is by being willing to make a bad one first, all the way through, without secretly trying to make it good. Most blocked writers aren't blocked. They are trying to write the third draft on the first pass, and they are quietly punishing themselves for being unable to.

Sage points here when your perfectionism shows up disguised as procrastination. The talk is fifteen minutes. Watch it once. Then go open the file.`,
  },

  // ───────── speeches & essays ─────────
  {
    type: "video",
    title: "Stanford Commencement Address (2005)",
    author: "Steve Jobs",
    url: "https://news.stanford.edu/2005/06/14/jobs-061505/",
    blurb:
      "Three stories: connecting the dots backward, love and loss, and death. Stanford's official archive has the full video and transcript.",
    themes: ["calling", "mortality", "follow-your-bliss", "what-matters"],
    why: "When someone is sleepwalking through a path they didn't really choose.",
    bodyKind: "commentary",
    bodySource:
      "Source: Steve Jobs, Stanford University commencement address, June 14, 2005. Stanford archive (news.stanford.edu).",
    bodyText: `The speech is fifteen minutes long, organized around three stories: dropping out of college, getting fired from his own company, and being told he had cancer. He told them in order. He didn't summarize. He just told what happened.

The first story is about *trust.* Jobs dropped out, slept on floors, audited a calligraphy class for no practical reason. Ten years later, when he was building the Macintosh, the typography of that calligraphy class became one of the things that made the computer feel different. His point: you cannot connect the dots looking forward. You can only connect them looking back. Which means at some point you have to act on something that doesn't have an obvious payoff, and trust that the dots will connect later.

The second story is about *failure as gift.* He was fired at thirty from the company he founded. He says, decades later, that getting fired was the best thing that ever happened to him — it returned him to the lightness of being a beginner, in which one of the most creative periods of his life happened. Most people don't get to test this claim because they spend their lives avoiding the failure that would have set them free.

The third story is about *death as filter.* The doctors had told him, briefly, that he had months to live. The diagnosis turned out to be wrong. But the question it had forced — *if today were the last day of my life, would I want to do what I am about to do today?* — became his daily test. Whenever the answer was no for too many days in a row, he changed something.

Stanford's archive has the video and the full transcript. Watch it. The most useful thing about the speech is that he wasn't theorizing — he was reporting. Take it as a report.`,
  },
  {
    type: "article",
    title: "This Is Water",
    author: "David Foster Wallace",
    url: "https://fs.blog/david-foster-wallace-this-is-water/",
    blurb:
      "Wallace's 2005 Kenyon commencement address. The default-setting parable about what it actually takes to be conscious in adult life.",
    themes: [
      "awareness",
      "default-mode",
      "self-centeredness",
      "the-everyday-as-spiritual",
    ],
    why: "When the conversation is about boredom, irritation, the supermarket-at-rush-hour aspect of being alive — and choosing what to think about.",
    bodyKind: "commentary",
    bodySource:
      "Source: David Foster Wallace, Kenyon College commencement address, May 21, 2005. Full transcript hosted by Farnam Street (fs.blog).",
    bodyText: `Wallace opens with a joke about two young fish swimming along. An older fish goes by and says *morning, boys, how's the water?* The young fish swim on for a while, and then one of them says *what the hell is water?*

The whole speech is an unpacking of that joke. His central claim: the most obvious, important realities are usually the hardest to see and talk about. We are constantly inside something — a default way of perceiving, a habitual self-centeredness — and most of the time we don't notice we're inside anything. We think we're seeing the world. We're seeing our own water.

Wallace was speaking to college graduates and he refused to give them the standard speech. He didn't say *follow your dreams.* He said something almost the opposite: most of the rest of your life will not be dramatic. It will be hours in traffic, lines at the supermarket, fluorescent lights, a partner whose mood you cannot fix. And the question — the only real question, he said — is *what you choose to think about during those hours.*

The default setting, he says, is to be the unconscious centre of the universe. Everyone in your way is an obstacle to your day. Everyone moving slowly is doing it on purpose. Inside that default, even an ordinary commute can feel like an injustice. The real freedom of an educated adult life isn't being smart. It's being able to choose, in those moments, to construct a different reading. To imagine that the man yelling at his kid in the checkout aisle has had a worse week than you have. That kind of freedom takes practice and is mostly invisible — and Wallace argues, sincerely, that the failure to learn it is a real disaster, not a small one.

The speech is twenty-two minutes. Read it on Farnam Street if you'd rather have the words on the page. He died three years later. He knew exactly what he was talking about.`,
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
    bodyKind: "commentary",
    bodySource:
      "Source: Martin Luther King Jr., 'Letter from Birmingham Jail,' April 16, 1963. Archived at the University of Pennsylvania's African Studies Center.",
    bodyText: `In April of 1963 King was arrested for protesting in Birmingham, Alabama. While he was in jail, eight white clergymen — moderates, by their own description — published an open letter calling his actions "unwise and untimely." They agreed with his goals. They didn't approve of his methods. They asked him to wait.

The Letter from Birmingham Jail is his reply. It's written on the margins of a newspaper and on scraps the lawyers smuggled in. The arguments are airtight. He answers each of the clergy's objections in turn. But the line that cracks the letter open is the one about waiting itself: he says, in effect, that he has heard the word *wait* his entire life, and it has almost always meant *never.*

What makes the letter still relevant is that it's about something larger than civil rights legislation in 1963. It's about the moral structure of moderation. The clergymen weren't villains. They were decent people who genuinely preferred the cause of justice to be advanced *politely* — without protests, without arrests, without disturbing their Sunday. King's argument is that a moderation which always asks the people most hurt to absorb a little more delay is itself a form of injustice. Comfortable people setting the pace for uncomfortable ones.

Sage points to this letter when you're in a smaller version of the same dynamic. You're being told *wait* by people who are not the ones doing the waiting. You're being asked to keep your voice down by people whose lives don't change either way. The letter gives you language to refuse. Not language to be cruel — King is never cruel — but language that names the real cost of staying patient.

It's a long read. Sit with it. The full text is hosted by UPenn's African Studies Center, which has been the canonical online archive for decades.`,
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
    bodyKind: "commentary",
    bodySource:
      "Source: Audre Lorde, 'The Transformation of Silence into Language and Action,' delivered at the Modern Language Association, 1977. PDF archived at Lehigh University.",
    bodyText: `Lorde delivered this talk after a doctor told her she might have cancer. The biopsy came back benign, but for three weeks she lived with the possibility that she was going to die soon, and she kept asking herself one question: *what had I most regretted not saying?*

The answer was not *what speech had I failed to make at a conference.* The answer was the small, daily refusals to speak. The dinners where she stayed quiet. The arguments she let pass. The relationships in which she had carefully, generously, perpetually stepped around the truth so that no one would be uncomfortable. She realized she had been protecting other people's ease at the cost of her own life.

The talk is short — twenty minutes spoken aloud, eight pages on paper. Its central claim is that silence is not the absence of speech. Silence is a *transaction.* You stay quiet, and in exchange you get to keep an arrangement. The arrangement is usually that someone in your life gets to keep a comfortable picture of who you are. The cost is that you, the person doing the staying-quiet, lose access to your own voice in increments so small you don't notice until something — like a possible cancer diagnosis — makes you take inventory.

Lorde isn't naive. She is explicit that speaking has costs. People react. Relationships shift. Some don't survive. Her argument isn't that speaking is easy. It's that *the silence is also costing you,* and the cost is just hidden because it accumulates so slowly.

Sage points to this talk when the pattern is staying small to keep someone else comfortable, and you've stopped noticing the bargain. The PDF on Lehigh's site is the cleanest version online. Read it once for the speech itself, then sit for a few minutes and ask the question Lorde asked: what would I most regret not saying?`,
  },

  // ───────── modern essays (link-only, Sage commentary primary) ─────────
  {
    type: "article",
    title: "The Tail End",
    author: "Tim Urban",
    url: "https://waitbutwhy.com/2015/12/the-tail-end.html",
    blurb:
      "Tim Urban draws out a life in months — and especially how few times you'll see the people you love.",
    themes: ["mortality", "what-matters", "time", "deathbed-clarity"],
    why: "When someone is putting off seeing a parent or a friend because there'll be time later. Urban shows there isn't as much later as we think.",
    bodyKind: "commentary",
    bodySource:
      "Source: Tim Urban, 'The Tail End,' Wait But Why, December 2015. Full essay at waitbutwhy.com.",
    bodyText: `Urban's essay does one thing very well: it draws time. Not as an abstract concept, but as little square boxes on a page. A box for every month of a ninety-year life. A box for every time you've eaten a meal. A box for every winter you have left.

The drawings get uncomfortable fast. By his late thirties, Urban realizes he has already spent ninety-three percent of the in-person time he is statistically going to spend with his parents. Whatever still remains — visits, holidays, a few hospital trips down the line — that's what's left of *the relationship,* in clock terms. The casual phone calls don't add up to the number of hours you assume.

The essay is short and visual. Most people read it in fifteen minutes and stare at the wall for thirty more. There isn't a cute conclusion. The boxes are the conclusion. Once you've seen them, you can't quite un-see them, and that's the point.

Sage points to this essay when you're treating a relationship — with a parent, an old friend, a city you keep meaning to visit — as if there were unlimited future on it. There isn't. There's some finite small number of weekends, and most of the relationship's actual quality lives inside that small number. Urban is not telling you what to do. He's just turning on a light. The decisions you make under the light are yours.

Read it on Wait But Why. Read it once a year. The math doesn't get less true.`,
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
    bodyKind: "commentary",
    bodySource:
      "Source: Elle Luna, 'The Crossroads of Should and Must,' Medium, April 2014. Original essay at medium.com.",
    bodyText: `Luna's essay introduces two words that, once you have them, you can't un-have. *Should* is the path you take because of inheritance. Your parents' expectations, the path your friends took, the safer narrative, the version of your life that wins social approval at family Christmas. *Must* is the path that won't leave you alone. The thing you keep coming back to in the shower, in the morning, when you're being honest.

Her observation is that almost everyone, when asked, knows which is which. The clarity isn't the problem. The problem is the price. Choosing *must* costs disappointment — yours, theirs, the specific people whose expectations you've been managing your whole life. Choosing *should* costs something larger but quieter: a slow corrosion of the part of you that remembers wanting the other path.

Luna isn't dramatic about this. She doesn't tell you to quit your job or break up with your partner. The essay's strength is that it just *names* the dynamic. It gives you the two words. Once you have them, the thing you've been quietly walking around in your own life starts to be visible. You catch yourself, mid-sentence, talking about a *should* as if it were a *must.* Or vice versa.

Sage points to this essay when you're mid-sentence, telling Sage about the path you're on, and the language is full of *I have to* and *people are counting on me.* Luna's question, gently: do you *have to,* or are you choosing this and calling it required so you don't have to feel the choice?

The essay is on Medium. It's short — fifteen minutes, with watercolor illustrations. It's the kind of thing that lands quickly or doesn't land at all; the people for whom it lands tend to remember where they were sitting.`,
  },
  {
    type: "article",
    title: "The Top Five Regrets of the Dying",
    author: "Bronnie Ware",
    url: "https://bronnieware.com/blog/regrets-of-the-dying/",
    blurb:
      "A palliative-care nurse's record of the regrets her dying patients spoke aloud — none of them about money or status.",
    themes: ["regret", "authentic-life", "what-matters", "deathbed-clarity"],
    why: "When someone is choosing the safe path against the truer one, and the cost isn't yet visible.",
    bodyKind: "commentary",
    bodySource:
      "Source: Bronnie Ware, 'Regrets of the Dying,' first published on her blog in 2009 (later expanded into a book). Original blog post at bronnieware.com.",
    bodyText: `Ware spent years working as a palliative-care nurse in people's homes during their final weeks. She got close to her patients in a particular kind of way — when someone has months to live, the small talk evaporates and they tell you what they actually wish they had done.

After enough conversations she noticed that the regrets clustered. They weren't infinite or idiosyncratic. They were nearly the same regret, in five different shapes. She wrote a blog post listing them. The post went around the world.

The first regret — the one she heard the most — was about *living the life expected of you instead of the one you wanted.* It wasn't about big swings. It wasn't *I should have moved to Paris.* It was smaller and more painful: *I should have valued my own opinion more.* People had spent decades quietly outsourcing their life to other people's expectations, and only at the end realized the cost.

The other four follow a similar pattern. People wished they hadn't worked so hard. They wished they had stayed in touch with friends. They wished they had let themselves be happier — most of them, Ware notes, knew that happiness was a *choice* and didn't make it. They wished they'd had the courage to express their feelings.

Sage points to Ware when you're mid-life, miles into a path that isn't quite yours, and you're treating that as a problem you'll address *later.* The patients in Ware's care had also planned to address it later. The blog post is short. Read it now, not later. It's free at bronnieware.com.`,
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
    bodyKind: "commentary",
    bodySource:
      "Source: Annie Dillard, 'Total Eclipse,' originally published in 1982; reprinted in The Atlantic, August 2017.",
    bodyText: `Dillard drove with her husband to a hill in Washington State to watch a total solar eclipse. She had read what to expect. None of the reading mattered. The essay is her trying, afterward, to put into words what actually happened — and her noticing that English doesn't quite cover it.

A partial eclipse is a curiosity. You take a look through a paper filter, you say *huh,* you go back to your sandwich. A *total* eclipse, which lasts maybe two minutes, is something different in kind. The light goes wrong. The grass changes color. Birds stop. The temperature drops noticeably. Then the sun is gone, and what's left is a black hole in the sky surrounded by a ring of fire, and the whole world, briefly, is a place you have never been before.

Dillard's gift, in the essay, is that she resists making this *about* something. She doesn't reach for a metaphor. She just describes, very carefully, what it's like to lose, for two minutes, the feeling that you understand reality. Time bent. Space bent. Other people on the hill became unrecognizable to her. She writes that you cannot know it without having seen it, and seeing the photograph is worse than nothing because the photograph makes you think you know.

Sage points to this essay when you've had a moment — a near-miss, a death in the family, a psychedelic, a child being born — that opened a door you cannot un-open. You keep trying to fit it back into the small frame your life had before. Dillard's essay gives you permission not to. Some experiences are larger than the vocabulary you brought.

The Atlantic has it free. It's twenty-five minutes. Read it slowly.`,
  },

  // ───────── podcasts ─────────
  {
    type: "podcast",
    title: "Where Should We Begin?",
    author: "Esther Perel",
    url: "https://whereshouldwebegin.estherperel.com/",
    blurb:
      "Couples therapy in real sessions, with permission. Eavesdropping that teaches you about your own relationships.",
    themes: ["relationships", "couples", "communication", "rupture-and-repair"],
    why: "When the conversation is about a specific relational dynamic and hearing it played out elsewhere helps name it.",
    bodyKind: "commentary",
    bodySource:
      "Source: Esther Perel, 'Where Should We Begin?' (podcast). Audio at whereshouldwebegin.estherperel.com and on major podcast platforms.",
    bodyText: `Perel's podcast is structurally simple: she invites a real couple, in real distress, into a single therapy session, recorded with their consent. Names changed, voices anonymized. You listen to fifty minutes of two people who love each other trying to find each other. By the end of every episode they've gone somewhere they couldn't have gone alone.

What makes it useful — and not voyeuristic — is that the patterns repeat. The fight that you and your partner have had eight times this year is *also* this couple's fight. Different details, same shape. Listening to someone else's version of your dynamic, while a brilliant therapist quietly re-frames it, is a kind of clarity you can almost never reach when you're inside your own version. You can hear what they're not saying. You can see the move *before* it gets made. And then, sometimes, you can recognize that move in yourself.

Sage points here when you and your partner keep saying *we just have communication problems* but the deeper pattern is that you're locked in roles — the pursuer and the distancer, the parent and the child, the one who feels the feelings and the one who solves the problems. Perel doesn't make a couple's problem disappear in fifty minutes. She makes it *visible,* often for the first time.

The podcast is free on most platforms. Each season has a few free episodes, and the rest are behind a paywall. Sage's rec for a starter: any episode whose summary names a dynamic you and someone in your life have lived. Listen alone first. Then, if you can, with the person.`,
  },
  {
    type: "podcast",
    title: "On Being",
    author: "Krista Tippett",
    url: "https://onbeing.org/series/podcast/",
    blurb:
      "Long-form conversations with poets, scientists, theologians, and activists about the questions that don't have easy answers.",
    themes: [
      "meaning-making",
      "listening",
      "the-big-questions",
      "spiritual-but-not-religious",
    ],
    why: "When someone wants to hear a real conversation between thoughtful adults about what's actually hard.",
    bodyKind: "commentary",
    bodySource:
      "Source: Krista Tippett, 'On Being' (podcast). Full archive free at onbeing.org.",
    bodyText: `Most interview shows ask the easy questions and let the guest do the work. Tippett does the opposite. She prepares as if she's about to spend an hour with someone she will not get to talk to again. She listens for what the guest is reaching for and not quite saying. Then, gently, she asks the question that lets them say it.

The result is an archive of conversations that don't sound like content. They sound like two people thinking together. A geneticist talks about her mother's death and how it changed her relationship to data. A poet talks about the inside of a hospice room. A monk talks about anger. None of these conversations resolve in a tidy lesson. They open something.

Sage points to this podcast when you're in a season that needs *companionship* more than information. You don't need another framework. You need to hear other people, in real time, navigate questions that don't have answers — illness, faith, grief, vocation, what it actually means to be loved. The podcast's gift is that it doesn't pretend the questions have been figured out. It treats them as the kind of questions you stay with for life.

The full archive is free at onbeing.org. Each episode is around an hour. There's no order to listen in. Sage's rec is to look at the guest list, find someone whose work you've never read, and start there. The not-knowing is part of the pleasure.`,
  },
  {
    type: "podcast",
    title: "John O'Donohue — The Inner Landscape of Beauty",
    author: "On Being / Krista Tippett",
    url: "https://onbeing.org/programs/john-odonohue-the-inner-landscape-of-beauty/",
    blurb:
      "One of the most-played episodes of On Being. Celtic mystic O'Donohue on friendship, beauty, longing, and the soul.",
    themes: ["friendship", "soul", "longing", "belonging", "beauty"],
    why: "When the conversation is about loneliness or longing in a way that wants softer language than therapy.",
    bodyKind: "commentary",
    bodySource:
      "Source: Krista Tippett, 'John O'Donohue — The Inner Landscape of Beauty,' On Being, originally aired 2008; re-released after his death. Audio + transcript at onbeing.org.",
    bodyText: `O'Donohue was an Irish poet, philosopher, and former Catholic priest who spent most of his life thinking about beauty as an essential nutrient. Not beauty as decoration — not pretty things — but beauty as the quality the soul recognizes when something is *true* and *whole.* He believed people were dying, slowly, from not having enough of it.

This episode aired in 2008. Six weeks later he died unexpectedly in his sleep. Tippett re-released it. It became one of the most-played episodes On Being has ever produced, and it's easy to hear why. O'Donohue talks about friendship the way most of us talk about the weather — with the assumption that it is the central fact, not a footnote. He talks about thresholds. He talks about how we live so much of our lives in interior spaces designed to extract usefulness from us, and how *beauty* — a tree, a piece of music, a long conversation — is what restores us to the part of ourselves that isn't useful for anything.

Sage points to this episode when you're touched by a kind of loneliness no therapeutic vocabulary quite reaches. The loneliness of needing to be *known* rather than *managed.* The loneliness of being too efficient for too long. O'Donohue speaks slowly, in long, beautiful Irish-cadenced sentences, and somewhere in the second half you tend to soften.

The episode is free at onbeing.org. It's about an hour. Listen with a cup of tea and no other tabs open.`,
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
    bodyKind: "commentary",
    bodySource:
      "Source: Krista Tippett, 'David Whyte — The Conversational Nature of Reality,' On Being, 2016. Audio + transcript at onbeing.org.",
    bodyText: `Whyte is a poet, but he spends most of his time talking to people inside large organizations. His specialty is the bridge between *the inner life* (which most workplaces pretend doesn't exist) and *the work* (which most spiritual frameworks pretend doesn't matter). He has spent a career arguing that this is a false split.

His central frame is the *three marriages.* You are, simultaneously, married to a person (or to your aloneness), to your work, and to yourself. Most adults try to solve their lives by getting two of those right and quietly starving the third. The work is great but the marriage suffers. Or the marriage is rich but the work has slowly become joyless. Or both look fine from the outside and the relationship to the self has gone quiet.

His argument, in this conversation with Tippett, is that the three cannot be bargained against each other. You can't make up for a marriage to a self that you've abandoned by pouring more into the marriage to your partner. The starved one will keep being starved, and the others will eventually feel it too.

Sage points to this episode when you're using the language of *trade-offs* — *I just have to push through this season at work,* *the relationship will recover when X.* Whyte's quiet challenge is that the seasons don't end the way we tell ourselves they will, and the part of you that gets put down keeps being the part that gets put down.

The conversation is fifty-three minutes. Whyte reads several of his poems in it. Listen for those — they tend to undo whatever your reasoning was in a single line.`,
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
          bodyText: item.bodyText ?? null,
          bodyKind: item.bodyKind ?? null,
          bodySource: item.bodySource ?? null,
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
          bodyText: item.bodyText ?? null,
          bodyKind: item.bodyKind ?? null,
          bodySource: item.bodySource ?? null,
        },
      });
      created++;
    }
  }

  // Deactivation pass — anything still active in the DB but not in the new
  // SEED list gets isActive: false. Preserves existing recommendation rows
  // but hides dropped items from new matches and from /library.
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
