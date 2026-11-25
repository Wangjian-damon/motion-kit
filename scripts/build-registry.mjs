#!/usr/bin/env node
// 将 effects/*.md（人类唯一真源）编译为机器可读资产：
//   1. dist/registry.json        完整结构化索引（供脚本 / Agent / 外部工具消费）
//   2. demo/registry.data.js     供 demo/*.html 直接加载（兼容 file:// 与 GitHub Pages）
//   3. .agents/skills/motion-kit-apply/references/registry-index.md（渐进式披露索引）
//
// 纯 Node 零依赖，同时导出纯函数 parseCard / validateCard / buildRegistry 供 test/run.mjs 单测。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export const VALID_LAYERS = new Set(['motion', 'mobile', 'fun', '3d', 'glass']);
export const VALID_NATURES = new Set(['反馈', '连续', '方向', '权重', '材质', '节奏']);
export const VALID_PLATFORMS = new Set(['web', 'touch', 'both']);
export const VALID_STATUSES = new Set(['shipped', 'planned', 'rejected']);

const REQUIRED_SECTIONS = [
  ['1', 'summary'],
  ['2', 'problem'],
  ['3', 'origin'],
  ['4', 'params'],
  ['5', 'implementation'],
  ['6', 'degradation'],
  ['7', 'pitfalls'],
  ['8', 'ai_raw'],
];

/**
 * 解析简单 YAML frontmatter（单行 key: value）
 */
export function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: md };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    meta[key] = val;
  }
  return { meta, body: md.slice(m[0].length) };
}

/**
 * 按 ## 1..8 切分八栏正文
 */
export function parseSections(body) {
  const sections = {};
  const matches = [...body.matchAll(/^##\s+(\d+)\s+([^\r\n]+)$/gm)];
  for (let i = 0; i < matches.length; i++) {
    const num = matches[i][1];
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
    sections[num] = body.slice(start, end).trim();
  }
  return sections;
}

/**
 * 从第 8 栏提取可直接复制给 AI 的提示词块与「别让它做的」反例
 */
export function extractAiSection(raw = '') {
  const fence = raw.match(/```(?:text|txt|markdown|md)?\r?\n([\s\S]*?)\r?\n```/);
  const prompt = fence ? fence[1].trim() : raw.trim();
  let dontDo = '';
  if (fence) {
    const after = raw.slice(fence.index + fence[0].length).trim();
    dontDo = after.replace(/^\*\*别让它做的\*\*[：:]?\s*/m, '').trim();
  }
  return { prompt, dontDo };
}

/**
 * 从第 4 栏 Markdown 表格中提取关键参数行，用于合成精炼的 Skill Rule
 */
function extractParamBullets(paramsMd = '') {
  const rows = [];
  for (const line of paramsMd.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith('|') || t.startsWith('|---') || t.startsWith('| ---')) continue;
    const cells = t.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length >= 3 && cells[0] !== '参数') {
      rows.push(`- ${cells[0]}：${cells[1]}（${cells[2]}）`);
    }
  }
  return rows;
}

/**
 * 从第 7 栏提取粗体标题作为必避坑清单
 */
function extractPitfallHeadings(pitfallsMd = '') {
  const items = [];
  for (const m of pitfallsMd.matchAll(/^\*\*([①②③④⑤⑥⑦⑧⑨⑩\d]+[^*\r\n]+)\*\*/gm)) {
    items.push(`- ${m[1].trim()}`);
  }
  return items;
}

/**
 * 合成面向 AI 项目的精炼 Skill Rule（可直接粘贴进 .cursorrules / AGENTS.md / Skill）
 */
export function buildSkillRule(card) {
  const lines = [];
  lines.push(`# ${card.name} (${card.id}) · 动效约束规则`);
  lines.push(`性质：${card.nature} ｜ 平台：${card.platform} ｜ 层级：${card.layer}`);
  lines.push('');
  lines.push(`【核心意图】${card.summary.replace(/\r?\n+/g, ' ')}`);

  const paramBullets = extractParamBullets(card.params);
  if (paramBullets.length > 0) {
    lines.push('');
    lines.push('【关键参数与依据】');
    lines.push(...paramBullets);
  }

  const degFirst = card.degradation
    .split(/\r?\n\r?\n/)
    .slice(0, 2)
    .join('\n')
    .trim();
  if (degFirst) {
    lines.push('');
    lines.push('【降级契约】');
    lines.push(degFirst);
  }

  const pitfalls = extractPitfallHeadings(card.pitfalls);
  if (pitfalls.length > 0) {
    lines.push('');
    lines.push('【必避坑】');
    lines.push(...pitfalls);
  }

  if (card.ai_assets.dont_do) {
    lines.push('');
    lines.push('【禁止做法】');
    lines.push(card.ai_assets.dont_do);
  }

  return lines.join('\n').trim();
}

/**
 * 解析单张效果卡片 Markdown
 */
export function parseCard(md, relFile = '') {
  const { meta, body } = parseFrontmatter(md);
  const sections = parseSections(body);
  const { prompt, dontDo } = extractAiSection(sections['8'] || '');

  const card = {
    id: meta.id || '',
    name: meta.name || '',
    layer: meta.layer || '',
    nature: meta.nature || '',
    platform: meta.platform || '',
    status: meta.status || '',
    entry: meta.entry || '',
    source: meta.source || '',
    file: relFile,
    summary: sections['1'] || '',
    problem: sections['2'] || '',
    origin: sections['3'] || '',
    params: sections['4'] || '',
    implementation: sections['5'] || '',
    degradation: sections['6'] || '',
    pitfalls: sections['7'] || '',
    ai_assets: {
      prompt,
      dont_do: dontDo,
      skill_rule: '',
    },
  };
  card.ai_assets.skill_rule = buildSkillRule(card);
  return card;
}

/**
 * 校验单张效果卡片是否符合 _TEMPLATE.md 规矩
 * 返回错误信息数组，空数组即通过。
 */
export function validateCard(card, filename = '') {
  const errors = [];
  const expectedId = filename ? path.basename(filename, '.md') : '';

  for (const field of ['id', 'name', 'layer', 'nature', 'platform', 'status', 'entry', 'source']) {
    if (!card[field]) errors.push(`缺少 frontmatter 字段: ${field}`);
  }
  if (card.id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(card.id)) {
    errors.push(`id 必须为小写短横线命名: ${card.id}`);
  }
  if (expectedId && card.id && card.id !== expectedId) {
    errors.push(`id (${card.id}) 与文件名 (${expectedId}) 不一致`);
  }
  if (card.layer && !VALID_LAYERS.has(card.layer)) {
    errors.push(`非法 layer: ${card.layer}`);
  }
  if (card.nature && !VALID_NATURES.has(card.nature)) {
    errors.push(`非法 nature（只能填六种性质之一）: ${card.nature}`);
  }
  if (card.platform && !VALID_PLATFORMS.has(card.platform)) {
    errors.push(`非法 platform: ${card.platform}`);
  }
  if (card.status && !VALID_STATUSES.has(card.status)) {
    errors.push(`非法 status: ${card.status}`);
  }

  for (const [num, key] of REQUIRED_SECTIONS) {
    const val = key === 'ai_raw' ? card.ai_assets?.prompt : card[key];
    if (!val || !val.trim()) {
      errors.push(`第 ${num} 栏为空`);
    }
  }

  // 第 8 栏红线：提示词必须脱离本库，不能泄露私有类名或指令
  const promptText = card.ai_assets?.prompt || '';
  const leakMatch = promptText.match(/(?:\.mk-[a-z0-9_-]+|v-mk-[a-z0-9_-]+|--mk-[a-z0-9_-]+)/);
  if (leakMatch) {
    errors.push(`第 8 栏 AI 提示词泄露了本库私有标识符: ${leakMatch[0]}`);
  }

  return errors;
}

/**
 * 扫描 effects/*.md 生成完整 registry 对象
 */
export function buildRegistry(rootDir = ROOT) {
  const effectsDir = path.join(rootDir, 'effects');
  const files = fs
    .readdirSync(effectsDir)
    .filter((f) => f.endsWith('.md') && f !== 'INDEX.md' && f !== '_TEMPLATE.md')
    .sort();

  const effects = [];
  const allErrors = [];

  for (const f of files) {
    const full = path.join(effectsDir, f);
    const md = fs.readFileSync(full, 'utf8');
    const card = parseCard(md, `effects/${f}`);
    const errs = validateCard(card, f);
    if (errs.length > 0) {
      allErrors.push({ file: `effects/${f}`, errors: errs });
    }
    effects.push(card);
  }

  const byLayer = {};
  const byNature = {};
  for (const e of effects) {
    byLayer[e.layer] = (byLayer[e.layer] || 0) + 1;
    byNature[e.nature] = (byNature[e.nature] || 0) + 1;
  }

  return {
    registry: {
      schemaVersion: 1,
      count: effects.length,
      byLayer,
      byNature,
      effects,
    },
    errors: allErrors,
  };
}

/**
 * 生成给消费侧 Skill 用的精简索引表（渐进式披露，按性质分组）
 */
export function renderSkillIndexMarkdown(registry) {
  const lines = [
    '# MotionKit 动效资产索引（自动生成）',
    '',
    '> 由 `node scripts/build-registry.mjs` 自动同步自 `effects/*.md`。请勿手改此文件。',
    `> 当前收录：**${registry.count}** 张跨平台动效资产卡。`,
    '',
  ];

  const order = ['反馈', '连续', '方向', '权重', '材质', '节奏'];
  for (const nature of order) {
    const items = registry.effects.filter((e) => e.nature === nature);
    if (items.length === 0) continue;
    lines.push(`## ${nature}（${items.length}）`);
    lines.push('');
    lines.push('| id | 名称 | 平台 | 层级 | 一句话 | 卡片路径 |');
    lines.push('|---|---|---|---|---|---|');
    for (const e of items) {
      const oneLine = e.summary.replace(/\r?\n+/g, ' ').replace(/\|/g, '\\|');
      lines.push(`| \`${e.id}\` | ${e.name} | ${e.platform} | ${e.layer} | ${oneLine} | \`${e.file}\` |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const { registry, errors } = buildRegistry(ROOT);
  if (errors.length > 0) {
    console.error('效果卡片校验未通过：');
    for (const item of errors) {
      console.error(`  ✗ ${item.file}`);
      for (const e of item.errors) console.error(`      - ${e}`);
    }
    process.exitCode = 1;
    return;
  }

  // 1. dist/registry.json
  const distDir = path.join(ROOT, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(
    path.join(distDir, 'registry.json'),
    JSON.stringify(registry, null, 2) + '\n',
    'utf8',
  );

  // 2. demo/registry.data.js（供静态页面无 CORS 依赖读取）
  const demoData = `// 自动生成自 effects/*.md，请勿手改。运行 node scripts/build-registry.mjs 更新。\nwindow.__MK_REGISTRY__ = ${JSON.stringify(registry)};\n`;
  fs.writeFileSync(path.join(ROOT, 'demo', 'registry.data.js'), demoData, 'utf8');

  // 3. 同步消费侧 Skill 的渐进式索引
  const skillRefDir = path.join(ROOT, '.agents', 'skills', 'motion-kit-apply', 'references');
  fs.mkdirSync(skillRefDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillRefDir, 'registry-index.md'),
    renderSkillIndexMarkdown(registry),
    'utf8',
  );

  console.log(`✓ 已编译 ${registry.count} 张动效资产卡 → dist/registry.json & demo/registry.data.js`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
