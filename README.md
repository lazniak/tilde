# The Latent Liturgy

An interactive digital triptych exploring the anomaly of algorithmic creation — where AI generates a face without being asked, and we question why.

## About

This project is an artistic web experience that examines the emergence of Tilda Swinton's likeness from a metaphysical prompt about the "Heavenly Kingdom" and "tangent functions". The AI was never given her name, yet her face emerged as the mathematical convergence of concepts like transformation, eternity, and fractal edges.

## Architecture

The application is built as a **triptych** — three panels representing different aspects of the creative anomaly:

### I. GENESIS (The Word)
- Paul's original metaphysical prompt scrolling like sacred text
- Interactive keywords that reveal their JSON source
- Asset manifest from the generation process

### II. INCARNATION (The Avatar)
- Video timeline from 71 generated clips
- Synchronized with 9-stem audio assemblage
- Visual glitch effects during high-intensity moments

### III. EXEGESIS (The Debate)
- Chat with the "Latent Space Curator" (Gemini AI)
- Philosophical dialogue about algorithmic creation
- The AI explains why it chose this face

## Audio Assemblage

The soundtrack progressively builds as you explore:

| Stage | Trigger | Active Stems |
|-------|---------|--------------|
| Entry | Click "ENTER" | Drums, Percussion |
| Genesis | Scroll to section | + Bass, Guitar |
| Incarnation | Video playback | + Keyboard, Synth, Other |
| Exegesis | First message | + Backing Vocals |
| Culmination | After 3 min | + Lead Vocals (full) |

## Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** (brutalist dark theme)
- **Framer Motion** (ritual animations)
- **Web Audio API** (stem management)
- **Google Generative AI** (Gemini chat)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

For Gemini chat integration, create a `.env.local` file:

```
GEMINI_API_KEY=your_api_key_here
```

Without the API key, the chat uses placeholder responses.

## Project Files

The `/public/eon` directory should contain:
- `eon_*.mp4` — 71 video clips
- `eon_scene_*.png` — 71 scene previews
- `asset_*.png` — 11 visual assets
- `STEAMS-music/*.wav` — 9 audio stems
- `stage*.json` — Generation metadata

## Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Bone White | `#F2F0E4` | Primary text |
| Void Black | `#050505` | Background |
| Bunker Concrete | `#8C929D` | Secondary |
| Stratosphere Blue | `#1C3F94` | Interactive |
| Solar Flare Amber | `#D96C2C` | Glitch effects |
| Prismatic Cyan | `#E0FFFF` | Light effects |

## Credits

- **Concept & AI Prompt**: Paul Lazniak
- **Visual Generation**: scene_gen system (github.com/lazniak/scene_gen)
- **Audio**: Original composition with AI-assisted stems

## License

This is an art project exploring AI ethics and image generation. The likeness depicted is discussed in the context of algorithmic emergence, not commercial use.

---

*"She exists not as a person, but as the mathematical convergence of concepts like 'transformation' and 'timelessness'."*
— The Latent Space Curator
