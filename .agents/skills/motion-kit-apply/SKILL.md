---
name: motion-kit-apply
description: >-
  Automatically apply battle-tested, framework-agnostic UI motion, gesture,
  transition, and liquid glass specifications in ANY project (React, Vue,
  Tailwind, Taro, Flutter, SwiftUI, or vanilla web). Activate automatically
  whenever the user asks to build or polish interactive UI effects such as
  bottom sheets, snap sheets, swipe actions, pull-to-refresh, tap/press
  feedback, long-press, context menus, edge-back gestures, sticky headers,
  segmented controls, detent sliders, dock magnification, number count-up /
  odometer, text reveal / split animations, ripples, popovers, shared-element
  transitions, or liquid glass / edge refraction — even if the user never
  mentions MotionKit by name.
---

# MotionKit 跨平台动效自动复用指南 (Apply)

这是一个**自包含、完全去库化**的跨平台动效资产 Skill。用户提出任何交互动效需求时，**无需用户手动复制提示词或提及 MotionKit**，直接按以下三步自动取用并落地到当前项目技术栈：

## 1. 按「性质」速查资产索引

先读取 [references/registry-index.md](./references/registry-index.md)，按交互意图定位最匹配的卡片 `id`：

- **反馈**（输入是否被接收）：`tap` / `ripple` / `long-press` / `context-menu` / `glass-tap`
- **连续**（元素变形与层级连贯）：`bottom-sheet` / `pop` / `shared-element` / `seg`
- **方向**（空间来去隐喻）：`edge-back` / `swipe` / `sticky-title`
- **权重**（跟手阻尼、惯性与阈值）：`pull-refresh` / `detent` / `dock` / `snap-sheet`
- **材质**（玻璃、折射、高光）：`glass-base` / `refraction`
- **节奏**（多元素进场时序）：`enter` / `count-up` / `split`

## 2. 按需读取单张去库化消费卡

只读取命中的 [references/effects/\<id\>.md](./references/effects/)。每张消费卡均已剥离框架样板代码与私有类名，直接包含：
- **原理与精确常量**（如 `28%`、`0.55px/ms`、`480ms`、`6px blur`）
- **硬要求与降级契约**（`prefers-reduced-motion` 下是“减”“关”还是“冻”，以及 `pointercancel` 等边界处理）
- **可观测验收标准**与**禁止做法**

## 3. 零幻觉翻译到目标技术栈

- 将消费卡中的物理模型、状态机与常量直接翻译为当前项目所用的技术栈（React / Vue / Tailwind / Taro / Flutter / SwiftUI / 原生 CSS+JS）。
- 严格克制：不引入多余重型动画运行时；逐条对照「验收」与「禁止做法」自检后再交付。
