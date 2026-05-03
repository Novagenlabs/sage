# Sage library — image generation prompts

> **Internal — keep under `/docs`.** Anything inside `/public` is served as a static asset, so this file does **not** belong there.

Each cover is **square 1:1** (we render it cropped to aspect-square, so a 1024×1024 export looks great on retina). Save as **WebP** if you can (smallest), or JPG/PNG. Drop into `public/resource-covers/<id>.webp`.

The `<ResourceCover>` component prefers a real image over the procedural fallback. Order tried: `webp` → `jpg` → `png`. If the file is missing the page still renders — it just shows the procedural cover.

## Style preamble

Paste this **at the start of every prompt** — it's what holds the series together:

> Editorial book-cover art, painterly oil texture with visible brushstrokes, warm muted palette of ember orange, antique gold, sage green, deep plum, chamber-black, and bloom pink. Composition feels like a 1970s Penguin Modern Classics endpaper crossed with Hilma af Klint and Agnes Martin. Square 1:1, no text, no typography, no letters, no logos. Subtle film grain. Hand-rendered, contemplative, calm. Avoid photo-realism, avoid digital sheen, avoid AI gloss, avoid neon, avoid stock-photo aesthetics, no faces in tight close-up. Soft natural lighting.

Then append the **subject** line for each resource.

## The 28 active covers

Filename column is exactly what to save as (`<id>.webp`).

### Public-domain texts

| File | Title — subject prompt |
|------|------------------------|
| `cmopfmsjs000g3gt624ybgzaf.webp` | **Meditations (Marcus Aurelius)** — An oil lamp on a stone column at first light, the silhouette of a distant Roman aqueduct in the warm haze beyond. |
| `cmopfmqxj000c3gt6m36t5jjx.webp` | **Tao Te Ching (Lao Tzu)** — Ink-wash painting: a calm river flowing around a single dark stone, brush-stroke trees in the distance, mist between them. Sumi-e influenced. |
| `cmopfms59000f3gt6o097n67v.webp` | **Siddhartha (Hermann Hesse)** — A young man crossing a calm river by ferry at dawn. The far bank dissolves into mist. Soft watercolor. |
| `cmopfmo3n00053gt6vf4phjvl.webp` | **Letters to a Young Poet (Rainer Maria Rilke)** — An open envelope on a worn wooden writing desk. A single feather quill resting beside it. Soft window light from the left. |

### TED talks (free, with transcripts)

| File | Title — subject prompt |
|------|------------------------|
| `cmopfmlud00003gt6y4t26z8g.webp` | **Plato's Allegory of the Cave (TED-Ed)** — A figure stepping out of a dark cave mouth into a wash of warm golden light, casting an elongated shadow back into the cave. Two silhouetted figures still chained inside, facing the wall. |
| `cmopfmpbh00083gt607jmuk2j.webp` | **The Power of Vulnerability (Brené Brown)** — A thinly-walled glass bowl on a stone surface with a single hairline crack running through it, light pouring through the crack. Quiet, almost devotional. |
| `cmopqi0ko00023gz1lz7oue4e.webp` | **Listening to Shame (Brené Brown)** — A figure sitting alone in a small pool of warm lamplight; everything around them is dark. The light has a quality of being heard. |
| `cmopfmowr00073gt607m2q7q3.webp` | **The Paradox of Choice (Barry Schwartz)** — A figure in silhouette at a threshold, with seven open doors fanning out around them, each slightly ajar. Interiors hint at different tones. |
| `cmopqhzj000003gz12hcp5v2y.webp` | **The Secret to Desire (Esther Perel)** — Two small birds in adjacent open cages with the doors unlatched. Warm interior light, a cool window beyond. The birds aren't leaving — yet. |
| `cmopqi06100013gz1w0ctzxqg.webp` | **12 Truths from Life and Writing (Anne Lamott)** — A pair of cupped hands releasing a small bird mid-flight, a single feather drifting downward. Warm window light. |

### Speeches / public-domain essays

| File | Title — subject prompt |
|------|------------------------|
| `cmopqi0z800033gz1yha7gdj6.webp` | **Stanford Commencement 2005 (Steve Jobs)** — Three concentric arched doorways, each opening into the next, the innermost glowing warm. Architectural, contemplative. (For "you can only connect the dots looking backward.") |
| `cmopqi1dt00043gz1aomp3yqn.webp` | **This Is Water (David Foster Wallace)** — Two koi-like fish in still water, one looking up at sunlight refracting through the surface, the other looking forward unaware. Painterly. |
| `cmopqi1sb00053gz1jb8mbgx9.webp` | **Letter from Birmingham Jail (MLK)** — A single iron-barred window letting a warm shaft of light fall onto a wooden cell floor; a folded letter on the floor in the light. |
| `cmopqi26z00063gz1kv87e5kq.webp` | **The Transformation of Silence (Audre Lorde)** — A figure holding their hand to their throat; the throat itself faintly glowing warm gold, as if light is just about to leave. |

### Free essays / blog posts

| File | Title — subject prompt |
|------|------------------------|
| `cmopfmvdp000n3gt6uyoxvyh7.webp` | **Top Five Regrets of the Dying (Bronnie Ware)** — A weathered hand resting on a sun-warmed sill, a row of clay pots holding small herbs catching late-afternoon light. |
| `cmopqi2lg00073gz18at09gsi.webp` | **The Tail End (Tim Urban)** — A grid of small ember dots on a dark surface, the grid noticeably finite, with the last few dots painted in a slightly brighter ember. The whole composition suggesting a calendar that's almost full. |
| `cmopqi30b00083gz1ic7ex74p.webp` | **The Crossroads of Should and Must (Elle Luna)** — Two paths splitting from a single point in a soft-lit landscape. One paved and easy, one rougher and warmer-toned, leading toward a hill of golden light. |
| `cmopqi3ta00093gz19kfqq4wc.webp` | **Total Eclipse (Annie Dillard)** — A black sun ringed in flame against a dusk sky, the landscape below in a wash of plum and bronze, two tiny figures watching from a hillside. |

### Foundation / archive lectures

| File | Title — subject prompt |
|------|------------------------|
| `cmopfmmhf00013gt6ehijwq5c.webp` | **The Real You (Alan Watts)** — Concentric translucent masks layered one inside another, each slightly different in shape, faintly glowing from within. No face — just the masks themselves nested like Russian dolls. |
| `cmopfmmvy00023gt6dnzlo1mg.webp` | **On Loneliness (Krishnamurti)** — A single empty wooden chair facing a tall open window. Late afternoon amber light pours across an otherwise empty room. Long shadows. |
| `cmopqi4md000a3gz193txqr69.webp` | **On Fear (Krishnamurti)** — A figure standing on a dim path, looking down at their own elongated shadow which appears to have texture and depth, almost like another being. |
| `cmopqi7gb000e3gz15998imfq.webp` | **The Hero's Adventure (Joseph Campbell)** — A heroic silhouette stepping across a circular threshold of warm light against a darker frame. The threshold reads as a doorway out of one world into another. |

### Free podcast episodes / interviews

| File | Title — subject prompt |
|------|------------------------|
| `cmopfmtri000j3gt6k6huvde4.webp` | **Where Should We Begin? (Esther Perel)** — Two empty armchairs facing each other across a low table, a single glass of water on the table. Late evening, lamp glow. |
| `cmopfmxz9000t3gt6l45tgmm0.webp` | **On Being (Krista Tippett)** — Two ceramic mugs of tea on a wooden kitchen table, faint steam rising, an open notebook between them, late evening lamp glow. |
| `cmopqi68k000b3gz1ne8czcjz.webp` | **The Inner Landscape of Beauty (John O'Donohue / On Being)** — Two figures walking side by side along a Celtic coastline at golden hour, distant standing stones, slate-blue water. Watercolor. |
| `cmopqi80r000f3gz1hesv3nbk.webp` | **Living the Questions (David Whyte / On Being)** — Three interlocking rings — bronze, copper, and antique gold — laid on a dark surface. Each ring has visible brushstroke texture. |

### Practice / guided audio

| File | Title — subject prompt |
|------|------------------------|
| `cmopqi6n7000c3gz1br8ffq9m.webp` | **The RAIN of Self-Compassion (Tara Brach)** — Two pairs of cupped hands meeting palm to palm, soft rose-gold glow between them. The gesture is one of self-meeting. |
| `cmopqi71p000d3gz1557rn69m.webp` | **ACT in a Nutshell (Russ Harris)** — A figure walking out of a hall of mirrors toward an open warm landscape. The mirrors fragment behind them into pieces. |

## Title → ID lookup

If the IDs change for any reason (re-seed), you can match by title instead:

```
Plato's Allegory of the Cave            → cmopfmlud00003gt6y4t26z8g
The Real You                            → cmopfmmhf00013gt6ehijwq5c
On Loneliness                           → cmopfmmvy00023gt6dnzlo1mg
Letters to a Young Poet                 → cmopfmo3n00053gt6vf4phjvl
The Paradox of Choice                   → cmopfmowr00073gt607m2q7q3
The Power of Vulnerability              → cmopfmpbh00083gt607jmuk2j
Tao Te Ching                            → cmopfmqxj000c3gt6m36t5jjx
Siddhartha                              → cmopfms59000f3gt6o097n67v
Meditations                             → cmopfmsjs000g3gt624ybgzaf
Where Should We Begin?                  → cmopfmtri000j3gt6k6huvde4
The Top Five Regrets of the Dying       → cmopfmvdp000n3gt6uyoxvyh7
On Being                                → cmopfmxz9000t3gt6l45tgmm0
The Secret to Desire                    → cmopqhzj000003gz12hcp5v2y
12 Truths I Learned From Life…          → cmopqi06100013gz1w0ctzxqg
Listening to Shame                      → cmopqi0ko00023gz1lz7oue4e
Stanford Commencement Address (2005)    → cmopqi0z800033gz1yha7gdj6
This Is Water                           → cmopqi1dt00043gz1aomp3yqn
Letter from Birmingham Jail             → cmopqi1sb00053gz1jb8mbgx9
The Transformation of Silence…          → cmopqi26z00063gz1kv87e5kq
The Tail End                            → cmopqi2lg00073gz18at09gsi
The Crossroads of Should and Must       → cmopqi30b00083gz1ic7ex74p
Total Eclipse                           → cmopqi3ta00093gz19kfqq4wc
On Fear                                 → cmopqi4md000a3gz193txqr69
The Inner Landscape of Beauty           → cmopqi68k000b3gz1ne8czcjz
The RAIN of Self-Compassion             → cmopqi6n7000c3gz1br8ffq9m
ACT in a Nutshell                       → cmopqi71p000d3gz1557rn69m
The Hero's Adventure                    → cmopqi7gb000e3gz15998imfq
Living the Questions                    → cmopqi80r000f3gz1hesv3nbk
```

## Stale covers (resources deactivated)

These IDs are still in `public/resource-covers/` from the previous catalog but their resources are now `isActive: false`. They don't render anywhere, but you can delete them whenever you want to clean up:

```
cmopfmnah00033gt6mcn4jg0c   Man's Search for Meaning
cmopfmnp200043gt6mdfd9kxl   The Myth of Sisyphus
cmopfmoia00063gt6x3nxjbmp   10/10/10
cmopfmppu00093gt61v7ez6gl   Bird by Bird
cmopfmq4f000a3gt6ac79x3lf   Radical Acceptance
cmopfmqix000b3gt66kpx3o11   When Things Fall Apart
cmopfmrc5000d3gt6u0ivhq4h   No Bad Parts
cmopfmrqq000e3gt6taheqdfn   The Shadow
cmopfmsyc000h3gt6vaets6pg   On the Shortness of Life
cmopfmtcx000i3gt6zxtm0f67   Mating in Captivity
cmopfmu64000k3gt6seefy7tg   Anam Cara
cmopfmukm000l3gt67exh9h78   The Power of Myth (deactivated; replaced by The Hero's Adventure)
cmopfmuz7000m3gt6usou2c20   The Three Marriages
cmopfmvsc000o3gt65turub6d   The Book of Awakening
cmopfmw6v000p3gt620nuktg4   The Wounded Healer
cmopfmwlg000q3gt6yg52oiw4   The Happiness Trap (deactivated; replaced by ACT in a Nutshell)
cmopfmx00000r3gt6oq2mad7u   Pleasure Activism
cmopfmxkp000s3gt6bt9nmiei   Wild Geese
cmopfmyel000u3gt6bup3jzmz   Differentiation of Self
```

## Tools that work well

- **ChatGPT (GPT-4o image)** — paste the preamble + subject in one message. The most consistent for "painterly editorial" style.
- **Google AI Studio (Gemini)** — `gemini-2.5-flash-image-preview` (or whatever's current). Free tier supports image generation.
- **Black Forest Labs FLUX** via Replicate — best results for painterly style if you have credits.
- **Midjourney** — good for atmosphere, harder to constrain palette. Add `--ar 1:1 --style raw` to the prompt.

If you'd rather I run them automatically against an API, give me a key for one of those services and I'll wire a script.
