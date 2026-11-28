# Contributing to MotionKit

Thank you for your interest in contributing to **MotionKit** — a framework-agnostic AI motion & interaction asset library!

MotionKit grows through **8-section Markdown effect cards** (`effects/*.md`), which serve as the single source of truth compiled into `dist/registry.json`, `llms.txt`, the live Asset Library, and the self-contained AI Agent Skill.

---

## Before You Propose a New Effect

Please review [`sources.md`](./sources.md) first. Every effect entering MotionKit must pass **3 Self-Questions** and **6 Hard Gates**:

1. **JS only writes CSS variables (or uniform/state)** — layout and `transform` belong in CSS / GLSL.
2. **Clear `prefers-reduced-motion` degradation contract** — every card must explicitly define how it degrades (`motion`, `3d/fun`, `glass`, or `webgl` contract).
3. **Pure testable math** — extract physics, geometry, or state-machine math into a pure function with unit tests in `test/run.mjs`.
4. **Zero runtime dependencies** — no Three.js, GSAP, Framer Motion, or third-party runtimes.
5. **Vocabulary, not monolithic components** — describe reusable motion behavior without locking callers into a rigid DOM tree.
6. **Documented feel origin** — state where the physical intuition comes from (Apple HIG, Material 3, Vaul, Sonner, Rauno, analytical SDF, etc.).

---

## How to Submit a New Effect Card (PR Checklist)

1. **Copy the template**: duplicate [`effects/_TEMPLATE.md`](./effects/_TEMPLATE.md) to `effects/<your-id>.md` (lowercase kebab-case).
2. **Fill all 8 sections**:
   - Frontmatter: `id`, `name`, `layer` (`motion | mobile | fun | 3d | glass | webgl`), `nature` (`反馈 | 连续 | 方向 | 权重 | 材质 | 节奏`), `platform` (`web | touch | both`), `status: shipped`, `entry`, `source`.
   - **Zero-Leak Redline**: Section 8 (`## 8 AI 提示词`) and `source:` MUST NOT contain any private MotionKit identifiers (`.mk-*`, `v-mk-*`, `--mk-*`). It must work standalone in React, Vue, Tailwind, Taro, Flutter, SwiftUI, or vanilla web.
3. **Add live implementation & preview**:
   - Add pure math + controller in `src/core/` and CSS primitive in `styles/`.
   - Export from `src/vue/index.js` and add a live interactive mini-stage in `demo/card-previews.js`.
   - Add unit tests for the pure math function in `test/run.mjs`.
4. **Compile & verify**:

```bash
npx esbuild demo/entry.js --bundle --format=iife --outfile=demo/motion-kit.global.js --minify
npm run check
```

`npm run check` automatically compiles `dist/registry.json`, `demo/registry.data.js`, `effects/INDEX.md`, `llms.txt`, and the clean Agent Skill package, then runs all unit tests and the zero-leak gate.

5. **Open a Pull Request** describing what interaction problem your effect solves and include a short screen recording or screenshot!

---

## 中文贡献指南（速览）

欢迎向 MotionKit 提交新的跨平台动效资产卡或修复浏览器边界坑！

1. 先阅读 [`sources.md`](./sources.md)（三道自问 + 六道硬性关卡）。
2. 复制 [`effects/_TEMPLATE.md`](./effects/_TEMPLATE.md) 创建 `effects/<id>.md`，写满八栏；**红线**：第 8 栏 AI 提示词与 `source:` 中严禁出现 `.mk-*`、`v-mk-*`、`--mk-*` 等私有标识符。
3. 补齐零依赖实现（`src/` + `styles/`）、`demo/card-previews.js` 原地预览与 `test/run.mjs` 纯函数单测。
4. 提交前务必跑通：
   ```bash
   npx esbuild demo/entry.js --bundle --format=iife --outfile=demo/motion-kit.global.js --minify && npm run check
   ```
5. 不要手改 `dist/registry.json`、`demo/registry.data.js`、`effects/INDEX.md` 或 `llms.txt` —— 它们均由编译脚本自动生成。
