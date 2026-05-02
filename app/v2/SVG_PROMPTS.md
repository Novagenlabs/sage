# Sage v2 — SVG asset prompts (pass 2)

These are the QuiverAI-ready prompts for every illustration/icon needed in the v2 UI. Pass them to `/quiver-ai` (or the Quiver `svg_generate` endpoint with `arrow-1.1`) and drop the resulting SVGs into `/public/v2/`. Each prompt is tuned for: mobile-first scale, soft chunky-bauhaus shapes (Pillowtalk-style), and Sage's palette (black bg, zest #cfe83a, bloom #f5b8d6, plum #b48af2, peach #f7b08a, sage-green #6b9a8d, ember #e07c38).

## Wordmark / brand

1. **sage-mark.svg** (currently inline) — "Three soft vertical drops/ovals, slightly overlapping, descending in size left-to-right. Single fill color, no stroke. Reads like the letter M tipped on its side. Chunky organic geometry, evocative of pillows, breath, soft confidence. Black on transparent."

2. **sage-wordmark.svg** — "The lowercase word 'sage' in a humanist sans-serif, with the 'g' descender curling into a small soft droplet. Title-card weight. Pair with the three-drop mark to its left."

## Onboarding hero illustrations

3. **welcome-1-mouth.svg** — "A symmetrical bauhaus-style face/mask, all in lime-zest yellow on black. Big puckered lips in the center, two leafy/fern wings sprouting from each side of the mouth, a vertical wavy plume above it. Squiggles and droplets at the bottom. Playful, mythic, slightly surreal."

4. **welcome-2-question.svg** — "An abstract pink (#f5b8d6) head with a giant exposed brain swirl on top, a single curious eye in the center, no mouth, ear-curl shapes flanking the sides. Soft chunky shapes only, no lines. Reads as 'curiosity' / 'asking questions'."

5. **welcome-3-ghost.svg** — "A friendly ghost-shape (rounded body, two eye-dots) in plum (#b48af2) holding a tiny lock with a chartreuse padlock keyhole. Soft sleepy posture. Translucent suggestion via overlapping shapes."

6. **disco-ball.svg** — "A pink retro disco ball with a black grid pattern, suspended from a chartreuse cord, surrounded by 4 tiny lime sparkle stars and 2 lime curve-stripes. Floating/levitating mood. Used on the personalizing-loading screen."

## Decorative onboarding bits

7. **sun-rays-name.svg** — "A half-sun rising from a horizon line, in lime/zest. From its top edge sprout 9 thin radiating rays each capped with a small filled circle (like dewdrops). The sun has two black eyes and a small smile. Friendly mascot."

8. **birthday-cake.svg** — "A small wooden-brown cake/log shape with three candles: peach, white, and lime. Flames are little orange teardrops. Minimal, chunky."

9. **trio-sprouts.svg** — "Three identical small abstract sprouts in plum, evenly spaced. Each sprout: a vertical oval body, a small circle on top, a thin stem connecting them. Reads as 'goals' / 'intentions'."

## Home / today screen

10. **mood-bg-morning.svg** — "Vertical full-bleed mobile background. Top half: deep charcoal black. Lower half: blurred gradient orb in soft peach with a hint of lime in the upper-left. No hard edges, all bokeh-soft. Phone wallpaper feel."

11. **mood-bg-evening.svg** — "Same composition as morning but with a plum-purple core and pink-bloom highlight. Cooler, sleepier mood."

12. **eye-icon-tag.svg** — "A simple stylized eye icon for the section pill, white on transparent. The pupil is a tiny vertical oval (Sage drop)."

## Voice / talk screen

13. **soundwave-orb.svg** — "Three blurred ovals horizontal: large left, medium center, small right. All in lime with heavy gaussian blur, evoking a glowing voice waveform. Used as the active 'listening' visual."

14. **moon-night.svg** — "A friendly crescent moon icon with a tiny chartreuse star, in white on transparent. For the 'night mode' button on voice screen."

14a. **voice-picker-mark.svg** — "Hero illustration for the voice-picker onboarding screen. A single open-mouth/lip shape (like a soft horizontal almond) in warm ember-orange, with three concentric ripple rings emanating outward in fading orange opacity. Centered, no background. Reads as 'speaking aloud, being heard.' Soft chunky bauhaus style — no thin lines, all filled shapes. ~280×180 viewbox."

## Insights / patterns

15. **pattern-card-control.svg** — "Abstract decorative motif for a 'control' insight card. A grid of small plum dots warping toward the center, like a gravity well. Plum gradient on dark."

16. **pattern-card-build.svg** — "A scribbled tower of soft peach blocks growing upward, slightly off-axis. Hand-drawn, casual."

17. **pattern-card-loop.svg** — "A continuous lime ribbon looped into a figure-8, with one tiny break in the line. Suggests recurring patterns with an opening."

## Tarot-style cards (patterns / archetype reveals)

18. **archetype-visionary.svg** — "Tarot-card sized illustration: black sprouting hand-shape with five fingers, central single eye in the palm, on a lavender background with chartreuse leaf-fronds growing from each side. Caption: 'the visionary'."

19. **archetype-builder.svg** — "Tarot-card sized illustration: a peach pyramid being assembled by abstract brick-shapes, with a lime sun rising behind it. Confident, generative."

20. **archetype-witness.svg** — "Tarot-card sized illustration: a single large eye made of overlapping translucent ovals (sage/plum), surrounded by tiny stars. 'The witness'."

## Ghost mode

21. **ghost-on.svg** — "A semi-transparent floating ghost in plum with two dot-eyes and a tiny chartreuse padlock at its base. Soft outline."

22. **ghost-off.svg** — "Same ghost but solid plum, no lock, eyes more open. Used to show ghost-mode is OFF / saving."

## Referrals

23. **gift-box.svg** — "A chunky wrapped present: lime body, darker lime band, black vertical ribbon, a pink ribbon-curl on left and a plum ribbon-curl on right. Levitates above its shadow. Joyful."

## Empty states

24. **empty-entries.svg** — "Three transparent overlapping drop-shapes (the sage mark) with a pencil-line drawing a fourth one being added. Soft white-on-black, suggests starting fresh."

25. **empty-patterns.svg** — "A constellation of seven small zest dots connected by faint lines, with one missing — the implied next entry. Subtle, encourages action."

## App icon set (iOS-style)

26. **app-icon-sage.svg** — "Square app icon, 1024×1024 safe zone. Lime/zest background. The three-drop sage mark in solid black, centered, slight padding. iOS rounded-square frame implied."

27. **app-icon-ghost-variant.svg** — "Same icon but plum background with the mark in lime. Used when ghost mode is active."

## Iconography (small UI)

28. **icon-flame-streak.svg** — "Tiny flame icon, single stroke, slightly leaning right, in zest yellow. Used in the streak chip."

29. **icon-orb-talk.svg** — "Three vertical ovals decreasing in size left-to-right (mini sage mark), used as the 'talk' button glyph."

30. **icon-ear.svg** — "Stylized human ear, single thick line, lime. For 'listening' moments."

---

## Generation tips for /quiver-ai

- All assets target a **dark canvas (#08080c)** unless flagged otherwise — request transparent background by default.
- Stick to **2–3 fills max per asset** (the brand palette) — Pillowtalk's discipline is part of the look.
- Prefer **chunky filled shapes** over outline icons for hero illustrations.
- Use **no gradients on iconography**; reserve gradients for `mood-bg-*` backgrounds only.
- Suggested QuiverAI model: `arrow-1.1` for hero illustrations, `arrow-1` for simple icons.

When the SVGs land, drop into `/public/v2/<filename>.svg` and replace the inline placeholders in:
- `components/v2/sage-mark.tsx` → `sage-mark.svg`
- `app/v2/onboarding/welcome/page.tsx` → swap `<SageMark>` for `welcome-{1,2,3}.svg`
- `app/v2/onboarding/name/page.tsx` → `sun-rays-name.svg`
- `app/v2/onboarding/birthday/page.tsx` → `birthday-cake.svg`
- `app/v2/onboarding/topics/page.tsx` → `trio-sprouts.svg`
- `app/v2/onboarding/loading/page.tsx` → `disco-ball.svg`
- `app/v2/chat/voice/page.tsx` → `soundwave-orb.svg`
- `app/v2/ghost/page.tsx` → `ghost-on.svg` / `ghost-off.svg`
- `app/v2/referrals/page.tsx` → `gift-box.svg`
- `app/v2/entries/page.tsx` (empty state) → `empty-entries.svg`
