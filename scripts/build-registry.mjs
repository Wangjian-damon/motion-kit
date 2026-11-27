#!/usr/bin/env node
// 将 effects/*.md（人类唯一真源）编译为机器可读资产：
//   1. dist/registry.json                                          完整结构化索引（供脚本 / Agent / 外部工具消费）
//   2. demo/registry.data.js                                       供 demo/*.html 直接加载（兼容 file:// 与 GitHub Pages）
//   3. .agents/skills/motion-kit-apply/references/registry-index.md 渐进式披露索引
//   4. .agents/skills/motion-kit-apply/references/effects/<id>.md   纯净去库化消费卡（0 私有标识符、省 token）
//
// 纯 Node 零依赖，同时导出纯函数 parseCard / validateCard / buildRegistry 供 test/run.mjs 单测。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export const VALID_LAYERS = new Set(['motion', 'mobile', 'fun', '3d', 'glass', 'webgl']);
export const VALID_NATURES = new Set(['反馈', '连续', '方向', '权重', '材质', '节奏']);
export const VALID_PLATFORMS = new Set(['web', 'touch', 'both']);
export const VALID_STATUSES = new Set(['shipped', 'planned', 'rejected']);

export const PRIVATE_ID_RE = /(?:\.mk-[a-z0-9_-]+|v-mk-[a-z0-9_-]+|--mk-[a-z0-9_-]+)/;

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
 * 去掉 blockquote 前缀（兼容使用 `> ...` 书写的第 8 栏，如 shared-element.md）
 */
function unwrapBlockquote(text) {
  const lines = text.split(/\r?\n/);
  const quoteLines = lines.filter((l) => /^\s*>/.test(l)).length;
  if (quoteLines < Math.max(3, lines.length * 0.4)) return text;
  // 丢弃引用块之前的人类导语段落（如 "**用途**：..."）
  const firstQuoteIdx = lines.findIndex((l) => /^\s*>/.test(l));
  return lines
    .slice(firstQuoteIdx)
    .map((l) => l.replace(/^\s*>\s?/, ''))
    .join('\n')
    .trim();
}

/**
 * 从第 8 栏提取可直接复制给 AI 的提示词块与「别让它做的 / 别做的事」反例
 * 兼容三种常见写法：
 *   1. fenced code block + 块外「**别让它做的**」
 *   2. fenced code block 内部末尾带「别让它做的：」
 *   3. blockquote 形式 + 末尾「**别做的事**」
 */
export function extractAiSection(raw = '') {
  const fence = raw.match(/```(?:text|txt|markdown|md)?\r?\n([\s\S]*?)\r?\n```/);
  let prompt = '';
  let dontDo = '';

  if (fence) {
    prompt = fence[1].trim();
    const after = raw.slice(fence.index + fence[0].length).trim();
    if (after) {
      dontDo = after.replace(/^\*\*(?:别让它做的|别做的事)\*\*[：:]?\s*/m, '').trim();
    }
  } else {
    prompt = unwrapBlockquote(raw.trim());
  }

  // 若「别让它做的 / 别做的事」写在 prompt 主体末尾，拆出到 dontDo 避免重复或漏抽
  const innerDontRe = /\r?\n(?:\*\*)?(?:别让它做的|别做的事)(?:\*\*)?[：:]?\s*\r?\n([\s\S]+)$/;
  const innerMatch = prompt.match(innerDontRe);
  if (innerMatch) {
    const extracted = innerMatch[1].trim();
    prompt = prompt.slice(0, innerMatch.index).trim();
    dontDo = dontDo ? `${extracted}\n${dontDo}` : extracted;
  }

  return { prompt, dontDo };
}

/**
 * 从去库化的第 8 栏正文里提取命名小节（如「硬要求」「验收」）
 */
function extractLabeledBlock(prompt, labels) {
  const pat = labels.join('|');
  const re = new RegExp(
    `(?:^|\\r?\\n)(?:\\*\\*)?(?:${pat})(?:\\*\\*)?[：:]?\\s*\\r?\\n([\\s\\S]*?)(?=\\r?\\n(?:\\*\\*)?(?:原理一句话|行为|做法|步骤|结构|硬要求|硬约束|关键约束|验收|验收标准|别让它做的|别做的事)(?:\\*\\*)?[：:]|$)`,
  );
  const m = prompt.match(re);
  return m ? m[1].trim() : '';
}

/**
 * 合成 100% 去库化的精炼 Skill Rule（严格只消费第 8 栏，绝不泄露本库私有标识符）
 * 可直接粘贴进任意项目的 .cursorrules / AGENTS.md / Skill。
 */
export function buildSkillRule(card) {
  const prompt = card.ai_assets?.prompt || '';
  const dontDo = card.ai_assets?.dont_do || '';
  const lines = [];

  lines.push(`# ${card.name} (${card.id}) · 跨平台动效规范`);
  lines.push(`性质：${card.nature} ｜ 平台：${card.platform}`);

  const principleMatch = prompt.match(/(?:^|\r?\n)(?:\*\*)?原理一句话(?:\*\*)?[：:]\s*([^\r\n]+)/);
  const intent = principleMatch
    ? principleMatch[1].trim()
    : card.summary.replace(/\r?\n+/g, ' ').replace(PRIVATE_ID_RE, '').trim();
  if (intent) {
    lines.push('');
    lines.push(`【核心原理】${intent}`);
  }

  const hard = extractLabeledBlock(prompt, ['硬要求', '硬约束', '关键约束']);
  if (hard) {
    lines.push('');
    lines.push('【硬要求】');
    lines.push(hard);
  }

  const accept = extractLabeledBlock(prompt, ['验收', '验收标准']);
  if (accept) {
    lines.push('');
    lines.push('【验收标准】');
    lines.push(accept);
  }

  if (dontDo) {
    lines.push('');
    lines.push('【禁止做法】');
    lines.push(dontDo);
  }

  return lines.join('\n').trim();
}

/**
 * 为对外分发的自包含 Skill 包编译纯净、去库化的消费卡片（省 token，0 私有标识）
 */
export function renderConsumerCardMarkdown(card) {
  const lines = [
    '---',
    `id: ${card.id}`,
    `name: ${card.name}`,
    `nature: ${card.nature}`,
    `platform: ${card.platform}`,
    `source: ${card.source}`,
    '---',
    '',
    `# ${card.name} (${card.id})`,
    '',
    '## 跨平台实现规范',
    '',
    card.ai_assets.prompt,
  ];
  if (card.ai_assets.dont_do) {
    lines.push('', '## 禁止做法', '', card.ai_assets.dont_do);
  }
  lines.push('');
  return lines.join('\n');
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

  // 第 8 栏与 Skill Rule 双红线：对外 AI 资产必须彻底脱离本库，不能泄露私有标识
  const promptLeak = (card.ai_assets?.prompt || '').match(PRIVATE_ID_RE);
  if (promptLeak) {
    errors.push(`第 8 栏 AI 提示词泄露了本库私有标识符: ${promptLeak[0]}`);
  }
  const dontLeak = (card.ai_assets?.dont_do || '').match(PRIVATE_ID_RE);
  if (dontLeak) {
    errors.push(`第 8 栏「别让它做的」泄露了本库私有标识符: ${dontLeak[0]}`);
  }
  const skillLeak = (card.ai_assets?.skill_rule || '').match(PRIVATE_ID_RE);
  if (skillLeak) {
    errors.push(`Skill Rule 泄露了本库私有标识符: ${skillLeak[0]}`);
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
    '> 由 `node scripts/build-registry.mjs` 自动编译自 `effects/*.md`。请勿手改此文件。',
    `> 当前收录：**${registry.count}** 张纯净去库化跨平台动效资产卡。`,
    '',
  ];

  const order = ['反馈', '连续', '方向', '权重', '材质', '节奏'];
  for (const nature of order) {
    const items = registry.effects.filter((e) => e.nature === nature);
    if (items.length === 0) continue;
    lines.push(`## ${nature}（${items.length}）`);
    lines.push('');
    lines.push('| id | 名称 | 平台 | 一句话 | 消费卡 |');
    lines.push('|---|---|---|---|---|');
    for (const e of items) {
      const oneLine = e.summary.replace(/\r?\n+/g, ' ').replace(/\|/g, '\\|');
      lines.push(`| \`${e.id}\` | ${e.name} | ${e.platform} | ${oneLine} | \`./effects/${e.id}.md\` |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * 生成根目录 llms.txt（标准 AI 站点索引，供 Cursor @Docs / Claude / Windsurf 直接抓全库纯净规范）
 */
export function renderLlmsTxt(registry) {
  const base = 'https://wangjian-damon.github.io/motion-kit';
  const lines = [
    '# MotionKit',
    '',
    '> Cross-platform AI motion & interaction asset library. Framework-agnostic physics constants, state machines, degradation contracts, and zero-hallucination prompts (React, Vue, Tailwind, Taro, Flutter, SwiftUI, or vanilla web).',
    '',
    '## Quick Install for AI Agents',
    '',
    '- CLI (no clone required): `npx github:wangjian-damon/motion-kit install`',
    '- Project-level team install: `npx github:wangjian-damon/motion-kit install --project`',
    '- Skills ecosystem: `npx skills add wangjian-damon/motion-kit --skill motion-kit-apply`',
    `- Live Interactive AI Asset Library: ${base}/demo/library.html`,
    `- Machine-Readable Registry JSON: ${base}/dist/registry.json`,
    `- Skill Entry (SKILL.md): ${base}/.agents/skills/motion-kit-apply/SKILL.md`,
    '',
    `## Framework-Agnostic Effect Specs (${registry.count})`,
    '',
  ];

  const order = ['反馈', '连续', '方向', '权重', '材质', '节奏'];
  for (const nature of order) {
    const items = registry.effects.filter((e) => e.nature === nature);
    if (!items.length) continue;
    lines.push(`### ${nature} (${items.length})`);
    for (const e of items) {
      const oneLine = e.summary.replace(/\r?\n+/g, ' ');
      lines.push(`- [${e.name} (${e.id})](${base}/.agents/skills/motion-kit-apply/references/effects/${e.id}.md): ${oneLine}`);
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

  // 3. 编译消费侧 Skill 的纯净去库化资产包（索引 + 消费版卡片，省 token 且 0 私有标识）
  const skillRefDir = path.join(ROOT, '.agents', 'skills', 'motion-kit-apply', 'references');
  const skillEffectsDir = path.join(skillRefDir, 'effects');
  fs.mkdirSync(skillEffectsDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillRefDir, 'registry-index.md'),
    renderSkillIndexMarkdown(registry),
    'utf8',
  );
  const validFiles = new Set(registry.effects.map((e) => `${e.id}.md`));
  for (const old of fs.readdirSync(skillEffectsDir)) {
    if (old.endsWith('.md') && !validFiles.has(old)) {
      fs.unlinkSync(path.join(skillEffectsDir, old));
    }
  }
  for (const e of registry.effects) {
    fs.writeFileSync(
      path.join(skillEffectsDir, `${e.id}.md`),
      renderConsumerCardMarkdown(e),
      'utf8',
    );
  }

  // 4. 生成根目录 llms.txt（供 Cursor @Docs / Claude / Windsurf 直接抓全库）
  fs.writeFileSync(path.join(ROOT, 'llms.txt'), renderLlmsTxt(registry), 'utf8');

  console.log(`✓ 已编译 ${registry.count} 张动效资产卡 → dist/registry.json & demo/registry.data.js & llms.txt & 纯净去库化 Skill 包`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
