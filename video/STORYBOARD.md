---
format: 1080x1080
duration: 27s
message: "your coffee is still awake at bedtime"
arc: Hook → Demo cycle → Deepen → Payoff → CTA
audience: people who recognize 3pm coffee regret at 1am
mode: autonomous
music: none
---

## Video direction

- **palette system** — broadside remixed onto nightcap: ink `#0B0E1A` ground, bone `#F2EBDC` text, amber `#F0A95C` the single accent (kickers, stat moments, callout underlines). Demo frames run in the dark register; the end card runs the amber register (amber ground, ink type). Footage is already the brand.
- **motion grammar** — long-tail `power3` eases, reveals paced to the footage's own action (each callout lands as the gesture completes, never at t=0). During holds: subtle jitter or the footage's own aliveness only — no breathing cards, no lazy drift.
- **rhythm** — frame 1 is a held reveal (the ghost is already there), frame 5 is the breather (certificate reads still), frames 2–4 carry the motion.
- **negative list** — no browser chrome recreation, no bokeh/AI gradients, no extra display accents beyond amber; the real amber in-app cursor stays visible in footage. Bottom ~17% kept clear of important content for the caption band.

## Frame 1 — The ghost is already up

- scene: 75% haunted — the ghost looms at the bed line over a late day
- duration: 4s
- transition_in: cut
- status: outline
- poster: 3s
- src: compositions/frames/01-hook.html
- asset_candidates: assets/footage/hook.mp4
- blueprint: zoom-out-workspace-reveal (Adapt)
- focal: assets/footage/hook.mp4
- roles: hook.mp4 = background/full-bleed hero

Adapt: footage plays full-bleed; the signature zoom-out opens tight on the ghost region and decelerates to the full UI. Kicker + hook line overlay the reveal.
Scene 1 (0.0–1.4s): footage seated ~125% scale on the ghost/bed-line region, playing; mono kicker "NIGHTCAP" fades in top-left over a 1px hairline chrome bar.
Scene 2 (1.4–3.0s): one continuous decelerating zoom-out to 100% reveals the whole descent column, shelf, trails; hook line "your coffee is still awake at bedtime." types/lands lower-third in lowercase display, amber underline accent.
Scene 3 (3.0–4.0s): hold the read — footage alive (fireflies, mist), type still.

## Frame 2 — Drop a drink

- scene: espresso chip drags off the shelf, amber preview trail feeds the ghost
- duration: 6s
- transition_in: cut
- status: outline
- src: compositions/frames/02-drop.html
- asset_candidates: assets/footage/drop.mp4
- blueprint: cursor-ui-demo (Adapt)
- focal: assets/footage/drop.mp4
- roles: drop.mp4 = background/full-bleed hero

Adapt: real recorded drag, not a reconstructed UI — the cursor is the app's own amber ring. Camera holds a locked stage; the footage does the gesture.
Scene 1 (0.0–1.2s): footage plays full-bleed; kicker "HOW IT WORKS · 01" fades in top-left hairline chrome.
Scene 2 (1.2–4.6s): the drag happens on screen — cursor grabs espresso, amber preview trail feeds the ghost; at the hold point the callout "drop a drink at the time you had it" lands lower-third, amber stub accent left of it.
Scene 3 (4.6–6.0s): chip lands, trail sinks into the ghost, score ticks up; callout holds, footage settles.

## Frame 3 — Pour another

- scene: doppio drops at 21:45, score jumps past 80%, ghost swells
- duration: 5.5s
- transition_in: cut
- status: outline
- src: compositions/frames/03-second.html
- asset_candidates: assets/footage/second.mp4
- blueprint: cursor-ui-demo (Adapt)
- focal: assets/footage/second.mp4
- roles: second.mp4 = background/full-bleed hero

Scene 1 (0.0–0.8s): footage full-bleed, kicker "HOW IT WORKS · 02" in the chrome position.
Scene 2 (0.8–4.2s): doppio drag — shelf expands, chip crosses to 21:45; callout "every cup still counts at bedtime" lands as the drop commits.
Scene 3 (4.2–5.5s): score jumps past 80%, ghost visibly swells; hold the bigger apparition — the compounding consequence is the beat.

## Frame 4 — Move the bed line

- scene: bed line drags from 23:00 to 22:30; score rolls to 100%, verdict turns "poltergeist"
- duration: 5.5s
- transition_in: cut
- status: outline
- src: compositions/frames/04-bedtime.html
- asset_candidates: assets/footage/bedtime.mp4
- blueprint: cursor-ui-demo (Adapt)
- focal: assets/footage/bedtime.mp4
- roles: bedtime.mp4 = background/full-bleed hero

Scene 1 (0.0–0.8s): footage full-bleed, kicker "HOW IT WORKS · 03".
Scene 2 (0.8–4.4s): cursor drags the violet bed line upward; the score rolls live and the verdict flips to "poltergeist"; callout "the bed line drags too" lands as the drag releases.
Scene 3 (4.4–5.5s): 100% holds — the ghost at full size, the signature payoff of the demo cycle.

## Frame 5 — The certificate

- scene: share tray opens on "100 · poltergeist", save-the-night card
- duration: 4s
- transition_in: crossfade
- status: outline
- src: compositions/frames/05-share.html
- asset_candidates: assets/footage/share.mp4
- blueprint: device-surface-showcase (Adapt)
- focal: assets/footage/share.mp4
- roles: share.mp4 = background/full-bleed hero

Adapt: the dimmed app stays as backdrop while the certificate reads as the hero surface — a held breather before the end card.
Scene 1 (0.0–1.2s): footage plays — tray opens, card slides in; slight push toward the certificate region (~110%).
Scene 2 (1.2–2.4s): callout "the link carries your exact haunting" lands lower-third with amber stub.
Scene 3 (2.4–4.0s): held read — certificate legible, backdrop dimmed by the app itself.

## Frame 6 — nightcap

- scene: ink register — massive lowercase "nightcap", URL underneath
- duration: 4s
- transition_in: crossfade
- status: outline
- src: compositions/frames/06-end.html
- asset_candidates: assets/favicon.svg
- blueprint: logo-assemble-lockup (Adapt)
- focal: brand wordmark built in type (Almendra), favicon ghost as mark
- roles: favicon.svg = supporting mark beside the lockup

Adapt: no logo file — the wordmark IS the product's own display type, so letters cascade into the lockup rather than assembling a drawn mark.
Scene 1 (0.0–1.2s): amber register — ink "nightcap" letters cascade onto the amber ground, massive lowercase, resolving into a centered lockup; ghost mark settles beside it.
Scene 2 (1.2–2.6s): mono sub-line types "how haunted is tonight?" then the URL `nightcap-ashy.vercel.app` lands beneath as the ask.
Scene 3 (2.6–4.0s): held read — the invitation sits still.
