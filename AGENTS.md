# MotionKit · Agent 协作规范

MotionKit 是两件事的合体：
1. **跨平台 AI 动效资产库（核心资产）**：`effects/*.md` 为唯一真源，经 `node scripts/build-registry.mjs` 编译为机器可读的 `dist/registry.json`、`demo/registry.data.js` 与 Skill 索引。
2. **零依赖活体样本库（展示与验证）**：`src/` + `styles/` + `demo/` + `test/run.mjs`。

## 可用项目级 Skills

- `.agents/skills/motion-kit-curator/SKILL.md`：外部动效采集、过六道关卡、逆向抽八栏卡片与入库维护。
- `.agents/skills/motion-kit-apply/SKILL.md`：按六大性质检索资产并在任意技术栈中零幻觉复现。

## 核心红线

- **先看标准再动手**：新增效果前必读 `sources.md`（三道自问 + 六道关卡）与 `effects/_TEMPLATE.md`。
- **Markdown 为唯一真源**：不要手改 `dist/registry.json` 或 `demo/registry.data.js`，永远修改 `effects/*.md` 后重新编译。
- **第 8 栏去库化**：卡片第 8 栏 AI 提示词严禁出现 `.mk-*`、`v-mk-*`、`--mk-*` 等本库私有标识符。
- **定时自治任务走草稿区**：无人值守巡检产出的新候选卡片先放 `effects/_pending/<id>.md`，人工 Review 后再转正。

## 提交前必跑

```bash
node scripts/build-registry.mjs && node test/run.mjs
```
