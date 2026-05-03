# Sage library — image generation prompts

> **Internal — keep under `/docs`.** Anything inside `/public` is served as a static asset, so this file does **not** belong there.

Each cover is **square 1:1** (we render it cropped to aspect-square, so a 1024×1024 export looks great on retina). Save as **WebP** if you can (smallest), or JPG/PNG. Drop into `public/resource-covers/<id>.webp`.

The component automatically prefers a real image over the procedural fallback. Order tried: `webp` → `jpg` → `png`. If a file is missing the page still renders — it just shows the procedural cover.

## Style preamble

Paste this **at the start of every prompt**. It's what holds the series together:

> Editorial book-cover art, painterly oil texture with visible brushstrokes, warm muted palette of ember orange, antique gold, sage green, deep plum, chamber-black, and bloom pink. Composition feels like a 1970s Penguin Modern Classics endpaper crossed with Hilma af Klint and Agnes Martin. Square 1:1, no text, no typography, no letters, no logos. Subtle film grain. Hand-rendered, contemplative, calm. Avoid photo-realism, avoid digital sheen, avoid AI gloss, avoid neon, avoid stock-photo aesthetics, no faces in tight close-up. Soft natural lighting.

Then append the **subject** line for each resource.

## The 31 covers

Filename column is exactly what to save the file as (`<id>.webp`).

| File | Subject prompt |
|------|----------------|
| `cmopfmlud00003gt6y4t26z8g.webp` | A figure stepping out of a dark cave mouth into a wash of warm golden light, casting an elongated shadow back into the cave. Two silhouetted figures still chained inside, facing the wall. Painterly. |
| `cmopfmmhf00013gt6ehijwq5c.webp` | Concentric translucent masks layered one inside another, each slightly different in shape, faintly glowing from within. No face — just the masks themselves nested like Russian dolls. |
| `cmopfmmvy00023gt6dnzlo1mg.webp` | A single empty wooden chair facing a tall open window. Late afternoon amber light pours across an otherwise empty room. Long shadows. |
| `cmopfmnah00033gt6mcn4jg0c.webp` | A small candle flame held in two cupped hands at the centre of an otherwise dark frame. The hands and flame painted in warm ember and gold; surrounding void in deep chamber-black. |
| `cmopfmnp200043gt6mdfd9kxl.webp` | A solitary figure pushing a glowing warm-toned orb up a vast, quiet hillside under a tan sky. The orb is the brightest thing in the painting. |
| `cmopfmo3n00053gt6vf4phjvl.webp` | An open envelope on a worn wooden writing desk. A single feather quill resting beside it. Soft window light from the left. |
| `cmopfmoia00063gt6x3nxjbmp.webp` | Three concentric arched doorways, each opening into the next, the innermost glowing warm. Architectural and contemplative. |
| `cmopfmowr00073gt607m2q7q3.webp` | A figure in silhouette at a threshold, with seven open doors fanning out around them, each slightly ajar. Interiors of the doors hint at different tones. |
| `cmopfmpbh00083gt607jmuk2j.webp` | A thinly-walled glass bowl on a stone surface with a single hairline crack running through it, light pouring through the crack. Quiet, almost devotional. |
| `cmopfmppu00093gt61v7ez6gl.webp` | A pair of cupped hands releasing a small bird mid-flight, a single feather drifting downward. Warm window light. |
| `cmopfmq4f000a3gt6ac79x3lf.webp` | Two pairs of cupped hands meeting palm to palm, soft rose-gold glow between them. The gesture is one of self-meeting. |
| `cmopfmqix000b3gt66kpx3o11.webp` | Pottery shards — some still attached to the rim of a broken vessel, others scattered — arranged on dark earth. Quiet diffuse light catching the broken edges. |
| `cmopfmqxj000c3gt6m36t5jjx.webp` | Ink-wash painting: a calm river flowing around a single dark stone, brush-stroke trees in the distance, mist between them. Sumi-e influenced. |
| `cmopfmrc5000d3gt6u0ivhq4h.webp` | A small constellation of differently-sized warm orbs gently orbiting a calm central one. Each orb a slightly different ember/gold/plum/sage hue. |
| `cmopfmrqq000e3gt6taheqdfn.webp` | A figure holding a lantern at dusk casting a long shadow across the frame; the shadow overlaps a second indistinct figure further away. |
| `cmopfms59000f3gt6o097n67v.webp` | A young man crossing a calm river by ferry at dawn. The far bank dissolves into mist. Soft watercolor. |
| `cmopfmsjs000g3gt624ybgzaf.webp` | An oil lamp on a stone column at first light, the silhouette of a distant Roman aqueduct in the warm haze beyond. |
| `cmopfmsyc000h3gt6vaets6pg.webp` | A glass sand timer mid-flow, the sand half-spent, sitting on a worn wooden surface. A single fig leaf nearby. Late afternoon light. |
| `cmopfmtcx000i3gt6zxtm0f67.webp` | Two small birds in adjacent open cages with the doors unlatched. Warm interior light, a cool window beyond. The birds aren't leaving — yet. |
| `cmopfmtri000j3gt6k6huvde4.webp` | Two empty armchairs facing each other across a low table, a single glass of water on the table. Late evening, lamp glow. |
| `cmopfmu64000k3gt6seefy7tg.webp` | Two figures walking side by side along a Celtic coastline at golden hour, distant standing stones, slate-blue water. Watercolor. |
| `cmopfmukm000l3gt67exh9h78.webp` | A heroic silhouette stepping across a circular threshold of warm light against a darker frame. The threshold reads as a doorway out of one world into another. |
| `cmopfmuz7000m3gt6usou2c20.webp` | Three interlocking rings — bronze, copper, and antique gold — laid on a dark surface. Each ring has visible brushstroke texture. |
| `cmopfmvdp000n3gt6uyoxvyh7.webp` | A weathered hand resting on a sun-warmed windowsill, a row of clay pots holding small herbs catching late-afternoon light. |
| `cmopfmvsc000o3gt65turub6d.webp` | A small open journal on a wooden surface with a single dried wildflower pressed between the pages. Morning light. |
| `cmopfmw6v000p3gt620nuktg4.webp` | A figure with a bandaged hand pouring water from a clay vessel into another's outstretched cup. Both faces are off-frame; only the gesture is visible. |
| `cmopfmwlg000q3gt6yg52oiw4.webp` | A figure walking out of a hall of mirrors toward an open warm landscape. The mirrors fragment behind them into pieces. |
| `cmopfmx00000r3gt6oq2mad7u.webp` | A single figure floating on the surface of still water at sunset, eyes closed, surrounded by warm reflected light. Painterly impressionism. |
| `cmopfmxkp000s3gt6bt9nmiei.webp` | A V-formation of geese against a dusk sky, the wedge softly disappearing into a warm haze. Sky has bands of ember and plum. |
| `cmopfmxz9000t3gt6l45tgmm0.webp` | Two ceramic mugs of tea on a wooden kitchen table, faint steam rising, an open notebook between them, late evening lamp glow. |
| `cmopfmyel000u3gt6bup3jzmz.webp` | A single tree standing slightly apart from a cluster of trees of the same species, deep root system faintly visible underground. Storybook woodcut feel. |

## Reference matching by title

If the IDs change for any reason (re-seed), you can match by title instead:

```
Plato's Allegory of the Cave            → cmopfmlud00003gt6y4t26z8g
The Real You                            → cmopfmmhf00013gt6ehijwq5c
On Loneliness                           → cmopfmmvy00023gt6dnzlo1mg
Man's Search for Meaning                → cmopfmnah00033gt6mcn4jg0c
The Myth of Sisyphus                    → cmopfmnp200043gt6mdfd9kxl
Letters to a Young Poet                 → cmopfmo3n00053gt6vf4phjvl
10/10/10                                → cmopfmoia00063gt6x3nxjbmp
The Paradox of Choice                   → cmopfmowr00073gt607m2q7q3
The Power of Vulnerability              → cmopfmpbh00083gt607jmuk2j
Bird by Bird                            → cmopfmppu00093gt61v7ez6gl
Radical Acceptance                      → cmopfmq4f000a3gt6ac79x3lf
When Things Fall Apart                  → cmopfmqix000b3gt66kpx3o11
Tao Te Ching                            → cmopfmqxj000c3gt6m36t5jjx
No Bad Parts                            → cmopfmrc5000d3gt6u0ivhq4h
The Shadow                              → cmopfmrqq000e3gt6taheqdfn
Siddhartha                              → cmopfms59000f3gt6o097n67v
Meditations                             → cmopfmsjs000g3gt624ybgzaf
On the Shortness of Life                → cmopfmsyc000h3gt6vaets6pg
Mating in Captivity                     → cmopfmtcx000i3gt6zxtm0f67
Where Should We Begin?                  → cmopfmtri000j3gt6k6huvde4
Anam Cara                               → cmopfmu64000k3gt6seefy7tg
The Power of Myth                       → cmopfmukm000l3gt67exh9h78
The Three Marriages                     → cmopfmuz7000m3gt6usou2c20
The Top Five Regrets of the Dying       → cmopfmvdp000n3gt6uyoxvyh7
The Book of Awakening                   → cmopfmvsc000o3gt65turub6d
The Wounded Healer                      → cmopfmw6v000p3gt620nuktg4
The Happiness Trap                      → cmopfmwlg000q3gt6yg52oiw4
Pleasure Activism                       → cmopfmx00000r3gt6oq2mad7u
Wild Geese                              → cmopfmxkp000s3gt6bt9nmiei
On Being                                → cmopfmxz9000t3gt6l45tgmm0
Differentiation of Self                 → cmopfmyel000u3gt6bup3jzmz
```

## Tools that work well

- **ChatGPT (GPT-4o image)** — paste the preamble + subject in one message. The most consistent for "painterly editorial" style.
- **Google AI Studio (Gemini)** — `gemini-2.5-flash-image-preview` (or whatever's current). Free tier supports image generation.
- **Black Forest Labs FLUX** via Replicate — best results for painterly style if you have credits.
- **Midjourney** — good for atmosphere, harder to constrain palette. Add `--ar 1:1 --style raw` to the prompt.

If you'd rather I run them automatically against an API, give me a key for one of those services and I'll wire a script.
