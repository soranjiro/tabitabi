# AI Generated Theme

Modern and feature-rich travel itinerary theme with a clean, accessible design.

## Features

- **Timeline View**: Beautiful vertical timeline with day badges
- **Secret Mode**: Hide itinerary details until the scheduled time
- **Walica Integration**: Built-in expense splitting with Walica
- **Markdown Support**: Rich text formatting in notes and memos
- **Share Dialog**: Easy link sharing with edit/view-only options
- **Responsive Design**: Optimized for mobile and desktop
- **Glass Morphism**: Subtle blur effects for modern aesthetics

## Directory Structure

```
ai-generated/
├── ItineraryView.svelte    # Main view component
├── StepList.svelte         # Timeline step list
├── index.ts                # Theme export
├── config.ts               # Theme configuration
├── components/             # UI components
│   ├── AddStepForm.svelte
│   ├── BottomNav.svelte
│   ├── Dialog.svelte
│   ├── MemoDialog.svelte
│   ├── PasswordDialog.svelte
│   ├── ShareDialog.svelte
│   ├── WalicaOverlay.svelte
│   └── index.ts
├── styles/                 # CSS modules
│   ├── index.css           # Style entry
│   ├── variables.css       # CSS variables
│   ├── base.css
│   ├── button.css
│   ├── dialog.css
│   ├── form.css
│   ├── header.css
│   ├── memo.css
│   ├── nav.css
│   └── timeline.css
└── utils/                  # Utility functions
    ├── date.ts
    ├── markdown.ts
    └── index.ts
```

## Design Principles

1. **Lightweight**: No external dependencies, pure CSS
2. **Accessible**: Semantic HTML with ARIA attributes
3. **Readable**: Well-organized code structure
4. **Consistent**: Unified color scheme and spacing
