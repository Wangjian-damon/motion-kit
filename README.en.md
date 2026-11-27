<p align="right"><strong>English</strong> · <a href="./README.md">中文</a></p>

# Motion Kit

[![License: MIT](https://img.shields.io/badge/License-MIT-b8ff3d.svg)](./LICENSE)
[![AI Effect Cards](https://img.shields.io/badge/AI%20Effect%20Cards-30-60a5fa.svg)](https://wangjian-damon.github.io/motion-kit/demo/library.html)
[![Zero Runtime](https://img.shields.io/badge/Runtime%20Deps-0-22c55e.svg)](#use-as-zero-dependency-primitives)
[![Tests](https://img.shields.io/badge/Tests-129%20passing-22c55e.svg)](#development--verification)

<p align="center">
  <a href="https://wangjian-damon.github.io/motion-kit/demo/">
    <img src="./demo/og-cover.png" alt="MotionKit — Framework-agnostic AI motion & interaction specs" width="100%" />
  </a>
</p>

**Framework-agnostic AI motion & interaction asset library + zero-dependency live showcase.**
30 battle-tested UI motion specs — exact physics constants, state machines, three-tier `prefers-reduced-motion` degradation contracts, real browser edge-case pitfalls, and observable acceptance criteria — paired with 0-dependency interactive demos for Web, Mobile, 3D, and Liquid Glass.

- **Try Live First**: [**Interactive Landing Page**](https://wangjian-damon.github.io/motion-kit/demo/) · [**AI Asset Library (30 Live Mini-Stages)**](https://wangjian-damon.github.io/motion-kit/demo/library.html) · [Mobile Showcase](https://wangjian-damon.github.io/motion-kit/demo/mobile.html) · [Web Showcase](https://wangjian-damon.github.io/motion-kit/demo/web.html) · [3D & Fun](https://wangjian-damon.github.io/motion-kit/demo/3d.html)
- **AI-Native Indexes**: [`llms.txt`](https://wangjian-damon.github.io/motion-kit/llms.txt) (drop directly into Cursor `@Docs` / Claude / Windsurf) · [`dist/registry.json`](https://wangjian-damon.github.io/motion-kit/dist/registry.json)

---

## Why Not Just Another Component Library?

| Traditional Motion Libraries | MotionKit |
|---|---|
| Locked to React, Framer Motion, or GSAP runtimes | **Framework-agnostic AI specs**: reproduce cleanly in React, Vue, Tailwind, Taro, Flutter, SwiftUI, or vanilla web |
| Ships code without explaining why constants exist | Every card documents **why each constant**, **degradation contracts**, **`pointercancel` & browser pitfalls**, and **acceptance tests** |
| Read docs in one tab, hunt demos in another | **WYSIWYG**: all 30 cards include live interactive mini-stages, `0.25×` slow-mo, reduced-motion simulator, and 1-click preset skill bundles |

---

## Quick Start

### 1. Use as an AI Agent Skill (Recommended — Any Stack, 1 Command)

Install once and let your AI coding agents (**Antigravity, Claude Code, Cursor, Codex**) automatically apply MotionKit's physics constants and edge-case protections whenever you ask for gestures, sheets, tables, or liquid glass — no manual prompt copying required:

```bash
# Global install (no repo clone needed, auto-detects installed Agents)
npx github:wangjian-damon/motion-kit install

# Team / project-level install (writes .agents/skills/motion-kit-apply for Git sharing)
npx github:wangjian-damon/motion-kit install --project

# Open Skills ecosystem compatible
npx skills add wangjian-damon/motion-kit --skill motion-kit-apply

# Inspect or export any framework-agnostic prompt from CLI
npx github:wangjian-damon/motion-kit list
npx github:wangjian-damon/motion-kit show bottom-sheet
```

### 2. Use as Zero-Dependency Primitives (Vue 3 / Taro / Vanilla Web)

```js
import MotionKit from './src/vue/index.js';
import './styles/motion.css';
import './styles/mobile.css';   // Touch vocabulary (optional)
import './styles/glass.css';    // Liquid Glass material layer (optional)
import './styles/3d.css';       // True Z-axis 3D layer (optional)

app.use(MotionKit);
```

See **[docs/API.md](./docs/API.md)** for all 37 Vue directives, Taro composables, tokens, and CSS classes, and **[docs/DESIGN.md](./docs/DESIGN.md)** for the 23 engineering design notes and known browser boundaries.

---

## 30 Cross-Platform Effect Specs (by Nature)

| Nature | Core Question | Shipped Cards |
|---|---|---|
| **Feedback** (7) | Did the UI receive my input? | `tap` · `long-press` · `context-menu` · `ripple` · `glass-tap` · `state-button` · `cell-flash` |
| **Continuity** (5) | Is this still the same element? | `bottom-sheet` · `pop` · `seg` · `shared-element` · `toast-stack` |
| **Direction** (4) | Where did it come from / go? | `edge-back` · `swipe` · `sticky-title` · `fold` |
| **Weight** (5) | How heavy does it feel? | `pull-refresh` · `detent` · `dock` · `snap-sheet` · `rubber-band` |
| **Material** (4) | What is this surface made of? | `glass-base` · `refraction` · `tilt` · `spotlight` |
| **Rhythm** (5) | How do multiple items enter? | `enter` · `count-up` · `split` · `bar-grow` · `sparkline-draw` |

---

## Development & Verification

```bash
# Compile all 30 effect cards -> dist/registry.json, demo/registry.data.js, llms.txt & self-contained Skill, then run all 129 unit + leak tests
npm run check
```

---

## License

Licensed under the **[MIT License](./LICENSE)** © 2025–2026 Wangjian-damon.

> Credit: The rounded-rectangle SDF and displacement map prototype for edge refraction originates from [shuding/liquid-glass](https://github.com/shuding/liquid-glass) (MIT © 2025 Shu Ding), extended here with an SDF inward-normal vector field, dynamic element sizing, and geometry-pooled shared SVG filters.
