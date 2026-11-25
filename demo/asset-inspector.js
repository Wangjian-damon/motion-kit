/**
 * asset-inspector.js — 把 AI 资产库直接嵌进真实动效演示页（所见即所得，原地取用）。
 *
 * 用法：
 *   1. 在任意演示区块上标 data-mk-assets="bottom-sheet"（多个用逗号分隔）
 *   2. 页面引入 ./registry.data.js 与 ./asset-inspector.js
 *
 * 自动完成：
 *   - 在每个标注区块的标题下方插入轻量胶囊（一键复制 Prompt + 原地展开详情抽屉）
 *   - 在页面右下角提供轻量「✦ AI 资产」悬浮入口，随时检索全库 21 张卡
 *   - 抽屉内支持简洁 Markdown 渲染（加粗、行内代码、表格、列表）
 */
(() => {
  const reg = window.__MK_REGISTRY__;
  if (!reg || !Array.isArray(reg.effects)) return;

  const byId = new Map(reg.effects.map((e) => [e.id, e]));

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** 轻量 Markdown 渲染：支持表格、行内代码、加粗、无序列表与段落 */
  function renderMd(md = '') {
    const lines = String(md).replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let i = 0;

    const inline = (txt) =>
      esc(txt)
        .replace(/`([^`]+)`/g, '<code class="mki-code">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) { i++; continue; }

      // Fenced code block
      if (line.startsWith('```')) {
        i++;
        const buf = [];
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          buf.push(lines[i]);
          i++;
        }
        i++;
        out.push(`<pre class="mki-pre">${esc(buf.join('\n'))}</pre>`);
        continue;
      }

      // Markdown table
      if (line.startsWith('|') && i + 1 < lines.length && /^\|[\s:-]+\|/.test(lines[i + 1].trim())) {
        const parseRow = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const head = parseRow(lines[i]);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          rows.push(parseRow(lines[i]));
          i++;
        }
        out.push(
          `<div class="mki-table-wrap"><table class="mki-table"><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${rows
            .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
            .join('')}</tbody></table></div>`,
        );
        continue;
      }

      // Bullet list
      if (/^[-*]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
          i++;
        }
        out.push(`<ul class="mki-list">${items.map((it) => `<li>${inline(it)}</li>`).join('')}</ul>`);
        continue;
      }

      // Paragraph
      const p = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].trim().startsWith('```') &&
        !lines[i].trim().startsWith('|') &&
        !/^[-*]\s+/.test(lines[i].trim())
      ) {
        p.push(lines[i].trim());
        i++;
      }
      out.push(`<p class="mki-p">${inline(p.join(' '))}</p>`);
    }

    return out.join('');
  }

  function fullPrompt(card) {
    const p = card.ai_assets?.prompt || '';
    const d = card.ai_assets?.dont_do ? `\n\n别让它做的：\n${card.ai_assets.dont_do}` : '';
    return p + d;
  }

  async function copyText(text, btn, doneLabel = '已复制') {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    if (!btn) return;
    const orig = btn.dataset.origLabel || btn.textContent;
    btn.dataset.origLabel = orig;
    btn.textContent = doneLabel;
    btn.classList.add('is-copied');
    clearTimeout(btn._mkCopyTimer);
    btn._mkCopyTimer = setTimeout(() => {
      btn.textContent = orig;
      btn.classList.remove('is-copied');
    }, 1300);
  }

  // 1. 注入独立样式（不依赖页面 CSS，避免冲突）
  const style = document.createElement('style');
  style.textContent = `
    .mki-bar {
      display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;
    }
    .mki-pill {
      display: inline-flex; align-items: center;
      border: 1px solid rgba(184, 255, 61, 0.26);
      background: rgba(184, 255, 61, 0.07);
      border-radius: 999px; overflow: hidden;
      font: 500 11.5px/1 -apple-system, BlinkMacSystemFont, 'PingFang SC', system-ui, sans-serif;
    }
    .mki-pill__open, .mki-pill__copy {
      appearance: none; border: 0; background: transparent; cursor: pointer;
      color: #d9ff8f; font: inherit; padding: 6px 10px;
      display: inline-flex; align-items: center; gap: 5px;
      transition: background 140ms ease, color 140ms ease;
    }
    .mki-pill__open:hover { background: rgba(184, 255, 61, 0.14); color: #fff; }
    .mki-pill__copy {
      border-left: 1px solid rgba(184, 255, 61, 0.2);
      color: #b8ff3d; font-weight: 600; padding: 6px 9px;
    }
    .mki-pill__copy:hover { background: #b8ff3d; color: #07090d; }
    .mki-pill__copy.is-copied { background: #22c55e; color: #041309; }

    .mki-fab {
      position: fixed; right: 18px; bottom: 18px; z-index: 950;
      appearance: none; border: 1px solid rgba(184, 255, 61, 0.36);
      background: rgba(10, 14, 20, 0.88); color: #e8ffd0;
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      padding: 9px 14px; border-radius: 999px; cursor: pointer;
      font: 560 12.5px/1 -apple-system, BlinkMacSystemFont, 'PingFang SC', system-ui, sans-serif;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
      display: inline-flex; align-items: center; gap: 7px;
      transition: transform 150ms ease, border-color 150ms ease;
    }
    .mki-fab:hover { transform: translateY(-2px); border-color: #b8ff3d; }
    .mki-fab-dot { width: 7px; height: 7px; border-radius: 50%; background: #b8ff3d; box-shadow: 0 0 10px #b8ff3d; }

    .mki-mask {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(3, 5, 9, 0.72);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
      display: none; justify-content: flex-end;
      font: 400 14px/1.6 -apple-system, BlinkMacSystemFont, 'PingFang SC', system-ui, sans-serif;
      color: #eef2f7;
    }
    .mki-mask.is-open { display: flex; }
    .mki-drawer {
      width: min(680px, 100vw); height: 100%; overflow-y: auto;
      background: #0b0f16; border-left: 1px solid rgba(255, 255, 255, 0.1);
      padding: 24px 24px 72px; box-sizing: border-box;
    }
    .mki-top {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
      padding-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 16px;
    }
    .mki-title { margin: 0 0 8px; font-size: 20px; font-weight: 650; letter-spacing: -0.02em; }
    .mki-badges { display: flex; flex-wrap: wrap; gap: 6px; }
    .mki-badge {
      font-size: 11px; padding: 2px 8px; border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.1); color: #8b95a5;
    }
    .mki-badge--hi { color: #b8ff3d; border-color: rgba(184, 255, 61, 0.3); background: rgba(184, 255, 61, 0.08); }
    .mki-close {
      appearance: none; border: 1px solid rgba(255, 255, 255, 0.12); background: transparent;
      color: #eef2f7; width: 32px; height: 32px; border-radius: 9px; cursor: pointer;
      font-size: 18px; line-height: 1; flex: none;
    }
    .mki-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .mki-btn {
      appearance: none; border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.04); color: #eef2f7;
      font: 540 12.5px/1 inherit; padding: 9px 13px; border-radius: 10px;
      cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;
    }
    .mki-btn:hover { background: rgba(255, 255, 255, 0.09); }
    .mki-btn--primary { background: #b8ff3d; color: #07090d; border-color: #b8ff3d; }
    .mki-btn--primary:hover { filter: brightness(0.95); background: #b8ff3d; }
    .mki-btn.is-copied { background: #22c55e; color: #041309; border-color: #22c55e; }

    .mki-sec { margin-bottom: 20px; }
    .mki-sec h3 {
      margin: 0 0 8px; font-size: 11.5px; letter-spacing: 0.12em;
      text-transform: uppercase; color: #b8ff3d; font-weight: 620;
    }
    .mki-pre {
      margin: 0 0 10px; white-space: pre-wrap; word-break: break-word;
      font: 400 12.5px/1.62 ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #dbe2ee; background: rgba(255, 255, 255, 0.035);
      border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 13px 15px;
    }
    .mki-p { margin: 0 0 10px; font-size: 13.5px; color: #cfd6e2; line-height: 1.66; }
    .mki-code {
      font: 400 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
      background: rgba(255, 255, 255, 0.08); color: #e2f5b5;
      padding: 1px 5px; border-radius: 5px;
    }
    .mki-list { margin: 0 0 10px; padding-left: 18px; color: #cfd6e2; font-size: 13.5px; }
    .mki-list li { margin-bottom: 5px; }
    .mki-table-wrap { overflow-x: auto; margin-bottom: 10px; }
    .mki-table {
      width: 100%; border-collapse: collapse; font-size: 12.5px; color: #cfd6e2;
      border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; overflow: hidden;
    }
    .mki-table th, .mki-table td {
      text-align: left; padding: 8px 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.07);
      vertical-align: top;
    }
    .mki-table th { background: rgba(255, 255, 255, 0.04); color: #eef2f7; font-weight: 600; }

    /* 全库速查列表 */
    .mki-search {
      width: 100%; box-sizing: border-box; margin-bottom: 14px;
      background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 11px; color: #eef2f7; font: inherit; font-size: 13.5px; padding: 9px 13px;
      outline: none;
    }
    .mki-search:focus { border-color: #b8ff3d; }
    .mki-picker-item {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 11px 12px; border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 12px; background: rgba(255, 255, 255, 0.025); margin-bottom: 8px;
    }
    .mki-picker-item:hover { border-color: rgba(184, 255, 61, 0.35); }
    .mki-picker-main { cursor: pointer; flex: 1; min-width: 0; }
    .mki-picker-name { font-weight: 600; font-size: 14px; color: #eef2f7; }
    .mki-picker-sub { font-size: 12px; color: #8b95a5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  `;
  document.head.appendChild(style);

  // 2. 创建抽屉 DOM（挂在 document.body，保证在 mobile.html 390px 设备框外也能全高展开）
  const mask = document.createElement('div');
  mask.className = 'mki-mask';
  mask.setAttribute('role', 'dialog');
  mask.setAttribute('aria-modal', 'true');
  mask.innerHTML = `<div class="mki-drawer"></div>`;
  document.body.appendChild(mask);
  const drawer = mask.firstElementChild;

  function close() {
    mask.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  mask.addEventListener('click', (e) => { if (e.target === mask) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mask.classList.contains('is-open')) close(); });

  function openCard(id) {
    const card = byId.get(id);
    if (!card) return;
    drawer.innerHTML = `
      <div class="mki-top">
        <div>
          <h2 class="mki-title">${esc(card.name)} <span style="color:#8b95a5;font-weight:400;font-size:14px;">· ${esc(card.id)}</span></h2>
          <div class="mki-badges">
            <span class="mki-badge mki-badge--hi">${esc(card.nature)}</span>
            <span class="mki-badge">${esc(card.layer)}</span>
            <span class="mki-badge">${esc(card.platform)}</span>
            <span class="mki-badge">${esc(card.file)}</span>
          </div>
        </div>
        <button class="mki-close" aria-label="关闭">×</button>
      </div>
      <div class="mki-actions">
        <button class="mki-btn mki-btn--primary" data-mki="prompt">复制 AI 提示词（第 8 栏）</button>
        <button class="mki-btn" data-mki="rule">复制 Skill 约束规则</button>
        <button class="mki-btn" data-mki="all">← 浏览全库 (${reg.count})</button>
        <a class="mki-btn" href="https://github.com/Wangjian-damon/motion-kit" target="_blank" rel="noopener noreferrer">★ GitHub Star</a>
      </div>
      <div class="mki-sec">
        <h3>8 · 去库化 AI 复现提示词</h3>
        <pre class="mki-pre">${esc(fullPrompt(card))}</pre>
      </div>
      <div class="mki-sec">
        <h3>Skill Rule（一次安装后 Agent 自动调用）</h3>
        <pre class="mki-pre">${esc(card.ai_assets.skill_rule)}</pre>
      </div>
      <div class="mki-sec">
        <h3>2 · 交互问题</h3>
        ${renderMd(card.problem)}
      </div>
      <div class="mki-sec">
        <h3>4 · 参数与为什么</h3>
        ${renderMd(card.params)}
      </div>
      <div class="mki-sec">
        <h3>6 · 降级契约</h3>
        ${renderMd(card.degradation)}
      </div>
      <div class="mki-sec">
        <h3>7 · 容易做错的地方</h3>
        ${renderMd(card.pitfalls)}
      </div>
    `;
    drawer.querySelector('.mki-close').onclick = close;
    drawer.querySelector('[data-mki="prompt"]').onclick = (e) => copyText(fullPrompt(card), e.currentTarget, '已复制 Prompt');
    drawer.querySelector('[data-mki="rule"]').onclick = (e) => copyText(card.ai_assets.skill_rule, e.currentTarget, '已复制 Skill');
    drawer.querySelector('[data-mki="all"]').onclick = openPicker;
    drawer.scrollTop = 0;
    mask.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function openPicker() {
    drawer.innerHTML = `
      <div class="mki-top">
        <div>
          <h2 class="mki-title">MotionKit AI 资产速查</h2>
          <div class="mki-badges">
            <span class="mki-badge mki-badge--hi">共 ${reg.count} 张跨平台资产卡</span>
            <span class="mki-badge">安装 Skill 后 Agent 自动取用</span>
          </div>
        </div>
        <button class="mki-close" aria-label="关闭">×</button>
      </div>
      <div class="mki-actions">
        <button class="mki-btn mki-btn--primary" data-mki="install">复制一键安装 Agent Skill 命令</button>
        <a class="mki-btn" href="./library.html">打开全屏资产库 →</a>
        <a class="mki-btn" href="https://github.com/Wangjian-damon/motion-kit" target="_blank" rel="noopener noreferrer">★ GitHub Star</a>
      </div>
      <input class="mki-search" type="search" placeholder="搜索效果名、性质（反馈/连续/方向/权重/材质/节奏）或关键词..." />
      <div class="mki-picker-list"></div>
    `;
    drawer.querySelector('.mki-close').onclick = close;
    drawer.querySelector('[data-mki="install"]').onclick = (e) =>
      copyText('npx github:wangjian-damon/motion-kit install', e.currentTarget, '已复制 npx 安装命令');

    const input = drawer.querySelector('.mki-search');
    const listBox = drawer.querySelector('.mki-picker-list');
    const paint = () => {
      const q = input.value.trim().toLowerCase();
      const items = reg.effects.filter((c) =>
        !q || `${c.id} ${c.name} ${c.nature} ${c.layer} ${c.summary}`.toLowerCase().includes(q),
      );
      listBox.innerHTML = '';
      for (const c of items) {
        const row = document.createElement('div');
        row.className = 'mki-picker-item';
        row.innerHTML = `
          <div class="mki-picker-main">
            <div class="mki-picker-name">${esc(c.name)} <span style="color:#b8ff3d;font-size:11px;font-weight:500;">${esc(c.nature)}</span></div>
            <div class="mki-picker-sub">${esc(c.summary.replace(/[`*]/g, ''))}</div>
          </div>
          <button class="mki-btn" style="padding:6px 10px;font-size:11.5px;">复制 Prompt</button>
        `;
        row.querySelector('.mki-picker-main').onclick = () => openCard(c.id);
        row.querySelector('button').onclick = (e) => copyText(fullPrompt(c), e.currentTarget, '已复制');
        listBox.appendChild(row);
      }
    };
    input.addEventListener('input', paint);
    paint();
    mask.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  // 3. 自动挂载每个 [data-mk-assets] 区块的原地胶囊
  function mountInlineBars() {
    document.querySelectorAll('[data-mk-assets]').forEach((sec) => {
      const ids = sec.dataset.mkAssets.split(',').map((s) => s.trim()).filter((id) => byId.has(id));
      if (ids.length === 0) return;

      const bar = document.createElement('div');
      bar.className = 'mki-bar';
      for (const id of ids) {
        const card = byId.get(id);
        const pill = document.createElement('span');
        pill.className = 'mki-pill';
        pill.innerHTML = `
          <button type="button" class="mki-pill__open" title="查看 ${esc(card.name)} 的 AI 资产与踩坑">✦ ${esc(card.name)}</button>
          <button type="button" class="mki-pill__copy" title="一键复制去库化 AI 提示词">复制 Prompt</button>
        `;
        pill.querySelector('.mki-pill__open').onclick = () => openCard(id);
        pill.querySelector('.mki-pill__copy').onclick = (e) => copyText(fullPrompt(card), e.currentTarget, '已复制');
        bar.appendChild(pill);
      }

      const head = sec.querySelector('.sec-head') || sec.querySelector('h2');
      if (head && head.classList.contains('sec-head')) {
        head.appendChild(bar);
      } else if (head) {
        head.insertAdjacentElement('afterend', bar);
      } else {
        sec.prepend(bar);
      }
    });
  }

  // 4. 悬浮入口
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'mki-fab';
  fab.innerHTML = `<span class="mki-fab-dot"></span>AI 资产 (${reg.count})`;
  fab.onclick = openPicker;
  document.body.appendChild(fab);

  // 暴露全局钩子 + 支持 URL 参数 ?asset=<id> 直达
  window.MKAssetInspector = { openCard, openPicker, renderMd };
  mountInlineBars();

  const paramId = new URLSearchParams(location.search).get('asset');
  if (paramId && byId.has(paramId)) openCard(paramId);
})();
