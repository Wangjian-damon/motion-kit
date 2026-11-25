---
name: motion-kit-apply
description: >-
  Apply MotionKit's battle-tested, framework-agnostic interaction and motion
  specifications to any project (React, Vue, Tailwind, Taro, Flutter, SwiftUI,
  or vanilla web). Use when implementing micro-interactions, touch gestures,
  sheets, transitions, scroll effects, or glass/3D materials and you want
  predictable physics, exact timing constants, accessibility degradation, and
  known edge-case protection.
---

# MotionKit 跨平台动效复用指南 (Apply)

当你在任意项目中需要实现高质量 UI 动效或手势交互时，不要凭感觉手写 `duration-300` 或 `linear`，而是从 MotionKit 资产库中提取经过验证的物理参数、状态机与避坑约束，再按**当前项目的技术栈**原生实现。

## 使用步骤（渐进式披露）

1. **按「性质」定位资产**：先阅读 [references/registry-index.md](./references/registry-index.md)，根据交互意图锁定对应 `id`：
   - **反馈**（我的输入被接收了吗）：`tap` / `ripple` / `long-press` / `context-menu` / `glass-tap`
   - **连续**（这还是刚才那个东西吗）：`bottom-sheet` / `pop` / `shared-element` / `seg`
   - **方向**（我从哪来、往哪去）：`edge-back` / `swipe` / `sticky-title`
   - **权重**（这东西有多重）：`pull-refresh` / `detent` / `dock` / `snap-sheet` / `magnetic`
   - **材质**（表面是什么做的）：`refraction` / `glass-base` / `tilt`
   - **节奏**（多元素出场时序）：`enter` / `count-up` / `split`
2. **读取目标卡片**：只打开你选中的 `effects/<id>.md`（或读取 `dist/registry.json` 中对应条目），重点获取：
   - **第 4 栏**：精确常量及其依据（不要随意改动经过验证的阈值，如 `28%`、`0.55px/ms`、`480ms`）
   - **第 6 栏**：降级契约（`prefers-reduced-motion` 下是“减”“关”还是“冻”）
   - **第 7 栏**：已知坑点（如 `pointercancel` 走回弹不走松手判定、`transition-delay` 清理）
   - **第 8 栏**：脱离框架的完整实现提示词与「别让它做的」
3. **适配目标技术栈落地**：
   - 将卡片中的状态机、数学公式与常量翻译为目标项目所用技术栈（React / Vue / Tailwind / Taro / Flutter / SwiftUI / 原生 CSS+JS）。
   - 保持克制：优先原生能力（CSS 变量、Pointer Events、`scroll-snap`、`View Transitions`、弹簧阶跃采样），除非目标项目已引入，否则不额外引入重型动画库。
4. **按验收标准自检**：对照第 8 栏的「验收」与「别让它做的」逐项核对后再交付。
