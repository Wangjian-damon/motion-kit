#!/usr/bin/env node
/**
 * motion-kit CLI — 零依赖开源分发入口。
 *
 * 任何外部开发者无需克隆仓库，直接一行安装：
 *   npx github:wangjian-damon/motion-kit install
 *   npx github:wangjian-damon/motion-kit install --project   # 安装到当前项目的 .agents/skills/
 *   npx github:wangjian-damon/motion-kit list                # 查看全部 21 个跨平台动效资产
 *   npx github:wangjian-damon/motion-kit show bottom-sheet   # 直接输出去库化 AI 提示词
 *   npx github:wangjian-damon/motion-kit uninstall           # 卸载全局 Skill
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SKILL_NAME = 'motion-kit-apply';
const SKILL_SRC = path.join(ROOT, '.agents', 'skills', SKILL_NAME);
const REGISTRY_PATH = path.join(ROOT, 'dist', 'registry.json');

const argv = process.argv.slice(2);
const cmd = argv.find((a) => !a.startsWith('-')) || 'install';
const flags = new Set(argv.filter((a) => a.startsWith('-')));

function printHelp() {
  console.log(`
MotionKit · 跨平台 AI 动效资产库 CLI

用法:
  motion-kit install             安装自包含 Skill 到本机已有的 AI Agent（Antigravity / Claude / Cursor / Codex）
  motion-kit install --project   安装到当前项目的 .agents/skills/${SKILL_NAME}（团队随 Git 共享）
  motion-kit list                按六大性质列出全部动效资产
  motion-kit show <id>           输出指定效果的去库化 AI 提示词（可直接管道给 pbcopy）
  motion-kit uninstall           卸载本机全局安装的 Skill

快速示例:
  npx github:wangjian-damon/motion-kit install
  npx skills add wangjian-damon/motion-kit --skill ${SKILL_NAME}
`);
}

function getGlobalTargets() {
  const home = os.homedir();
  const candidates = [
    { name: 'Antigravity', parent: path.join(home, '.gemini', 'config', 'skills'), always: true },
    { name: 'Claude Code', parent: path.join(home, '.claude', 'skills'), detect: path.join(home, '.claude') },
    { name: 'Cursor', parent: path.join(home, '.cursor', 'skills'), detect: path.join(home, '.cursor') },
    { name: 'Codex', parent: path.join(home, '.codex', 'skills'), detect: path.join(home, '.codex') },
  ];
  return candidates.filter((t) => t.always || (t.detect && fs.existsSync(t.detect)));
}

function removeIfExists(p) {
  try {
    const st = fs.lstatSync(p);
    if (st.isSymbolicLink() || st.isFile()) fs.unlinkSync(p);
    else fs.rmSync(p, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

function installSkill() {
  if (!fs.existsSync(SKILL_SRC)) {
    console.error(`错误：未找到 Skill 源目录 ${SKILL_SRC}`);
    process.exitCode = 1;
    return;
  }

  // 远程 npx 运行在临时缓存目录中，默认用拷贝模式确保清理缓存后仍长期有效
  const useSymlink = flags.has('--link');

  if (flags.has('--project')) {
    const dest = path.join(process.cwd(), '.agents', 'skills', SKILL_NAME);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    removeIfExists(dest);
    if (useSymlink) fs.symlinkSync(SKILL_SRC, dest, 'dir');
    else fs.cpSync(SKILL_SRC, dest, { recursive: true });
    console.log(`✓ 已安装到当前项目：${dest}`);
    console.log('  团队成员拉取仓库后，Agent 将自动识别并取用 MotionKit 动效资产。');
    return;
  }

  const targets = getGlobalTargets();
  for (const t of targets) {
    fs.mkdirSync(t.parent, { recursive: true });
    const dest = path.join(t.parent, SKILL_NAME);
    removeIfExists(dest);
    if (useSymlink) fs.symlinkSync(SKILL_SRC, dest, 'dir');
    else fs.cpSync(SKILL_SRC, dest, { recursive: true });
    console.log(`✓ 已安装 [${t.name}] → ${dest}`);
  }

  console.log('\n安装完成！之后在任意项目里直接提动效/手势/液态玻璃需求，Agent 会自动按 MotionKit 标准复现，无需手动复制提示词。');
}

function uninstallSkill() {
  const targets = getGlobalTargets();
  let removed = 0;
  for (const t of targets) {
    const dest = path.join(t.parent, SKILL_NAME);
    if (removeIfExists(dest)) {
      console.log(`✓ 已卸载 [${t.name}] ${dest}`);
      removed++;
    }
  }
  const projDest = path.join(process.cwd(), '.agents', 'skills', SKILL_NAME);
  if (flags.has('--project') && removeIfExists(projDest)) {
    console.log(`✓ 已卸载 [当前项目] ${projDest}`);
    removed++;
  }
  if (!removed) console.log('未发现已安装的 MotionKit Skill。');
}

function loadRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

function listEffects() {
  const reg = loadRegistry();
  const order = ['反馈', '连续', '方向', '权重', '材质', '节奏'];
  console.log(`\nMotionKit · 共 ${reg.count} 张跨平台动效资产卡\n`);
  for (const nature of order) {
    const items = reg.effects.filter((e) => e.nature === nature);
    if (!items.length) continue;
    console.log(`[${nature}] (${items.length})`);
    for (const e of items) {
      console.log(`  - ${e.id.padEnd(16)} ${e.name} (${e.platform} / ${e.layer})`);
    }
    console.log('');
  }
}

function showEffect(id) {
  if (!id) {
    console.error('请指定效果 id，例如：motion-kit show bottom-sheet');
    process.exitCode = 1;
    return;
  }
  const reg = loadRegistry();
  const card = reg.effects.find((e) => e.id === id);
  if (!card) {
    console.error(`未找到效果 "${id}"。运行 motion-kit list 查看可用列表。`);
    process.exitCode = 1;
    return;
  }
  const prompt = card.ai_assets.prompt || '';
  const dontDo = card.ai_assets.dont_do ? `\n\n别让它做的：\n${card.ai_assets.dont_do}` : '';
  console.log(prompt + dontDo);
}

if (flags.has('-h') || flags.has('--help') || cmd === 'help') {
  printHelp();
} else if (cmd === 'install') {
  installSkill();
} else if (cmd === 'uninstall') {
  uninstallSkill();
} else if (cmd === 'list') {
  listEffects();
} else if (cmd === 'show') {
  const id = argv.filter((a) => !a.startsWith('-'))[1];
  showEffect(id);
} else {
  console.error(`未知命令: ${cmd}`);
  printHelp();
  process.exitCode = 1;
}
