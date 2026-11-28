<p align="right"><strong>中文</strong> · <a href="./README.en.md">English</a></p>

# Motion Kit

[![License: MIT](https://img.shields.io/badge/License-MIT-b8ff3d.svg)](./LICENSE)
[![AI Effect Cards](https://img.shields.io/badge/AI%20Effect%20Cards-66-60a5fa.svg)](https://wangjian-damon.github.io/motion-kit/demo/library.html)
[![Zero Runtime](https://img.shields.io/badge/Runtime%20Deps-0-22c55e.svg)](#方式-2作为零依赖前端原语引入vue-3--taro--原生-web)
[![Tests](https://img.shields.io/badge/Tests-151%20passing-22c55e.svg)](#开发与校验)

<p align="center">
  <a href="https://wangjian-damon.github.io/motion-kit/demo/">
    <img src="./demo/og-cover.png" alt="MotionKit — 跨平台 AI 动效资产库" width="100%" />
  </a>
</p>

**面向 AI 时代的跨平台动效资产库 + 零依赖活体样本库。**
66 张去库化交互动效规范（涵盖高频产品微交互、AI 原生对话交互、9 款原生 WebGL 3D Shader、真 Z 轴 3D、液态玻璃、物理手势与数据看板，附物理常量、状态机、降级契约、实测踩坑与验收标准），同时配套浏览器端 0 依赖真实演示。

- **先玩再拿（推荐）**：[**AI 动效资产库（66 张原地可交互）**](https://wangjian-damon.github.io/motion-kit/demo/library.html) · [3D 与 WebGL 展厅 (22 场景)](https://wangjian-damon.github.io/motion-kit/demo/3d.html) · [移动端展示面](https://wangjian-damon.github.io/motion-kit/demo/mobile.html) · [Web 端展示面](https://wangjian-damon.github.io/motion-kit/demo/web.html)
- **AI 直读索引**：[`llms.txt`](https://wangjian-damon.github.io/motion-kit/llms.txt)（直接丢进 Cursor `@Docs` / Claude / Windsurf） · [`dist/registry.json`](https://wangjian-damon.github.io/motion-kit/dist/registry.json)

---

## 为什么不是又一个组件库

| 传统动效组件库 | MotionKit |
|---|---|
| 绑定 React / Framer Motion / GSAP 运行时 | **去库化 AI 资产**：任意技术栈（React / Vue / Tailwind / Taro / Flutter / SwiftUI）零幻觉复现 |
| 只给代码，不写参数依据与边界坑 | 每张卡写明**为什么是这个数**、**降级契约**、**`pointercancel` 等实测坑**与**验收标准** |
| 看文档再跳去 Demo 找效果 | **所见即所得**：66 张卡顶部自带真实可交互微缩演示台 + `0.25×` 慢放 + 一键导出 Skill / Cursor `.mdc` |

---

## 快速开始

### 方式 1：作为 AI 动效资产使用（推荐，任意技术栈，一行安装）

执行一次安装，本机所有项目里的 AI Agent（Antigravity / Claude Code / Cursor / Codex）在遇到动效、手势、表格数据生长或液态玻璃需求时，会自动按 MotionKit 标准复现，**无需手动复制提示词**：

```bash
# 全局安装（无需克隆仓库，自动探测本机 Agent）
npx github:wangjian-damon/motion-kit install

# 团队项目级安装（写入当前仓库 .agents/skills/，随 Git 共享）
npx github:wangjian-damon/motion-kit install --project

# 兼容开放 Skills 生态
npx skills add wangjian-damon/motion-kit --skill motion-kit-apply

# 终端速查 & 直接导出某张卡的去库化 Prompt
npx github:wangjian-damon/motion-kit list
npx github:wangjian-damon/motion-kit show bottom-sheet
```

### 方式 2：作为零依赖前端原语引入（Vue 3 / Taro / 原生 Web）

```js
import MotionKit from './src/vue/index.js';
import './styles/motion.css';
import './styles/mobile.css';   // 移动端触控词汇（按需）
import './styles/glass.css';    // 液态玻璃材质层（按需）
import './styles/3d.css';       // 真 Z 轴 3D 层（按需）

app.use(MotionKit);
```

完整 37 个 Vue 指令、Taro 小程序适配、Token 体系与全部 CSS 类速查，请查看 **[docs/API.md](./docs/API.md)**。

---

## 66 张跨平台资产地图（按六大性质）

| 性质 | 回答的问题 | 已收录资产卡（点击 [AI 资产库](https://wangjian-damon.github.io/motion-kit/demo/library.html) 在线体验与复制） |
|---|---|---|
| **反馈** (11) | 我的输入被接收了吗 | `tap` · `long-press` · `context-menu` · `ripple` · `glass-tap` · `state-button` · `cell-flash` · `confetti` · `shader-ripple` · `tooltip-group` · `voice-wave` |
| **连续** (9) | 这还是刚才那个东西吗 | `bottom-sheet` · `pop` · `seg` · `shared-element` · `toast-stack` · `fluid-height` · `dynamic-pill` · `shader-terrain` · `shader-metaballs` |
| **方向** (10) | 我从哪儿来、往哪儿去 | `edge-back` · `swipe` · `sticky-title` · `scroll-fade` · `fold` · `fan` · `ring` · `tunnel` · `coverflow` · `shader-globe` |
| **权重** (9) | 这东西有多重 | `pull-refresh` · `detent` · `dock` · `snap-sheet` · `rubber-band` · `magnetic` · `mgrid` · `card-deck` · `shader-particles` |
| **材质** (14) | 这表面是什么做的 | `glass-base` · `refraction` · `tilt` · `spotlight` · `blob` · `border-run` · `cube` · `depth` · `sphere` · `book-3d` · `holo-card` · `shader-aurora` · `shader-orb` · `shader-torus` |
| **节奏** (13) | 多元素按什么顺序出场 | `enter` · `count-up` · `split` · `bar-grow` · `sparkline-draw` · `ai-stream` · `bounce-text` · `glitch` · `scramble` · `orbit` · `bar-3d` · `flip-clock` · `shader-dna` |

完整按层/按性质自动同步索引见 [`effects/INDEX.md`](./effects/INDEX.md)，也可以在 [AI 动效资产库](https://wangjian-damon.github.io/motion-kit/demo/library.html) 里按场景套件一键打包复制或导出 Cursor `.mdc`。

---

## 目录与深度文档

| 路径 | 职责 |
|---|---|
| [`effects/`](./effects/INDEX.md) | **唯一真源**：66 张八栏 Markdown 效果卡片（含去库化第 8 栏 AI 提示词）与自动同步索引 `INDEX.md` |
| [`sources.md`](./sources.md) | **准入纪律**：三道自问、六道硬性关卡、业界来源索引、缺口队列与不采纳清单 |
| [`docs/DESIGN.md`](./docs/DESIGN.md) | **设计实录**：两表面三层架构、23 条关键设计推导、Safari/Chrome 实测数据与已知边界 |
| [`docs/API.md`](./docs/API.md) | **使用手册**：Vue 3 / Taro 用法、Token 体系、完整 CSS 类速查与 Demo 打包命令 |
| [`src/`](./src/) & [`styles/`](./styles/) | 零依赖核心纯函数、控制器与六层 CSS 原语（含原生 WebGL Shader 层） |
| [`bin/cli.mjs`](./bin/cli.mjs) & [`scripts/build-registry.mjs`](./scripts/build-registry.mjs) | 开源分发 CLI 与 Markdown → `registry.json` / `llms.txt` / `effects/INDEX.md` / 自包含 Skill 编译器 |
| [`AGENTS.md`](./AGENTS.md) | Agent 协作红线与项目级 Skill 索引 |

---

## 开发与校验

```bash
# 编译 66 张卡片 → dist/registry.json + demo/registry.data.js + effects/INDEX.md + llms.txt + 自包含 Skill，并跑 151 项单测与零泄露门禁
npm run check

# 重新打包浏览器演示页全局包
npx esbuild demo/entry.js --bundle --format=iife --outfile=demo/motion-kit.global.js --minify
```

---

## License

本项目基于 **[MIT License](./LICENSE)** 开源 © 2025–2026 Wangjian-damon。你可以自由用于个人或商业项目，或将其作为 AI Agent Skill 集成到自己的开发工作流中。

> 致谢：玻璃层边缘折射的圆角矩形 SDF 与位移图原型来自 [shuding/liquid-glass](https://github.com/shuding/liquid-glass)（MIT © 2025 Shu Ding），本库在此基础上改写了 SDF 内法线方向场、动态尺寸读取与按几何共享 filter 池。
