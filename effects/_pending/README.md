# `_pending/` · Agent 候选动效草稿区（Human-in-the-loop）

本目录用于承接 **定时 Agent 自主巡检** 或 **外部动效采集任务** 产出的候选资产卡片。

## 工作流

1. **Agent 产出**：Agent 依据 `.agents/skills/motion-kit-curator/SKILL.md` 与 `sources.md` 扫描外部来源或研究缺口队列，通过三道自问 + 六道关卡初筛后，将候选卡片写入 `effects/_pending/<id>.md`。
2. **不污染正式库**：`scripts/build-registry.mjs` 仅编译 `effects/*.md`，不会自动把 `_pending/` 下的草稿发布到 `dist/registry.json` 与线上 Demo。
3. **人工 Review 转正**：
   - 检查第 2 栏（交互问题）、第 4 栏（每个参数是否答得出为什么）、第 7 栏（是否写清真实坑点）与第 8 栏（去库化 AI 提示词）。
   - 审核通过：将文件移动到 `effects/<id>.md`，更新 `effects/INDEX.md`，运行：
     ```bash
     node scripts/build-registry.mjs && node test/run.mjs
     ```
   - 审核不通过：直接删除草稿，并将拒绝理由记入 `sources.md` 第 5 节「不采纳清单」，避免下一次定时巡检重复采集。
