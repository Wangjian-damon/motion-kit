/**
 * data.js — 数据展示与表格生长三件套：
 *   1. bar-grow       条形/进度生长（scaleX/scaleY 走合成器，不动画 width）
 *   2. cell-flash     实时单元格涨跌脉冲（80ms 亮起 → 650ms 缓退，等宽数字防抖）
 *   3. sparkline-draw 迷你走势线描绘（纯函数算 SVG 路径，零图表库依赖）
 */
import { inView } from './in-view.js';
import { resolveReduced } from './motion-pref.js';

/* ---------- 1. 条形/进度生长 ---------- */

/** 纯函数：归一化到 0..1，非法或非正上限安全返回 0。 */
export function barRatio(value, max = 100) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || !(max > 0)) return 0;
  const r = value / max;
  return r < 0 ? 0 : r > 1 ? 1 : r;
}

/** 纯函数：表格行级联延迟，严格封顶防止长表拖慢扫读。 */
export function barStagger(index, step = 36, cap = 320) {
  if (!Number.isFinite(index) || index <= 0) return 0;
  return Math.min(cap, Math.round(index * step));
}

/**
 * 条形生长控制器。只写 `--mk-bar-p` 与 `--mk-bar-d`，形变交给 CSS scaleX/scaleY。
 * 返回 { update(value, max), replay(), destroy() }。
 */
export function barGrow(el, { value = 0, max = 100, index = 0, step = 36, cap = 320, reduced } = {}) {
  if (!el) return { update() {}, replay() {}, destroy() {} };
  el.classList.add('mk-bar');
  el.style.setProperty('--mk-bar-p', String(barRatio(value, max)));
  el.style.setProperty('--mk-bar-d', `${barStagger(index, step, cap)}ms`);

  let stopView = () => {};
  const trigger = () => {
    el.classList.add('is-in');
    // 入场完成后清掉级联延迟，避免后续数据实时更新时也被 stagger 拖慢
    setTimeout(() => el.style.setProperty('--mk-bar-d', '0ms'), barStagger(index, step, cap) + 520);
  };

  if (resolveReduced(reduced)) {
    el.classList.add('is-in');
  } else {
    stopView = inView(el, trigger, { once: true });
  }

  return {
    update(nextVal, nextMax = max) {
      max = nextMax;
      el.style.setProperty('--mk-bar-d', '0ms');
      el.style.setProperty('--mk-bar-p', String(barRatio(nextVal, max)));
    },
    replay() {
      el.classList.remove('is-in');
      void el.offsetWidth;
      el.classList.add('is-in');
    },
    destroy() {
      stopView();
    },
  };
}

/* ---------- 2. 单元格涨跌脉冲 ---------- */

/** 纯函数：判断数值变化方向。非法数值一律视为 same，不误闪。 */
export function valueDelta(prev, next, eps = 0) {
  if (!Number.isFinite(prev) || !Number.isFinite(next)) return 'same';
  const diff = next - prev;
  if (Math.abs(diff) <= eps) return 'same';
  return diff > 0 ? 'up' : 'down';
}

/**
 * 触发一次涨跌脉冲（80ms 亮起 → 650ms 缓退）。
 * 连续更新时强制重排重播，避免同帧吞掉动画。
 */
export function flashCell(el, dir) {
  if (!el || (dir !== 'up' && dir !== 'down')) return false;
  el.classList.add('mk-cell');
  el.classList.remove('is-up', 'is-down');
  void el.offsetWidth;
  el.classList.add(dir === 'up' ? 'is-up' : 'is-down');
  return true;
}

/* ---------- 3. 迷你走势线描绘 ---------- */

/**
 * 纯函数：把数值数组映射成 SVG 折线与面积路径。
 * 全平数据（max === min）居中画水平线，绝不除零。
 */
export function sparklineGeometry(values, { width = 120, height = 36, pad = 3 } = {}) {
  const nums = Array.isArray(values) ? values.filter((v) => Number.isFinite(v)) : [];
  if (!nums.length || !(width > 0) || !(height > 0)) {
    return { linePath: '', areaPath: '', points: [], min: 0, max: 0, trend: 'same' };
  }
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min;
  const innerW = Math.max(1, width - pad * 2);
  const innerH = Math.max(1, height - pad * 2);
  const n = nums.length;

  const points = nums.map((v, i) => {
    const x = n === 1 ? width / 2 : pad + (i / (n - 1)) * innerW;
    const y = span === 0 ? height / 2 : pad + (1 - (v - min) / span) * innerH;
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), v };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const baseY = Number((height - pad).toFixed(2));
  const areaPath =
    n > 1
      ? `${linePath} L ${points[n - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`
      : '';
  const trend = valueDelta(nums[0], nums[n - 1]);
  return { linePath, areaPath, points, min, max, trend };
}

const SVG_NS = 'http://www.w3.org/2000/svg';
let sparkUid = 0;

/**
 * 迷你走势线控制器：生成轻量 SVG，按真实路径长度写 `--mk-spark-len`，视口内描绘生长。
 */
export function sparkline(el, values, { width = 120, height = 36, pad = 4, reduced } = {}) {
  if (!el || typeof document === 'undefined') return { update() {}, replay() {}, destroy() {} };
  const uid = `mk-sp-${++sparkUid}`;
  let stopView = () => {};

  el.classList.add('mk-spark');

  const render = (vals, animate) => {
    const g = sparklineGeometry(vals, { width, height, pad });
    el.dataset.trend = g.trend;
    el.innerHTML = '';
    if (!g.points.length) return;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('aria-hidden', 'true');

    const defs = document.createElementNS(SVG_NS, 'defs');
    const grad = document.createElementNS(SVG_NS, 'linearGradient');
    grad.setAttribute('id', uid);
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0');
    grad.setAttribute('y2', '1');
    const s1 = document.createElementNS(SVG_NS, 'stop');
    s1.setAttribute('offset', '0%');
    s1.setAttribute('stop-color', 'currentColor');
    s1.setAttribute('stop-opacity', '0.26');
    const s2 = document.createElementNS(SVG_NS, 'stop');
    s2.setAttribute('offset', '100%');
    s2.setAttribute('stop-color', 'currentColor');
    s2.setAttribute('stop-opacity', '0');
    grad.append(s1, s2);
    defs.append(grad);
    svg.append(defs);

    if (g.areaPath) {
      const area = document.createElementNS(SVG_NS, 'path');
      area.setAttribute('d', g.areaPath);
      area.setAttribute('fill', `url(#${uid})`);
      area.setAttribute('class', 'mk-spark__area');
      svg.append(area);
    }

    const line = document.createElementNS(SVG_NS, 'path');
    line.setAttribute('d', g.linePath);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', '1.75');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke-linejoin', 'round');
    line.setAttribute('class', 'mk-spark__line');
    svg.append(line);

    const last = g.points[g.points.length - 1];
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', String(last.x));
    dot.setAttribute('cy', String(last.y));
    dot.setAttribute('r', '2.6');
    dot.setAttribute('fill', 'currentColor');
    dot.setAttribute('class', 'mk-spark__dot');
    svg.append(dot);

    el.append(svg);

    const len = typeof line.getTotalLength === 'function' ? Math.ceil(line.getTotalLength()) : width * 2;
    el.style.setProperty('--mk-spark-len', String(len));

    if (!animate || resolveReduced(reduced)) {
      el.classList.add('is-in');
    } else {
      el.classList.remove('is-in');
      void el.offsetWidth;
      requestAnimationFrame(() => el.classList.add('is-in'));
    }
  };

  render(values, false);
  el.classList.remove('is-in');
  if (resolveReduced(reduced)) {
    el.classList.add('is-in');
  } else {
    stopView = inView(el, () => el.classList.add('is-in'), { once: true });
  }

  return {
    update(nextVals) {
      render(nextVals, true);
    },
    replay() {
      el.classList.remove('is-in');
      void el.offsetWidth;
      requestAnimationFrame(() => el.classList.add('is-in'));
    },
    destroy() {
      stopView();
    },
  };
}
