UI Design System: Fairy Tale / Anime Theme
This document outlines the visual language and component styles for the Mate.on web application. The goal is to create an immersive, warm, and playful environment reminiscent of a "Fairy Tale" or "Slice of Life" anime.

1. Design Concept
Keywords: Soft, Warm, Bouncy, Rounded, Magical.
Vibe: A cozy village where digital avatars live.
Visual Style:
Soft Edges: Avoid sharp corners. Use border-radius: 12px or higher.
Pastel & Vivid: Base colors are pastel (backgrounds), interaction elements are vivid (buttons).
Depth: use soft, large shadows (box-shadow) to create a "floating" or "sticker" feel, rather than flat design.
Outlines: Subtle outlines (1px-2px) in a slightly darker shade of the element color can give a "comic/anime" look.
2. Color Palette
Primary Colors (Brand)
Magical Pink: #FF9EAA (Main action buttons, highlights)
Sky Blue: #89CFF0 (Secondary actions, links)
Sunny Yellow: #FDFD96 (Notifications, "New" badges)
Backgrounds
Paper White: #FAFAFA (Content cards)
Cream: #FFFDD0 (Main background option 1 - Warm)
Lavender Mist: #E6E6FA (Main background option 2 - Magical)
Text
Ink Black: #2A2A2A (Headings - softer than pure black)
Pencil Grey: #555555 (Body text)
Soft Grey: #A0A0A0 (Placeholders)
Semantic
Success: #77DD77 (Pastel Green)
Error: #FF6961 (Pastel Red)
Warning: #FFB347 (Pastel Orange)
3. Typography
Use rounded, friendly fonts.

Korean: Jua (BM Jua) or NanumSquareRound (Naver).
English: Nunito or Quicksand or Varela Round.
4. Component Styles
Buttons
Buttons should feel "pressable" and "bouncy".

Shape: Full Pill (border-radius: 9999px) or highly rounded (border-radius: 16px).
Effect:
Normal: Solid pastel color + 3px solid border (darker shade) + 2px shadow.
Hover: Brighten color slightly, translate Y -2px (lift up).
Active: Darken color, translate Y +1px (press down), reduce shadow.
Example (CSS):
css
.btn-magic {
  background: #FF9EAA;
  border: 3px solid #FF7E8E;
  border-radius: 20px;
  color: white;
  box-shadow: 0 4px 0 #FF7E8E; /* Fake 3D bottom */
  transition: all 0.1s;
}
.btn-magic:active {
  transform: translateY(4px);
  box-shadow: none;
}
Cards & Containers
Style: "Floating Paper" or "Glass Panel".
Glassmorphism:
Background: rgba(255, 255, 255, 0.7)
Backdrop Filter: blur(10px)
Border: 1px solid rgba(255, 255, 255, 0.5)
Shadow: 0 8px 32px rgba(31, 38, 135, 0.1)
Paper:
Background: #FFFFFF
Border: 2px solid #F0F0F0
Radius: 24px
Inputs
Style: Large, friendly text fields.
Normal: White bg, 2px border in #E0E0E0, border-radius: 12px.
Focus: Border color changes to Magical Pink (#FF9EAA), slight ring/glow.
Modals / Dialogs
Animation: "Pop" in. Use a scaling spring animation (0.8 -> 1.05 -> 1.0) rather than a simple fade.
Overlay: Warm dark overlay (rgba(50, 40, 40, 0.4)).
5. Layout & Spacing
Whitespace: Generous. Give elements room to breathe.
Grid: Use a cheerful, asymmetric grid if possible (like a scrapbook), but maintain usability.
Navigation: Floating navbar at bottom or top, shaped like a cloud or rounded bar.
6. Iconography
Use "Filled" icons with soft corners (e.g., FontAwesome Rounded, Material Icons Rounded).
Color: Use the Primary Colors instead of just black/grey.
7. Animation Principles
Hover: Everything interactive should wiggle, lift, or glow on hover.
Transition: 200ms - 300ms ease-out or cubic-bezier(0.34, 1.56, 0.64, 1) (bouncy).
Developer Implementation Checklist
 Install a CSS-in-JS library (Styled-components/Emotion) OR Tailwind CSS.
 Define CSS Variables for the Color Palette defined above.
 Import recommended fonts (Nunito, Jua).
 Create base components (Button, Card, Input) encapsulating these styles.

Comment
Ctrl+Alt+M
