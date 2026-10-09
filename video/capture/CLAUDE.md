# nightcap — how haunted is tonight?

Source: https://nightcap-ashy.vercel.app

To create a video from this capture, use the `product-launch-video` skill.

## What's in This Capture

| File | Contents |
|------|----------|
| `screenshots/contact-sheet.jpg` | **View this first.** All scroll screenshots in labeled grid — see the entire page at a glance |
| `screenshots/scroll-*.png` | Individual viewport screenshots if you need detail on a specific section. |
| `extracted/tokens.json` | Design tokens: 20 colors, 3 fonts, 0 headings, 0 CTAs |
| `extracted/design-styles.json` | Computed styles from live DOM: typography hierarchy, button/card/nav styles, spacing scale, border-radius, box shadows. Primary data source for DESIGN.md. |
| `extracted/asset-descriptions.md` | One-line description of every downloaded asset. Read this for asset selection — only open individual files for safe-zone checking. |
| `extracted/visible-text.txt` | Page text in DOM order, prefixed with HTML tag (`[h1]`, `[p]`, `[a]`). Use as context — rephrase freely. |
| `assets/contact-sheet.jpg` | All downloaded images in one labeled grid. |
| `assets/svgs/contact-sheet.jpg` | SVGs rendered as thumbnails in labeled grid |
| `assets/` | Individual downloaded images, SVGs, and font files. |

## Brand Summary

- **Colors**: #0B0E1A (accent), #F2EBDC (bg-light), #8F887A (neutral), #232B52 (accent), #F0D9A8 (surface-light), #A9E8DC (surface-light), #222A52 (accent), #161C38 (accent), #000000 (bg-dark), #A89F8D (neutral)
- **Fonts**: Almendra (400,700), IBM Plex Mono (400,500), Instrument Sans (400,500,600)
