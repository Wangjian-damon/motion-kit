/**
 * card-previews.js — 为 demo/library.html 里的每一张 AI 资产卡提供「原地可交互微缩演示台」。
 *
 * 用户不用跳去别的页面，直接在卡片顶部按、拖、悬停、刷新体验真实手感，
 * 觉得对味就在 10px 下方一键 Copy Prompt / Copy Skill。
 *
 * 约定：mountCardPreview(id, stageEl) 返回 teardown()，筛选重绘时自动清理全部监听。
 */
(() => {
  const MK = window.MK;
  if (!MK) return;

  const miniBtn = (label, cls = '') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pv-btn ${cls}`.trim();
    b.textContent = label;
    return b;
  };

  const PREVIEWS = {
    /* ==================== 数据展示三件套 ==================== */
    'bar-grow'(stage) {
      stage.innerHTML = `<div class="pv-col" style="width:100%;gap:8px">
        <div class="pv-bar-row"><span>API</span><div class="mk-bar" style="flex:1;color:#b8ff3d"><span class="mk-bar__fill"></span></div><em class="mk-cell">78%</em></div>
        <div class="pv-bar-row"><span>CDN</span><div class="mk-bar" style="flex:1;color:#60a5fa"><span class="mk-bar__fill"></span></div><em class="mk-cell">52%</em></div>
        <div class="pv-bar-row"><span>DB</span><div class="mk-bar" style="flex:1;color:#c084fc"><span class="mk-bar__fill"></span></div><em class="mk-cell">34%</em></div>
      </div>`;
      const bars = [...stage.querySelectorAll('.mk-bar')];
      const nums = [...stage.querySelectorAll('em')];
      const vals = [78, 52, 34];
      const ctrls = bars.map((el, i) => MK.barGrow(el, { value: vals[i], max: 100, index: i }));
      const btn = miniBtn('刷新数值', 'pv-corner');
      btn.onclick = () => {
        ctrls.forEach((c, i) => {
          const v = 18 + Math.round(Math.random() * 78);
          c.update(v, 100);
          nums[i].textContent = `${v}%`;
        });
      };
      stage.appendChild(btn);
      return () => ctrls.forEach((c) => c.destroy());
    },

    'cell-flash'(stage) {
      let qps = 1420;
      let err = 1.24;
      stage.innerHTML = `<div class="pv-row" style="gap:10px;width:100%;justify-content:center">
        <div class="pv-metric"><small>QPS</small><strong class="mk-cell" data-k="qps">1,420</strong></div>
        <div class="pv-metric"><small>延迟 ms</small><strong class="mk-cell" data-k="err">1.24</strong></div>
      </div>`;
      const elQ = stage.querySelector('[data-k="qps"]');
      const elE = stage.querySelector('[data-k="err"]');
      const upBtn = miniBtn('涨 ↑', 'pv-corner-l');
      const dnBtn = miniBtn('跌 ↓', 'pv-corner');
      upBtn.onclick = () => {
        const nextQ = qps + 40 + Math.round(Math.random() * 140);
        MK.flashCell(elQ, MK.valueDelta(qps, nextQ));
        qps = nextQ;
        elQ.textContent = qps.toLocaleString();
      };
      dnBtn.onclick = () => {
        const nextE = Math.max(0.2, Number((err - 0.12 - Math.random() * 0.25).toFixed(2)));
        MK.flashCell(elE, MK.valueDelta(err, nextE));
        err = nextE;
        elE.textContent = err.toFixed(2);
      };
      stage.append(upBtn, dnBtn);
      return () => {};
    },

    'sparkline-draw'(stage) {
      stage.innerHTML = `<div class="pv-row" style="gap:14px;align-items:center">
        <div class="pv-spark-box"><small style="color:#b8ff3d">+24%</small><span data-s="up"></span></div>
        <div class="pv-spark-box"><small style="color:#f87171">-11%</small><span data-s="dn"></span></div>
      </div>`;
      const s1 = MK.sparkline(stage.querySelector('[data-s="up"]'), [14, 20, 18, 28, 32, 30, 44], { width: 108, height: 34 });
      const s2 = MK.sparkline(stage.querySelector('[data-s="dn"]'), [42, 39, 41, 33, 30, 26, 21], { width: 108, height: 34 });
      const btn = miniBtn('↻ 重播', 'pv-corner');
      btn.onclick = () => { s1.replay(); s2.replay(); };
      stage.appendChild(btn);
      return () => { s1.destroy(); s2.destroy(); };
    },

    /* ==================== P0 业界标杆 ==================== */
    'state-button'(stage) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pv-cta';
      btn.innerHTML = `
        <span data-for="idle">点我提交</span>
        <span data-for="loading"><i class="mk-state-btn__spin"></i>保存中…</span>
        <span data-for="success">✓ 已保存</span>
        <span data-for="error">× 失败，点我重试</span>`;
      let fail = false;
      const ctrl = MK.stateButton(btn, () => ({
        action: () => new Promise((res, rej) => setTimeout(() => {
          fail = !fail;
          if (!fail) rej(new Error('err'));
          else res();
        }, 90)),
      }));
      stage.appendChild(btn);
      return () => ctrl.destroy();
    },

    'toast-stack'(stage) {
      stage.style.alignItems = 'flex-end';
      const wrap = document.createElement('div');
      wrap.className = 'mk-toast-stack';
      wrap.style.width = '100%';
      const makeItem = (txt) => {
        const d = document.createElement('div');
        d.className = 'pv-toast-card';
        d.textContent = txt;
        return d;
      };
      wrap.append(makeItem('已同步云端配置'), makeItem('悬停展开 · 横甩关闭'));
      stage.appendChild(wrap);
      const ctrl = MK.toastStack(wrap, { lifetime: 999999, gap: 10 });
      let seq = 2;
      const add = miniBtn('+ 推一条', 'pv-corner');
      add.onclick = () => wrap.appendChild(makeItem(`新通知 #${++seq} · 横向轻甩可删`));
      stage.appendChild(add);
      return () => ctrl.destroy();
    },

    'rubber-band'(stage) {
      const track = document.createElement('div');
      track.style.cssText = 'width:100%;overflow:hidden;border-radius:10px;padding:4px 0';
      const strip = document.createElement('div');
      strip.style.cssText = 'display:flex;gap:8px;width:max-content';
      for (let i = 1; i <= 4; i++) {
        const c = document.createElement('div');
        c.className = 'pv-chip-card';
        c.textContent = `0${i} 拖过头试试`;
        strip.appendChild(c);
      }
      track.appendChild(strip);
      stage.appendChild(track);
      return MK.rubber(strip, { axis: 'x' });
    },

    /* ==================== 触控反馈与手势 ==================== */
    'tap'(stage) {
      const b1 = miniBtn('轻按反馈', 'pv-tap-demo');
      const b2 = miniBtn('深按压 CTA', 'pv-tap-demo mk-tap--deep pv-tap-accent');
      stage.append(b1, b2);
      const t1 = MK.tap(b1, { force: true });
      const t2 = MK.tap(b2, { force: true });
      return () => { t1(); t2(); };
    },

    'long-press'(stage) {
      const b = miniBtn('按住 480ms 触发', 'pv-tap-demo');
      let count = 0;
      const stop = MK.longPress(b, () => {
        b.textContent = `✓ 已触发 (${++count})`;
        setTimeout(() => { b.textContent = '按住 480ms 触发'; }, 1000);
      });
      stage.appendChild(b);
      return stop;
    },

    'ripple'(stage) {
      const box = document.createElement('button');
      box.type = 'button';
      box.className = 'pv-ripple-pad';
      box.textContent = '点我任意位置激起涟漪';
      stage.appendChild(box);
      return MK.ripple(box);
    },

    'dock'(stage) {
      const bar = document.createElement('div');
      bar.className = 'mk-dock pv-dock';
      ['✦', '⌘', '◈', '⚡', '◎'].forEach((sym) => {
        const it = document.createElement('span');
        it.className = 'mk-dock__item pv-dock-item';
        it.textContent = sym;
        bar.appendChild(it);
      });
      stage.appendChild(bar);
      return MK.dock(bar, { radius: 84, max: 0.48 });
    },

    'seg'(stage) {
      const seg = document.createElement('div');
      seg.className = 'mk-seg pv-seg';
      seg.dataset.value = '0';
      seg.innerHTML = `<span class="mk-seg__pill"></span>
        <button class="mk-seg__opt">日</button>
        <button class="mk-seg__opt">周</button>
        <button class="mk-seg__opt">月</button>`;
      stage.appendChild(seg);
      const ctrl = MK.segmented(seg);
      return () => ctrl.destroy();
    },

    'detent'(stage) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'width:88%;display:flex;flex-direction:column;gap:8px;align-items:center';
      const label = document.createElement('small');
      label.style.color = '#b8ff3d';
      label.textContent = '刻度 3 / 5（左右拖）';
      const det = document.createElement('div');
      det.className = 'mk-detent';
      det.style.width = '100%';
      det.dataset.n = '5';
      det.dataset.value = '2';
      det.innerHTML = `<div class="mk-detent__track"><i class="mk-detent__fill"></i></div><i class="mk-detent__knob"></i>`;
      wrap.append(label, det);
      stage.appendChild(wrap);
      const ctrl = MK.detent(det, { onSnap: (i) => { label.textContent = `刻度 ${i + 1} / 5`; } });
      return () => ctrl.destroy();
    },

    'count-up'(stage) {
      const box = document.createElement('div');
      box.style.cssText = 'font-size:28px;font-weight:700;letter-spacing:-0.02em;color:#eef2f7';
      stage.appendChild(box);
      let val = 4207;
      const odo = MK.odometer(box, val);
      const btn = miniBtn('随机翻数', 'pv-corner');
      btn.onclick = () => { val = 1000 + Math.floor(Math.random() * 8999); odo.update(val); };
      stage.appendChild(btn);
      return () => odo.destroy?.();
    },

    'enter'(stage) {
      const row = document.createElement('div');
      row.className = 'pv-row';
      row.style.gap = '8px';
      const items = [0, 1, 2].map((i) => {
        const d = document.createElement('div');
        d.className = 'mk-enter pv-mini-block';
        d.style.transitionDelay = `${i * 70}ms`;
        d.textContent = `0${i + 1}`;
        row.appendChild(d);
        return d;
      });
      stage.appendChild(row);
      const play = () => {
        items.forEach((d, i) => {
          d.classList.remove('is-in');
          d.style.transitionDelay = `${i * 70}ms`;
        });
        void row.offsetWidth;
        requestAnimationFrame(() => items.forEach((d) => d.classList.add('is-in')));
      };
      play();
      const btn = miniBtn('↻ 重播', 'pv-corner');
      btn.onclick = play;
      stage.appendChild(btn);
      return () => {};
    },

    'split'(stage) {
      const h = document.createElement('div');
      h.style.cssText = 'font-size:18px;font-weight:650;letter-spacing:-0.02em;color:#eef2f7';
      h.textContent = 'Hello 动效世界！';
      stage.appendChild(h);
      const ctrl = MK.split(h, { by: 'word' });
      const play = () => {
        h.classList.remove('is-in');
        h.querySelectorAll('.mk-split__unit').forEach((n) => n.classList.remove('is-in'));
        void h.offsetWidth;
        requestAnimationFrame(() => ctrl.reveal());
      };
      play();
      const btn = miniBtn('↻ 重播', 'pv-corner');
      btn.onclick = play;
      stage.appendChild(btn);
      return () => ctrl.restore();
    },

    'pop'(stage) {
      const pop = document.createElement('div');
      pop.className = 'mk-pop pv-pop-card';
      pop.textContent = '@starting-style 弹层';
      let open = true;
      const btn = miniBtn('收起弹层', 'pv-corner');
      btn.onclick = () => {
        open = !open;
        if (open) {
          pop.hidden = false;
          pop.classList.remove('is-closing');
          btn.textContent = '收起弹层';
        } else {
          pop.classList.add('is-closing');
          setTimeout(() => { if (!open) pop.hidden = true; }, 180);
          btn.textContent = '打开弹层';
        }
      };
      stage.append(pop, btn);
      return () => {};
    },

    'bottom-sheet'(stage) {
      stage.style.padding = '0';
      const frame = document.createElement('div');
      frame.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;contain:paint';
      const bd = document.createElement('div');
      bd.className = 'mk-sheet-backdrop';
      bd.style.position = 'absolute';
      const sh = document.createElement('div');
      sh.className = 'mk-sheet';
      sh.style.cssText = 'position:absolute;padding:8px 14px 12px;max-height:92px;border-radius:16px 16px 0 0;background:#141a24';
      sh.innerHTML = `<div class="mk-sheet__grabber" data-mk-sheet-handle style="margin:0 auto 6px"></div><div style="font-size:12px;color:#cfd6e2;text-align:center">向下拖抓手过 28% 收起</div>`;
      const reopen = miniBtn('重新打开弹层');
      reopen.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:none';
      frame.append(reopen, bd, sh);
      stage.appendChild(frame);
      const ctrl = MK.sheet(sh, {
        backdrop: bd,
        onClose() {
          sh.style.display = 'none';
          bd.style.display = 'none';
          reopen.style.display = 'inline-flex';
        },
      });
      reopen.onclick = () => {
        reopen.style.display = 'none';
        sh.classList.remove('is-closing');
        sh.style.display = '';
        bd.style.display = '';
      };
      return () => ctrl.destroy?.();
    },

    'snap-sheet'(stage) {
      stage.style.padding = '0';
      const frame = document.createElement('div');
      frame.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;contain:paint';
      const tag = document.createElement('small');
      tag.style.cssText = 'position:absolute;top:8px;left:12px;color:#b8ff3d;font-size:11px;z-index:2';
      tag.textContent = '当前档位：中档 (65%)';
      const sh = document.createElement('div');
      sh.className = 'mk-sheet';
      sh.style.cssText = 'position:absolute;height:112px;padding:8px 14px;border-radius:16px 16px 0 0;background:#141a24';
      sh.innerHTML = `<div class="mk-sheet__grabber" data-mk-sheet-handle style="margin:0 auto 6px"></div><div style="font-size:11.5px;color:#cfd6e2;text-align:center">上下拖抓手吸附三档（38% / 68% / 全开）</div>`;
      frame.append(tag, sh);
      stage.appendChild(frame);
      const names = ['低档 (38%)', '中档 (68%)', '全开 (100%)'];
      const ctrl = MK.sheet(sh, {
        snapPoints: [0.38, 0.68, 1],
        snap: 1,
        dismissible: false,
        onSnap(i) { tag.textContent = `当前档位：${names[i] || i}`; },
      });
      return () => ctrl.destroy?.();
    },

    'swipe'(stage) {
      const wrap = document.createElement('div');
      wrap.className = 'mk-swipe';
      wrap.style.cssText = 'width:92%;border-radius:12px;overflow:hidden';
      wrap.innerHTML = `<div class="mk-swipe__action" style="background:#ef4444;color:#fff;font-size:12px;padding:0 16px">删除</div>
        <div class="mk-swipe__body" style="background:#141a24;padding:12px 14px;font-size:12.5px;border:1px solid rgba(255,255,255,0.08);border-radius:12px">← 向左滑出操作</div>`;
      stage.appendChild(wrap);
      const stop = MK.swipe(wrap, {
        onDismiss() {
          wrap.querySelector('.mk-swipe__body').textContent = '✓ 已触发删除（点我复原）';
        },
      });
      wrap.onclick = () => {
        wrap.querySelector('.mk-swipe__body').style.transform = '';
        wrap.querySelector('.mk-swipe__body').textContent = '← 向左滑出操作';
      };
      return stop;
    },

    'pull-refresh'(stage) {
      const box = document.createElement('div');
      box.className = 'mk-ptr-list';
      box.style.cssText = 'width:92%;height:96px;overflow-y:auto;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:#10151f;position:relative;padding:10px 12px';
      box.innerHTML = `<div class="mk-ptr" style="font-size:11px;color:#b8ff3d;text-align:center;margin-bottom:4px">↓ 向下拉触发阻尼刷新</div>
        <div style="font-size:12px;color:#8b95a5;text-align:center">按住此处往下拖</div>`;
      stage.appendChild(box);
      const stop = MK.pullToRefresh(box, () => new Promise((r) => setTimeout(r, 450)));
      return stop;
    },

    'edge-back'(stage) {
      stage.style.padding = '0';
      const box = document.createElement('div');
      box.style.cssText = 'position:relative;width:100%;height:100%;display:grid;place-items:center;overflow:hidden';
      const edge = document.createElement('div');
      edge.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:22px;background:linear-gradient(90deg,rgba(184,255,61,0.28),transparent)';
      const txt = document.createElement('span');
      txt.style.cssText = 'font-size:12px;color:#cfd6e2';
      txt.textContent = '从最左亮条向右拖过 1/3 →';
      box.append(edge, txt);
      stage.appendChild(box);
      return MK.edgeSwipeBack(box, {
        force: true,
        edge: 36,
        onProgress(p) { txt.textContent = p > 0 ? `返回进度 ${Math.round(p * 100)}%` : '从最左亮条向右拖过 1/3 →'; },
        onBack() {
          txt.textContent = '✓ 已触发返回';
          setTimeout(() => { txt.textContent = '从最左亮条向右拖过 1/3 →'; }, 900);
        },
      });
    },

    'context-menu'(stage) {
      const btn = miniBtn('点我呼出上下文菜单', 'pv-tap-demo');
      btn.onclick = (e) => {
        MK.openMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
            { label: '复制 Prompt', value: 'copy' },
            { label: '收藏资产', value: 'star' },
            { label: '删除', value: 'del', danger: true },
          ],
          onSelect(it) { btn.textContent = `已选：${it.label}`; setTimeout(() => { btn.textContent = '点我呼出上下文菜单'; }, 900); },
        });
      };
      stage.appendChild(btn);
      return () => {};
    },

    'sticky-title'(stage) {
      const sc = document.createElement('div');
      sc.style.cssText = 'width:92%;height:98px;overflow-y:auto;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:#0c1017';
      sc.innerHTML = `<div class="mk-sticky" style="position:sticky;top:0;padding:7px 12px;font-size:12px;font-weight:600;background:#0c1017">吸顶标题（滚我出现发丝线）</div>
        <div style="padding:10px 12px;font-size:11.5px;color:#8b95a5;line-height:2">第 1 行内容<br>第 2 行内容<br>第 3 行内容<br>第 4 行内容</div>`;
      stage.appendChild(sc);
      return () => {};
    },

    /* ==================== 玻璃材质层 ==================== */
    'glass-base'(stage) {
      stage.classList.add('pv-glass-bg');
      const card = document.createElement('div');
      card.className = 'mk-glass';
      card.style.cssText = 'padding:14px 20px;font-size:13px;font-weight:600;color:#fff;--mk-glass-r:18px';
      card.textContent = '1.5px 连续亮棱 + 低模糊高饱和';
      stage.appendChild(card);
      return () => {};
    },

    'refraction'(stage) {
      stage.classList.add('pv-glass-bg', 'pv-glass-stripes');
      const card = document.createElement('div');
      card.className = 'mk-glass';
      card.style.cssText = 'padding:14px 18px;font-size:12.5px;font-weight:600;color:#fff;--mk-glass-r:18px';
      card.textContent = '看边缘条纹的光学折射弯曲';
      stage.appendChild(card);
      const stop = MK.refract(card);
      return stop;
    },

    'glass-tap'(stage) {
      stage.classList.add('pv-glass-bg');
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'mk-glass mk-glass--pill';
      pill.style.cssText = 'border:0;cursor:pointer;padding:11px 22px;font:600 13px/1 inherit;color:#fff;--mk-glass-r:999px';
      pill.textContent = '移入或点按看液态高光';
      stage.appendChild(pill);
      return MK.glass(pill);
    },

    /* ==================== 共享元素转场 ==================== */
    'shared-element'(stage) {
      let open = false;
      const box = document.createElement('div');
      box.style.cssText = 'width:100%;display:flex;justify-content:center;align-items:center';
      const render = () => {
        box.innerHTML = open
          ? `<div class="mk-share pv-share-open" style="--mk-share:pv-hero"><b>详情展开态</b><small>再点缩回卡片</small></div>`
          : `<div class="mk-share pv-share-card" style="--mk-share:pv-hero">点我变形展开 →</div>`;
      };
      render();
      box.onclick = () => {
        MK.startShare(() => {
          open = !open;
          render();
        });
      };
      stage.appendChild(box);
      return () => {};
    },
  };

  window.mountCardPreview = function mountCardPreview(id, stageEl) {
    const fn = PREVIEWS[id];
    if (!fn || !stageEl) return () => {};
    try {
      return fn(stageEl) || (() => {});
    } catch {
      return () => {};
    }
  };
})();
