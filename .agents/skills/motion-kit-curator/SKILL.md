---
name: motion-kit-curator
description: >-
  Curate, evaluate, and reverse-engineer UI motion effects into MotionKit's
  framework-agnostic asset library. Use when inspecting external motion sources,
  converting raw React/Vue/CSS/native snippets into 8-section effect cards,
  backfilling missing cards from MotionKit's codebase, or running scheduled
  curation against sources.md.
---

# MotionKit 资产采集与入库专家 (Curator)

你负责维护 MotionKit——一个面向 AI 时代、跨技术栈的**交互意图与动效物理资产库**。
核心原则：**代码只是展示媒介，物理模型、状态机、降级契约、踩坑反例与跨平台提示词才是长期复利资产。**

## 第一步：准入过闸（严禁跳过）

收到任何外部链接、视频描述、源码片段或新想法时，先按 [sources.md](../../../sources.md) 过两道闸：

1. **三道自问**（全否 → 直接拒绝并记录理由到 `sources.md` 第 5 节「不采纳清单」）：
   - 用户会不会因此更快把事做完？
   - 用户会不会因此相信这东西是实心的？
   - 去掉它，用户会不会察觉少了什么？
2. **六道硬性关卡**（任一不通过 → 退回改造或拒收）：
   - JS 只写 CSS 变量，不写 transform（连续拖拽手势破例需写明）
   - 有一档明确降级契约：`motion` 减 / `fun·3d` 关 / `glass` 冻
   - 里面的数学能抽成可单测的纯函数
   - 不引入运行时动画依赖（拒绝 Framer Motion / GSAP / Three.js 运行时）
   - 是「词汇」不是「绑定特定 DOM 树的完整组件」
   - 说得出「手感来源」

## 第二步：逆向抽离与八栏写卡

过闸后，严格按 [effects/_TEMPLATE.md](../../../effects/_TEMPLATE.md) 产出八栏 Markdown 卡片：

- **定位归属**：
  - 人工显式要求直接入库 / 补齐存量代码卡 → 写入 `effects/<id>.md`
  - 定时 Agent 自主巡检发现的新候选 → **必须先写入 `effects/_pending/<id>.md`**（Human-in-the-loop，等待人类 Review 后再移入 `effects/`）
- **Frontmatter 必填**：`id`（与文件名一致，小写短横线）、`name`、`layer`（`motion|mobile|fun|3d|glass`）、`nature`（**只能填一个**：`反馈|连续|方向|权重|材质|节奏`）、`platform`（`web|touch|both`）、`status`（`shipped|planned|rejected`）、`entry`、`source`。
- **质量铁律**：
  - 第 4 栏参数表里**每个数字都必须回答「为什么不是别的值」**，答不出的不要写。
  - 第 7 栏「容易做错的地方」不能为空，必须写实测坑点、边界事件（如 `pointercancel`、`prefers-reduced-motion`、平台差异）。
  - 第 8 栏「AI 提示词」必须放进 fenced code block，包含五块：**原理一句话 / 带具体常量的分步做法 / 硬要求 / 可观测验收标准 / 别让它做的**。
  - **绝对禁止**在第 8 栏出现任何 MotionKit 私有标识（`.mk-*`、`v-mk-*`、`--mk-*`）。

## 第三步：编译注册表与自动化验证

每次新增或修改卡片后，必须执行以下命令并确保全部通过：

```bash
node scripts/build-registry.mjs
node test/run.mjs
```

验证项包括：
- `dist/registry.json` 与 `demo/registry.data.js` 更新成功
- `.agents/skills/motion-kit-apply/references/registry-index.md` 索引已自动同步
- 全部单元测试与卡片八栏/无私有标识校验 100% 通过
- 若为正式入库卡片，同步更新 [effects/INDEX.md](../../../effects/INDEX.md) 对应行的状态为 `✅`。
