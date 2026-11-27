// 自测：弹簧数学 + 采样正确性 + token 一致性 + 新原语的纯逻辑
// 运行：node test/run.mjs
import assert from 'node:assert/strict';
import { stepResponse, settleTime, springEasing, springPresets, springKeyframes } from '../src/spring.js';
import { durations, easings, staggerDelay, applyTokens } from '../src/tokens.js';
import { splitTokens } from '../src/core/text-reveal.js';
import { parallaxProgress } from '../src/core/parallax.js';
import { shouldDismiss, shouldGoBack, snapIndexAt, snapShouldClose, offsetForSnap, sheet } from '../src/core/gesture.js';
import { repelOffset } from '../src/core/fun.js';
import { spherePoint } from '../src/core/scene3d.js';
import { dockScale } from '../src/core/dock.js';
import { segIndexAt } from '../src/core/seg.js';
import { scrambleFrame } from '../src/core/scramble.js';
import { glassPoint, edgeWeight, smoothStep, roundedRectSDF, lensField, lingerRemaining } from '../src/core/glass.js';
import { longPress } from '../src/core/tap.js';
import { placeMenu } from '../src/core/context-menu.js';
import { shareName, canShare, startShare } from '../src/core/flip.js';
import { rubberBand, rubberClamp, RUBBER_C } from '../src/core/rubber.js';
import { stackLayout, stackHeight, shouldSwipeToast } from '../src/core/toast-stack.js';
import { nextButtonState, loadingRemaining } from '../src/core/state-button.js';
import { barRatio, barStagger, valueDelta, sparklineGeometry } from '../src/core/data.js';
import { parseCard, validateCard, buildRegistry, renderConsumerCardMarkdown, PRIVATE_ID_RE } from '../scripts/build-registry.mjs';

let pass = 0;
const t = (name, fn) => {
  try {
    fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${e.message}`);
    process.exitCode = 1;
  }
};

console.log('\n弹簧');

t('起点为 0', () => {
  for (const k of Object.keys(springPresets)) {
    assert.ok(Math.abs(stepResponse(k, 0)) < 1e-9, `${k} 起点应为 0`);
  }
});

t('收敛到 1', () => {
  for (const k of Object.keys(springPresets)) {
    const v = stepResponse(k, settleTime(k) + 0.5);
    assert.ok(Math.abs(v - 1) < 0.01, `${k} 应收敛到 1，实际 ${v}`);
  }
});

t('snappy 轻微过冲（≤5%）', () => {
  // snappy 阻尼比 ≈0.70，留一点点回弹手感，但不该像 bouncy 那样明显
  const r = springEasing('snappy');
  assert.ok(r.overshoot > 0, `snappy 应有过冲，实际 ${r.overshoot}`);
  assert.ok(r.overshoot < 0.06, `snappy 过冲应克制，实际 ${r.overshoot}`);
});

t('heavy / smooth 不过冲（过阻尼或临界）', () => {
  for (const k of ['heavy', 'smooth', 'soft']) {
    const r = springEasing(k);
    assert.ok(r.overshoot < 0.005, `${k} 不该过冲，实际 ${r.overshoot}`);
  }
});

t('bouncy 明显过冲', () => {
  const r = springEasing('bouncy');
  assert.ok(r.overshoot > 0.05, `bouncy 应有明显过冲，实际 ${r.overshoot}`);
});

t('缓动首尾锚定在 0 / 1', () => {
  for (const k of Object.keys(springPresets)) {
    const { points } = springEasing(k, 24);
    assert.equal(points[0], 0, `${k} 首点`);
    assert.equal(points[points.length - 1], 1, `${k} 末点`);
  }
});

t('时长落在合理区间 (80–3000ms)', () => {
  for (const k of Object.keys(springPresets)) {
    const { duration } = springEasing(k);
    assert.ok(duration >= 80 && duration <= 3000, `${k} 时长 ${duration}ms 越界`);
  }
});

t('单调递增的采样点数量正确', () => {
  const { points } = springEasing('smooth', 32);
  assert.equal(points.length, 33);
});

t('生成合法 @keyframes 文本', () => {
  const css = springKeyframes('mk-test', 'snappy', { samples: 8 });
  assert.ok(css.startsWith('@keyframes mk-test'));
  assert.ok(css.includes('0%') && css.includes('100%'));
  assert.equal((css.match(/{/g) || []).length, 10); // 9 帧 + 1 个规则体
});

t('未知预设报错', () => {
  assert.throws(() => stepResponse('nope', 0), /未知弹簧配置/);
});

t('自定义数值也能算', () => {
  const v = stepResponse({ stiffness: 500, damping: 40, mass: 1 }, 0.4);
  assert.ok(v > 0.9 && v <= 1.001, `应接近 1，实际 ${v}`);
});

console.log('\nTokens');

t('六档时长严格递增', () => {
  const v = Object.values(durations);
  for (let i = 1; i < v.length; i++) assert.ok(v[i] > v[i - 1], '时长必须递增');
});

t('交互时长上限 ≤ 560ms，环境档单独一档', () => {
  // 1–5 是交互档，必须压在 560ms 内；6 只给跑马灯/极光这类环境类用
  const ui = [1, 2, 3, 4, 5].map((k) => durations[k]);
  assert.ok(Math.max(...ui) <= 560);
  assert.equal(durations[6], 900);
});

t('高频档位 ≤ 300ms', () => {
  assert.ok(durations[1] <= 100 && durations[2] <= 200 && durations[3] <= 300);
});

t('stagger 封顶生效', () => {
  assert.equal(staggerDelay(0), 0);
  assert.equal(staggerDelay(3, 70), 210);
  assert.equal(staggerDelay(50, 70, 600), 600);
});

t('所有缓动是合法 cubic-bezier', () => {
  for (const [k, v] of Object.entries(easings)) {
    assert.match(v, /^cubic-bezier\(/, `${k} 不是 cubic-bezier`);
  }
});

t('overshoot 比 snap 更过冲', () => {
  // snap 的 y1=1.56，overshoot 的 y1=1.8；后者回弹更明显
  const y = (s) => Number(s.match(/^cubic-bezier\(([^)]*)\)/)[1].split(',')[1]);
  assert.ok(y(easings.overshoot) > y(easings.snap));
});

t('无 DOM 环境下 applyTokens 安全返回 false', () => {
  assert.equal(applyTokens(null), false);
});

console.log('\n文本拆分');

t('中文按字切，不会被当成一个词', () => {
  const parts = splitTokens('好的动效', 'word');
  assert.deepEqual(parts, ['好', '的', '动', '效']);
});

t('英文按词切，空白原样保留', () => {
  const parts = splitTokens('good motion kit', 'word');
  assert.deepEqual(parts, ['good', ' ', 'motion', ' ', 'kit']);
});

t('中英混排各自成片', () => {
  const parts = splitTokens('用 Vue3 做动效', 'word');
  assert.deepEqual(parts, ['用', ' ', 'Vue3', ' ', '做', '动', '效']);
});

t('char 模式逐字符', () => {
  assert.deepEqual(splitTokens('ab 中', 'char'), ['a', 'b', ' ', '中']);
});

t('标点跟随前一个词，不单独一段', () => {
  const parts = splitTokens('好了。', 'word');
  assert.deepEqual(parts, ['好', '了。']);
});

console.log('\n视差');

t('元素居中时进度为 0', () => {
  assert.equal(parallaxProgress(400, 800), 0);
});

t('元素在上方时为正、下方为负（反方向位移）', () => {
  assert.ok(parallaxProgress(0, 800) > 0, '上方应为正');
  assert.ok(parallaxProgress(800, 800) < 0, '下方应为负');
});

t('进度钳制在 ±1.5', () => {
  assert.equal(parallaxProgress(-100000, 800), 1.5);
  assert.equal(parallaxProgress(100000, 800), -1.5);
});

t('strength 线性放大', () => {
  const a = parallaxProgress(600, 800, 1);
  const b = parallaxProgress(600, 800, 2);
  assert.ok(Math.abs(b - a * 2) < 1e-9);
});

t('零视口高度不产生 NaN', () => {
  assert.equal(parallaxProgress(100, 0), 0);
});

console.log('\n手势');

t('往下拖过 28% 高度算收起', () => {
  assert.equal(shouldDismiss(200, 600, 0), true);   // 33% > 28%
  assert.equal(shouldDismiss(100, 600, 0), false);  // 17% < 28%
});

t('往上拖永不收起', () => {
  assert.equal(shouldDismiss(-300, 600, 0), false);
  assert.equal(shouldDismiss(0, 600, 0), false);
});

t('慢拖没到阈值，但甩得够快也算收起', () => {
  // 80/600 = 13% 不够，但 0.8px/ms 是一次明确的甩动
  assert.equal(shouldDismiss(80, 600, 0.8), true);
  assert.equal(shouldDismiss(80, 600, 0.2), false);
});

console.log('\n多档位吸附');

const SNAPS = [0.35, 0.62, 1];
const H = 600;

t('offsetForSnap：可见比例到位移', () => {
  assert.equal(offsetForSnap(1, H), 0);        // 全开 = 无位移
  assert.equal(offsetForSnap(0.35, H), 390);   // 只露 35% = 往下推 65%
  assert.equal(offsetForSnap(0, H), H);        // 完全不可见 = 推到底
  assert.equal(offsetForSnap(2, H), 0);        // 越界钳到 1 —— 不会产出负位移
  assert.equal(offsetForSnap(-1, H), H);       // 负数钳到 0
});

t('snapIndexAt：慢放时落到最近的档', () => {
  // 三档的位移分别是 390 / 228 / 0
  assert.equal(snapIndexAt(390, H, SNAPS), 0);   // 正好最低档
  assert.equal(snapIndexAt(228, H, SNAPS), 1);   // 正好中档
  assert.equal(snapIndexAt(0, H, SNAPS), 2);     // 正好全开
  assert.equal(snapIndexAt(300, H, SNAPS), 1);   // 300 距 228 更近
  assert.equal(snapIndexAt(60, H, SNAPS), 2);    // 60 距 0 更近
});

t('snapIndexAt：速度把落点往前投影，能跨档', () => {
  // 0.9px/ms × 160ms = +144px：390 → 534，离 600 比离 390 近
  assert.equal(snapIndexAt(390, H, SNAPS, 0.9), 3);
  // 同一起点、慢放：留在最低档，不会自己关掉
  assert.equal(snapIndexAt(390, H, SNAPS, 0), 0);
  // 反方向（往上）甩会让落点上移：228 − 0.8×160 = 100，落在全开档附近
  assert.equal(snapIndexAt(228, H, SNAPS, -0.8), 2);
  // 小幅上甩不够跨档：228 − 0.2×160 = 196，仍距 228 更近
  assert.equal(snapIndexAt(228, H, SNAPS, -0.2), 1);
});

t('snapIndexAt：投影被钳在 0..height 内', () => {
  // 往上狂甩不会算出负的落点（钳到 0 → 全开档）
  assert.equal(snapIndexAt(0, H, SNAPS, -9), 2);
  // 往下狂甩不会越过"关闭"
  assert.equal(snapIndexAt(390, H, SNAPS, 9), 3);
});

t('snapShouldClose：在最低档往下甩一把就关', () => {
  // 关键设计点：最低档到关闭档隔着整整 65% 面板高度，
  // 光靠"投影后更近"要甩到 0.66px/ms 才算跨过中点。
  // 但 iOS 上"在最低档轻甩一下就走"是肌肉记忆，所以单独判一条。
  assert.equal(snapShouldClose(390, H, SNAPS, 0), false);        // 停在最低档
  assert.equal(snapShouldClose(390, H, SNAPS, 0.6), true);       // 甩一把 → 关
  assert.equal(snapShouldClose(228, H, SNAPS, 0.6), false);      // 不在最低档，不关
  assert.equal(snapShouldClose(560, H, SNAPS, 0), true);         // 拖得够远
  assert.equal(snapShouldClose(560, H, SNAPS, 0, { dismissible: false }), false);
});

t('snapIndexAt：dismissible=false 时没有关闭档', () => {
  // 本来会落进"关闭"的那一下，改成留在最低档
  assert.equal(snapIndexAt(500, H, SNAPS, 0.5, { dismissible: false }), 0);
  assert.equal(snapIndexAt(560, H, SNAPS, 0, { dismissible: false }), 0);
});

t('snapIndexAt：高度或档位为空时不抛错', () => {
  assert.equal(snapIndexAt(100, 0, SNAPS), 0);
  assert.equal(snapIndexAt(100, H, []), 0);
  assert.equal(snapIndexAt(100, H, null), 0);
});

t('sheet()：档位数组乱序也会被排好', async () => {
  const { sheet } = await import('../src/core/gesture.js');
  const el = stubEl();
  el.offsetHeight = 600;
  el.querySelector = () => null;
  el.style = { setProperty() {} };
  const s = sheet(el, { snapPoints: [1, 0.35, 0.62], snap: 1 });
  // 排序后 [0.35, 0.62, 1]，第 1 档 = 0.62
  assert.equal(s.snapIndex, 1);
  assert.equal(s.snapVisible, 0.62);
  s.destroy();
});

console.log('\n上下文菜单');

const BOUNDS = { left: 0, top: 0, right: 390, bottom: 844 };

t('placeMenu：右下放得下就放右下', () => {
  const r = placeMenu(100, 200, 200, 160, { bounds: BOUNDS });
  assert.equal(r.x, 106);            // 100 + gap 6
  assert.equal(r.y, 206);            // 200 + gap 6
  assert.equal(r.ox, 0);             // 指尖在菜单左上角之外 → 钳到 0
  assert.equal(r.oy, 0);
});

t('placeMenu：右边放不下就翻到左侧，origin 变成 1', () => {
  const r = placeMenu(300, 200, 200, 160, { bounds: BOUNDS });
  // 300 + 6 + 200 = 506 > 382，翻到左边：300 - 6 - 200 = 94
  assert.equal(r.x, 94);
  assert.ok(r.ox > 0.9, `ox 应接近 1，实际 ${r.ox}`);
});

t('placeMenu：下边放不下就翻到上方', () => {
  const r = placeMenu(100, 800, 200, 160, { bounds: BOUNDS });
  // 800 + 6 + 160 = 966 > 836，翻到上方：800 - 6 - 160 = 634
  assert.equal(r.y, 634);
  assert.ok(r.oy > 0.9, `oy 应接近 1，实际 ${r.oy}`);
});

t('placeMenu：两个方向可以同时翻', () => {
  const r = placeMenu(360, 820, 200, 160, { bounds: BOUNDS });
  assert.equal(r.x, 154);            // 360 - gap6 - 200
  assert.equal(r.y, 654);            // 820 - gap6 - 160
  // 翻完还要装得进 bounds，否则会出界
  assert.ok(r.x + 200 <= 382 && r.y + 160 <= 836);
});

t('placeMenu：菜单比可用空间还大时贴边，不出界', () => {
  const r = placeMenu(200, 400, 500, 900, { bounds: BOUNDS });
  assert.equal(r.x, 8);              // 贴 pad
  assert.equal(r.y, 8);
});

t('placeMenu：bounds 原点不是 0 时一并偏移', () => {
  // 设备框在页面里偏移了 (40, 60)，大小 390×844
  const r = placeMenu(60, 80, 200, 160, { bounds: { left: 40, top: 60, right: 430, bottom: 904 } });
  assert.equal(r.x, 66);
  assert.equal(r.y, 86);
});

t('placeMenu：零尺寸不抛错', () => {
  const r = placeMenu(10, 10, 0, 0);
  assert.equal(r.ox, 0);
  assert.equal(r.oy, 0);
});

t('placeMenu：纯函数，同样输入同样输出', () => {
  assert.deepEqual(placeMenu(120, 300, 200, 160, { bounds: BOUNDS }), placeMenu(120, 300, 200, 160, { bounds: BOUNDS }));
});

console.log('\n趣味层');

t('磁吸斥力：半径外与零距离都为零', () => {
  assert.deepEqual(repelOffset(100, 0, 90, 16), { x: 0, y: 0 });
  assert.deepEqual(repelOffset(0, 0, 90, 16), { x: 0, y: 0 });
});

t('磁吸斥力：方向背离指针', () => {
  assert.ok(repelOffset(30, 0, 90, 16).x > 0);
  assert.ok(repelOffset(-30, 0, 90, 16).x < 0);
  assert.ok(repelOffset(0, 30, 90, 16).y > 0);
});

t('磁吸斥力：越近推得越远，且不超过 max', () => {
  const near = repelOffset(10, 0, 90, 16);
  const mid = repelOffset(50, 0, 90, 16);
  assert.ok(Math.hypot(near.x, near.y) > Math.hypot(mid.x, mid.y));
  for (const d of [1, 5, 20, 60, 89]) {
    const m = Math.hypot(...Object.values(repelOffset(d, 0, 90, 16)));
    assert.ok(m <= 16 + 1e-9, `d=${d} 位移不应超过 max，实际 ${m}`);
  }
});

t('磁吸斥力：边缘处连续归零，不会突然断', () => {
  const m = Math.hypot(...Object.values(repelOffset(89.99, 0, 90, 16)));
  assert.ok(m < 0.01, `边缘位移应趋近 0，实际 ${m}`);
});

t('磁吸斥力：纯函数，同样输入同样输出', () => {
  assert.deepEqual(repelOffset(37, -12, 90, 16), repelOffset(37, -12, 90, 16));
});

console.log('\n3D');

t('球面点：纬度落在 ±90 内，两端正好到极点', () => {
  const a = spherePoint(0, 150);
  const z = spherePoint(149, 150);
  assert.ok(Math.abs(Math.abs(a.lat) - 90) < 1e-6, `首点应在极点，实际 ${a.lat}`);
  assert.ok(Math.abs(Math.abs(z.lat) - 90) < 1e-6, `末点应在极点，实际 ${z.lat}`);
  for (let i = 0; i < 150; i++) {
    const { lat } = spherePoint(i, 150);
    assert.ok(lat >= -90 && lat <= 90, `lat 越界 ${lat}`);
  }
});

t('球面点：经度落在 ±180 内', () => {
  for (let i = 0; i < 150; i++) {
    const { lon } = spherePoint(i, 150);
    assert.ok(lon >= -180 && lon <= 180, `lon 越界 ${lon}`);
  }
});

t('球面点：全部落在单位球面上', () => {
  // 把 lat/lon 还原成 xyz，模长必须是 1 —— 差一点，CSS 里就会看见点不在球上
  for (let i = 0; i < 150; i++) {
    const { lat, lon } = spherePoint(i, 150);
    const la = (lat * Math.PI) / 180;
    const lo = (lon * Math.PI) / 180;
    // CSS 的变换顺序是 rotateY(lon) → rotateX(lat) → translateZ(1)
    const x = Math.cos(la) * Math.sin(lo);
    const y = Math.sin(la);
    const z = Math.cos(la) * Math.cos(lo);
    const m = Math.hypot(x, y, z);
    assert.ok(Math.abs(m - 1) < 1e-6, `第 ${i} 点模长 ${m}`);
  }
});

t('球面点：相邻点绕轴均匀推进（黄金角）', () => {
  // 经度是环形的：359° 和 1° 只差 2°，所以要先取环绕距离再断言
  const circ = (a, b) => {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  };
  for (let i = 0; i < 30; i++) {
    const d = circ(spherePoint(i, 150).lon, spherePoint(i + 1, 150).lon);
    assert.ok(d > 100 && d < 175, `第 ${i}→${i + 1} 点经度差应接近 137.5°，实际 ${d}`);
  }
});

t('球面点：只有 1 个点时不出 NaN', () => {
  const p = spherePoint(0, 1);
  assert.ok(Number.isFinite(p.lat) && Number.isFinite(p.lon));
});

t('球面点：纯函数，同样输入同样输出', () => {
  assert.deepEqual(spherePoint(42, 150), spherePoint(42, 150));
});

console.log('\n停靠栏放大');

t('dockScale：中心最大、边缘归零', () => {
  assert.equal(dockScale(0, 110, 0.55), 0.55);
  assert.equal(dockScale(110, 110, 0.55), 0);
  assert.equal(dockScale(-110, 110, 0.55), 0);
});

t('dockScale：对称，左右同距同值', () => {
  for (const dx of [12, 40, 77, 109]) {
    assert.equal(dockScale(dx, 110, 0.55), dockScale(-dx, 110, 0.55));
  }
});

t('dockScale：单调递减', () => {
  let prev = Infinity;
  for (let dx = 0; dx <= 110; dx += 5) {
    const v = dockScale(dx, 110, 0.55);
    assert.ok(v <= prev + 1e-12, `${dx}px 处应不大于更近处`);
    prev = v;
  }
});

t('dockScale：平方衰减，边界导数趋零（不会折一下）', () => {
  // 线性衰减在边界附近还有斜率，眼睛看得出顿挫；平方的斜率线性趋零
  const near = dockScale(100, 110, 1);
  const far = dockScale(109, 110, 1);
  assert.ok(near > far, '近处应大于远处');
  assert.ok(far < 0.002, `边界处应贴近 0，实际 ${far}`);
  // 中点应该正好是 amp 的 1/4（t=0.5 时的 t²）
  assert.ok(Math.abs(dockScale(55, 110, 1) - 0.25) < 1e-12);
});

t('dockScale：半径为 0 时不除零', () => {
  assert.equal(dockScale(0, 0, 0.55), 0);
});

console.log('\n分段控件');

t('segIndexAt：两端与中间', () => {
  assert.equal(segIndexAt(0, 300, 3), 0);
  assert.equal(segIndexAt(150, 300, 3), 1);
  assert.equal(segIndexAt(300, 300, 3), 2);
});

t('segIndexAt：越界夹住，不返回负数或越界格', () => {
  assert.equal(segIndexAt(-80, 300, 3), 0);
  assert.equal(segIndexAt(999, 300, 3), 2);
});

t('segIndexAt：取最近的格，不向下取整', () => {
  // 5 格、宽 400：格宽 100。指向 60 应落在 1（60 离 100 比离 0 近）
  assert.equal(segIndexAt(60, 400, 5), 1);
  assert.equal(segIndexAt(40, 400, 5), 0);
});

t('segIndexAt：非法输入不抛错', () => {
  assert.equal(segIndexAt(10, 0, 3), 0);
  assert.equal(segIndexAt(10, 300, 1), 0);
});

console.log('\n乱序解码');

t('scrambleFrame：进度 1 时完全还原', () => {
  const text = 'Motion Kit · 42 项';
  assert.equal(scrambleFrame(text, 1, 3), text);
});

t('scrambleFrame：长度始终等于原文（不会把布局推来推去）', () => {
  const text = 'abcdefghij 12345';
  for (let p = 0; p <= 1; p += 0.05) {
    assert.equal([...scrambleFrame(text, p, 9)].length, [...text].length, `p=${p} 长度变了`);
  }
});

t('scrambleFrame：开头全是乱码，空格保留', () => {
  const out = scrambleFrame('ABCD EFGH', 0, 1);
  assert.equal(out[4], ' ', '空格必须原样保留');
  const letters = [...out].filter((c) => c !== ' ');
  // p=0 时还没有任何字符定格（最早 0.35），所以不该出现原文的 B/C/D
  assert.ok(!letters.includes('B'), `开头不该已经出现原文，实际 ${out}`);
});

t('scrambleFrame：同种子同输出，不同种子不同输出', () => {
  const a = scrambleFrame('HELLO WORLD', 0.1, 5);
  const b = scrambleFrame('HELLO WORLD', 0.1, 5);
  const c = scrambleFrame('HELLO WORLD', 0.1, 6);
  assert.equal(a, b);
  assert.notEqual(a, c);
});

t('scrambleFrame：从左到右依次定格', () => {
  // 进度 0.5 时，左侧应该有几个字符已经是原文，右侧没有
  const text = 'ABCDEFGHIJKLMNOP';
  const out = scrambleFrame(text, 0.5, 2);
  const left = out.slice(0, 3);
  assert.equal(left, text.slice(0, 3), `左侧应已定格，实际 ${left}`);
});

t('scrambleFrame：空串不抛错', () => {
  assert.equal(scrambleFrame('', 0.5, 0), '');
});

t('scrambleFrame：CJK 按码点切，不切半个字', () => {
  const text = '动效设计';
  const out = scrambleFrame(text, 1, 0);
  assert.equal(out, text);
  assert.equal([...scrambleFrame(text, 0.2, 0)].length, 4);
});


console.log('\n玻璃层');

t('glassPoint：正中 → 高光在中心', () => {
  const p = glassPoint(50, 50, 100, 100);
  assert.equal(p.x, 50);
  assert.equal(p.y, 50);
});

t('glassPoint：depth 压缩，不贴死边界', () => {
  for (const [px, py] of [[0, 0], [100, 100], [-40, 999]]) {
    const p = glassPoint(px, py, 100, 100, { depth: 0.62 });
    assert.ok(p.x > 18 && p.x < 82, `x 越界 ${p.x}`);
    assert.ok(p.y > 18 && p.y < 82, `y 越界 ${p.y}`);
  }
});

t('glassPoint：depth=1 才允许贴边，depth=0 完全不跟', () => {
  const full = glassPoint(0, 100, 100, 100, { depth: 1 });
  assert.equal(full.x, 0);
  assert.equal(full.y, 100);
  const none = glassPoint(0, 100, 100, 100, { depth: 0 });
  assert.equal(none.x, 50);
  assert.equal(none.y, 50);
});

t('glassPoint：零尺寸不除零', () => {
  assert.deepEqual(glassPoint(10, 10, 0, 0), { x: 50, y: 50 });
});

t('glassPoint：左右对称', () => {
  const a = glassPoint(20, 50, 100, 100);
  const b = glassPoint(80, 50, 100, 100);
  assert.ok(Math.abs((a.x - 50) + (b.x - 50)) < 1e-9);
});

t('lingerRemaining：从按下起算，不从松手起算', () => {
  // 快速点击（按住 80ms）还要再等 440ms —— 按压关键帧才播得完整
  assert.equal(lingerRemaining(80, 520), 440);
  // 按得够久（900ms）就不用再等
  assert.equal(lingerRemaining(900, 520), 0);
  // 正好按满
  assert.equal(lingerRemaining(520, 520), 0);
});

t('lingerRemaining：负数 / 缺参数 / linger=0 都不产出负的定时器', () => {
  assert.equal(lingerRemaining(-50, 520), 520);   // 时钟回拨也不等负的
  assert.equal(lingerRemaining(undefined, 520), 520);
  assert.equal(lingerRemaining(80, 0), 0);        // 关掉停留 → 立刻散
  assert.equal(lingerRemaining(80, -10), 0);
});

t('edgeWeight：贴边为 1，band 外为 0', () => {
  assert.equal(edgeWeight(0, 16), 1);
  assert.equal(edgeWeight(16, 16), 0);
  assert.equal(edgeWeight(40, 16), 0);
});

t('edgeWeight：平滑，中点约 0.5 且单调', () => {
  assert.ok(Math.abs(edgeWeight(8, 16) - 0.5) < 1e-6);
  let prev = 1.1;
  for (let d = 0; d <= 16; d += 2) {
    const v = edgeWeight(d, 16);
    assert.ok(v <= prev, `d=${d} 不单调`);
    prev = v;
  }
});

t('edgeWeight：band=0 时安全返回 0', () => {
  assert.equal(edgeWeight(5, 0), 0);
});

/* 折射的数学来自 shuding/liquid-glass（MIT © 2025 Shu Ding）。
   这里测的不是"原样没改"，而是它在我们这边必须成立的三件事：
   向内折、格式对、分辨率换了力道不变。 */

t('smoothStep：两端夹住，中点 0.5', () => {
  assert.equal(smoothStep(0, 1, -3), 0);
  assert.equal(smoothStep(0, 1, 4), 1);
  assert.ok(Math.abs(smoothStep(0, 1, 0.5) - 0.5) < 1e-12);
  // 反向区间（a > b）是单调不增的：值从 1 落到 0，不是从 0 升到 1
  let prev = 1.1;
  for (let i = 0; i <= 20; i++) {
    const v = smoothStep(0.8, 0, i / 20);
    assert.ok(v <= prev + 1e-12, `i=${i} 反向区间不单调`);
    prev = v;
  }
});

t('smoothStep：反向区间（a>b）方向不翻', () => {
  assert.ok(smoothStep(0.8, 0, 0) > 0.99);
  assert.ok(smoothStep(0.8, 0, 0.8) < 0.01);
});

t('roundedRectSDF：内部为负、边界 0、外部为正', () => {
  assert.ok(roundedRectSDF(0, 0, 50, 50, 10) < 0);
  assert.equal(roundedRectSDF(50, 0, 50, 50, 10), 0); // 右边中点正好在边界上
  assert.equal(roundedRectSDF(60, 0, 50, 50, 10), 10); // 出了 10px 就是 10
});

t('roundedRectSDF：四象限对称，直边处与圆角处一致', () => {
  for (const [x, y] of [[12, 7], [40, 30], [3, 44]]) {
    const a = roundedRectSDF(x, y, 50, 50, 10);
    assert.ok(Math.abs(roundedRectSDF(-x, y, 50, 50, 10) - a) < 1e-12);
    assert.ok(Math.abs(roundedRectSDF(x, -y, 50, 50, 10) - a) < 1e-12);
    assert.ok(Math.abs(roundedRectSDF(-x, -y, 50, 50, 10) - a) < 1e-12);
  }
});

t('lensField：退化尺寸返回 null，不产出空图', () => {
  assert.equal(lensField(0, 100), null);
  assert.equal(lensField(100, -5), null);
  assert.equal(lensField(100, 100, { strength: 0 }), null);
});

t('lensField：位移一律朝内 —— 这是"折射"和"推挤"的分界', () => {
  const f = lensField(100, 100, { radius: 0 });
  const at = (i, j, ch) => f.data[(j * f.width + i) * 4 + ch];
  const mid = Math.floor(f.width / 2);
  // R 通道：左边界取 +max（往右取样，即往内），右边界取 0（即 -max，往左取样）
  assert.equal(at(0, mid, 0), 255);
  assert.equal(at(f.width - 1, mid, 0), 0);
  // G 通道：上 +max，下 -max
  assert.equal(at(mid, 0, 1), 255);
  assert.equal(at(mid, f.height - 1, 1), 0);
  // 正中心不动（128 是 feDisplacementMap 的"零"）
  assert.equal(at(mid, mid, 0), 128);
  assert.equal(at(mid, mid, 1), 128);
});

t('lensField：R/G 存位移、B 空、A 全不透明', () => {
  const f = lensField(80, 50, { radius: 12 });
  assert.equal(f.data.length, f.width * f.height * 4);
  for (let i = 0; i < 40; i++) {
    assert.equal(f.data[i * 4 + 2], 0);
    assert.equal(f.data[i * 4 + 3], 255);
  }
});

t('lensField：scale 与 strength 成正比（feDisplacementMap 只有一个 scale）', () => {
  const a = lensField(120, 80, { radius: 16, strength: 0.2 }).scale;
  const b = lensField(120, 80, { radius: 16, strength: 0.4 }).scale;
  assert.ok(Math.abs(b / a - 2) < 0.02, `期望 2 倍，实际 ${b / a}`);
});

t('lensField：降采样后力道基本不变（偏移按 CSS px 算，不按采样像素）', () => {
  const fine = lensField(350, 120, { radius: 26, samples: 168 });
  const coarse = lensField(350, 120, { radius: 26, samples: 24 });
  assert.ok(coarse.width < fine.width / 3, '粗采样应该真的小很多');
  assert.ok(coarse.scale > fine.scale * 0.85, `粗采样掉了太多：${coarse.scale} vs ${fine.scale}`);
});

t('lensField：长边被压在采样上限内', () => {
  const f = lensField(1200, 300, { samples: 168 });
  assert.ok(Math.max(f.width, f.height) <= 172, `长边 ${Math.max(f.width, f.height)} 超出上限`);
});

t('lensField：圆角超过半短边时钳制，不抛错', () => {
  const f = lensField(100, 100, { radius: 999 });
  assert.ok(f && f.width >= 8 && f.height >= 8 && f.scale > 0);
});

t('lensField：极扁的条也能出图', () => {
  const f = lensField(300, 2, { radius: 1 });
  assert.ok(f && f.scale > 0);
});

console.log('\n边缘返回');

t('shouldGoBack：往左拖一律不算', () => {
  assert.equal(shouldGoBack(-200, 390, 2), false);
});

t('shouldGoBack：过 1/3 宽算返回', () => {
  assert.equal(shouldGoBack(140, 390, 0), true);
  assert.equal(shouldGoBack(120, 390, 0), false);
});

t('shouldGoBack：甩得够快也算，方向必须是右', () => {
  assert.equal(shouldGoBack(40, 390, 0.6), true);
  assert.equal(shouldGoBack(40, 390, -0.6), false);
});

t('shouldGoBack：宽度为 0 不误判', () => {
  assert.equal(shouldGoBack(500, 0, 99), false);
});

// ---- 长按（Node 原生 EventTarget 桩；click 拦截在 document 捕获阶段）----

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stubEl = () => {
  const el = new EventTarget();
  el.classList = { add() {}, remove() {} };
  return el;
};

const lp = { firedOnce: false, suppressed: false, shortTapClick: false, windowExpires: false };

// 场景 1：按住 40ms（> 10ms 触发线）→ 触发一次，随后的 click 被拦
{
  const doc = new EventTarget();
  globalThis.document = doc;
  const el = stubEl();
  let fired = 0;
  let clicks = 0;
  longPress(el, () => fired++, { delay: 10, suppressClickFor: 200 });
  // 业务 click 挂在 doc 上（Node 桩没有祖先链，用注册顺序模拟
  // "拦截器先于业务 handler"这个真实约束）
  doc.addEventListener('click', () => clicks++);
  el.dispatchEvent(new Event('pointerdown'));
  await sleep(40);
  lp.firedOnce = fired === 1;
  const click = new Event('click', { cancelable: true });
  doc.dispatchEvent(click);
  lp.suppressed = click.defaultPrevented && clicks === 0 && fired === 1;
}

// 场景 2：短按 → 不触发，click 畅通
{
  const doc = new EventTarget();
  globalThis.document = doc;
  const el = stubEl();
  let fired = 0;
  let clicks = 0;
  longPress(el, () => fired++, { delay: 500, suppressClickFor: 200 });
  doc.addEventListener('click', () => clicks++);
  el.dispatchEvent(new Event('pointerdown'));
  await sleep(30);
  el.dispatchEvent(new Event('pointerup'));
  doc.dispatchEvent(new Event('click'));
  lp.shortTapClick = fired === 0 && clicks === 1;
}

// 场景 3：拦截窗口过期后，click 不再被拦
{
  const doc = new EventTarget();
  globalThis.document = doc;
  const el = stubEl();
  let clicks = 0;
  longPress(el, () => {}, { delay: 10, suppressClickFor: 40 });
  doc.addEventListener('click', () => clicks++);
  el.dispatchEvent(new Event('pointerdown'));
  await sleep(100);           // 触发（10ms）+ 窗口过期（40ms）
  doc.dispatchEvent(new Event('click'));
  assert.equal(clicks, 1, '窗口过期后第一次 click 应畅通');
  lp.windowExpires = clicks === 1;
}

delete globalThis.document;

t('longPress：到点触发一次', () => assert.ok(lp.firedOnce));
t('longPress：触发后的 click 被拦（document 捕获 + preventDefault）', () => assert.ok(lp.suppressed));
t('longPress：短按的 click 畅通', () => assert.ok(lp.shortTapClick));
t('longPress：拦截窗口过期后 click 畅通', () => assert.ok(lp.windowExpires));

console.log('\n共享元素转场');

// 名字合法与否是"过渡到底跑不跑"的唯一开关，也是唯一会**静默**失败的地方，
// 所以 shareName 单拎出来钉：合法标识符 + 同种子同名 + 异种子不撞名。
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_-]*$/;

t('shareName：输出永远是合法标识符', () => {
  for (const seed of [0, 7, 12, 'a b', '1hero', 'mk-s0', '*', '', '中文', '拍立得', '🎉', '-x-', '--']) {
    const n = shareName(seed);
    assert.match(n, NAME_RE, `种子 ${JSON.stringify(seed)} 生成了非法名字 ${n}`);
  }
});

t('shareName：同种子同名字（可重复渲染）', () => {
  for (const seed of [0, 'shot-3', '中文', '']) {
    assert.equal(shareName(seed), shareName(seed), `种子 ${JSON.stringify(seed)} 不稳定`);
  }
});

t('shareName：不同种子不撞名（撞名 = InvalidStateError）', () => {
  // 这些都是实测会被判成 none 的种子 —— 最容易被"统统退回同一个占位符"害到
  const seeds = ['*', '', '中文', '拍立得', '🎉', '-x-', '--', '!!!', '@@@', '/'];
  const names = new Map();
  for (const seed of seeds) {
    const n = shareName(seed);
    assert.ok(
      !names.has(n),
      `${JSON.stringify(seed)} 与 ${JSON.stringify(names.get(n))} 撞成 ${n}`,
    );
    names.set(n, seed);
  }
});

t('shareName：数字种子与同值字符串同名字', () => {
  assert.equal(shareName(3), shareName('3'));
});

t('shareName：自定义前缀生效', () => {
  assert.equal(shareName('a', 'hero'), 'hero-a');
});

t('shareName：缺种子时不抛、不产生非法字符', () => {
  // 指令层已经拦了 name == null；这里只保证兜底路径安全
  for (const v of [null, undefined, '']) assert.match(shareName(v), NAME_RE);
});

t('canShare：Node 里安全返回 false', () => {
  assert.equal(canShare(), false);
});

t('startShare：不支持 VT 时直接跑回调并 resolve', async () => {
  globalThis.document = new EventTarget();
  let ran = 0;
  const r = await startShare(() => { ran++; });
  delete globalThis.document;
  assert.equal(ran, 1, '降级是"没有过渡"，不是"没有更新"');
  assert.equal(r, null);
});

t('startShare：reduced=true 跳过过渡但仍跑回调', async () => {
  globalThis.document = new EventTarget();
  globalThis.document.documentElement = {
    classList: { add() {}, remove() {} },
    style: { setProperty() {}, removeProperty() {} },
  };
  let ran = 0;
  await startShare(() => { ran++; }, { reduced: true });
  delete globalThis.document;
  assert.equal(ran, 1);
});

console.log('\n橡胶越界阻尼');

t('rubberBand：零位移与退化尺寸返回 0', () => {
  assert.equal(rubberBand(0, 300), 0);
  assert.equal(rubberBand(50, 0), 0);
  assert.equal(rubberBand(50, -10), 0);
  assert.equal(rubberBand(NaN, 300), 0);
});

t('rubberBand：奇函数对称、单调递增且严格小于渐近上限 dim', () => {
  assert.equal(rubberBand(-80, 300), -rubberBand(80, 300));
  const a = rubberBand(20, 300);
  const b = rubberBand(100, 300);
  const big = rubberBand(1e6, 300);
  assert.ok(a > 0 && b > a && big < 300);
  // 起点斜率趋近 RUBBER_C (0.55)
  const slope = rubberBand(0.001, 300) / 0.001;
  assert.ok(Math.abs(slope - RUBBER_C) < 1e-4, `起点斜率应为 ${RUBBER_C}，实际 ${slope}`);
});

t('rubberClamp：界内原样返回、界外阻尼、min>max 安全回落', () => {
  assert.equal(rubberClamp(-50, -200, 0, 300), -50);
  assert.ok(rubberClamp(40, -200, 0, 300) > 0 && rubberClamp(40, -200, 0, 300) < 40);
  assert.ok(rubberClamp(-260, -200, 0, 300) < -200 && rubberClamp(-260, -200, 0, 300) > -260);
  assert.equal(rubberClamp(0, 0, -50, 300), 0);
});

console.log('\n堆叠轻提示');

t('stackLayout：收起态露出 14px 边、逐级缩 5%、超出 visible 隐藏', () => {
  const geo = stackLayout([60, 60, 60, 60], { expanded: false, visible: 3, gap: 14, scaleStep: 0.05 });
  assert.equal(geo[0].y, 0);
  assert.equal(geo[0].scale, 1);
  assert.equal(geo[0].front, true);
  assert.equal(geo[1].y, -14);
  assert.equal(geo[1].scale, 0.95);
  assert.equal(geo[2].y, -28);
  assert.equal(geo[2].scale, 0.9);
  assert.equal(geo[3].opacity, 0);
});

t('stackLayout：后排更高时 clip 裁掉多余顶部，展开态全部不裁切且按真实高度累加', () => {
  const collapsed = stackLayout([50, 90], { expanded: false });
  assert.equal(collapsed[0].clip, 0);
  assert.equal(collapsed[1].clip, 40);
  const expanded = stackLayout([50, 90, 60], { expanded: true, gap: 14 });
  assert.equal(expanded[0].y, 0);
  assert.equal(expanded[1].y, -(50 + 14));
  assert.equal(expanded[2].y, -(50 + 90 + 28));
  assert.ok(expanded.every((g) => g.scale === 1 && g.clip === 0));
});

t('stackHeight：收起与展开高度准确', () => {
  assert.equal(stackHeight([50, 90, 60], { expanded: false, visible: 3, gap: 14 }), 50 + 28);
  assert.equal(stackHeight([50, 90, 60], { expanded: true, visible: 3, gap: 14 }), 50 + 90 + 60 + 28);
  assert.equal(stackHeight([]), 0);
});

t('shouldSwipeToast：距离阈值或平均速度任一满足即判定甩走', () => {
  assert.equal(shouldSwipeToast(50, 1000), true);
  assert.equal(shouldSwipeToast(-50, 1000), true);
  assert.equal(shouldSwipeToast(25, 120), true);   // 均速 0.208 > 0.11
  assert.equal(shouldSwipeToast(25, 600), false);  // 慢拖不到 45px
  assert.equal(shouldSwipeToast(0, 100), false);
});

console.log('\n态变按钮');

t('nextButtonState：合法迁移与防重复提交', () => {
  assert.equal(nextButtonState('idle', 'submit'), 'loading');
  assert.equal(nextButtonState('loading', 'submit'), 'loading');
  assert.equal(nextButtonState('success', 'submit'), 'success'); // 防重复提交
  assert.equal(nextButtonState('error', 'submit'), 'loading');   // 失败态点一下重试
  assert.equal(nextButtonState('loading', 'resolve'), 'success');
  assert.equal(nextButtonState('loading', 'reject'), 'error');
  assert.equal(nextButtonState('success', 'reset'), 'idle');
  assert.equal(nextButtonState('error', 'reset'), 'idle');
  assert.equal(nextButtonState('loading', 'reset'), 'loading');  // 加载中不能被 reset 打断
});

t('loadingRemaining：不足 400ms 补足余量，超过或非法输入不返回负数', () => {
  assert.equal(loadingRemaining(1000, 1060, 400), 340);
  assert.equal(loadingRemaining(1000, 1500, 400), 0);
  assert.equal(loadingRemaining(NaN, 1500, 400), 0);
});

console.log('\n数据展示三件套');

t('barRatio：归一化到 0..1，越界与非法输入安全归零', () => {
  assert.equal(barRatio(50, 100), 0.5);
  assert.equal(barRatio(150, 100), 1);
  assert.equal(barRatio(-20, 100), 0);
  assert.equal(barRatio(50, 0), 0);
  assert.equal(barRatio(NaN, 100), 0);
});

t('barStagger：线性递增且严格封顶 320ms', () => {
  assert.equal(barStagger(0), 0);
  assert.equal(barStagger(3, 36, 320), 108);
  assert.equal(barStagger(25, 36, 320), 320);
  assert.equal(barStagger(-2), 0);
});

t('valueDelta：准确判涨跌与死区过滤，非有限数返回 same', () => {
  assert.equal(valueDelta(10, 12), 'up');
  assert.equal(valueDelta(10, 8), 'down');
  assert.equal(valueDelta(10, 10), 'same');
  assert.equal(valueDelta(10, 10.02, 0.05), 'same');
  assert.equal(valueDelta(NaN, 10), 'same');
});

t('sparklineGeometry：坐标归一化、全平不除零、空数组安全', () => {
  const g = sparklineGeometry([10, 20, 15, 30], { width: 120, height: 36, pad: 4 });
  assert.equal(g.points.length, 4);
  assert.equal(g.points[0].x, 4);
  assert.equal(g.points[3].x, 116);
  assert.equal(g.points[0].y, 32); // 最小值落在底边 pad
  assert.equal(g.points[3].y, 4);  // 最大值落在顶边 pad
  assert.equal(g.trend, 'up');
  assert.ok(g.linePath.startsWith('M ') && g.areaPath.endsWith('Z'));

  const flat = sparklineGeometry([5, 5, 5], { width: 120, height: 36, pad: 4 });
  assert.ok(flat.points.every((p) => p.y === 18));
  assert.equal(flat.trend, 'same');

  const empty = sparklineGeometry([]);
  assert.equal(empty.linePath, '');
});

console.log('\n资产注册表与知识卡校验');

t('buildRegistry：全部效果卡通过八栏与无私有类名校验（含 Skill Rule 与消费卡）', () => {
  const { registry, errors } = buildRegistry();
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert.ok(registry.count >= 38, `应至少包含 38 张卡，实际 ${registry.count}`);
  for (const card of registry.effects) {
    assert.ok(card.ai_assets.prompt.length > 40, `${card.id} prompt 过短`);
    assert.ok(card.ai_assets.dont_do.length > 10, `${card.id} dont_do 未抽到`);
    assert.ok(card.ai_assets.skill_rule.length > 40, `${card.id} skill_rule 过短`);
    assert.equal(PRIVATE_ID_RE.test(card.ai_assets.skill_rule), false, `${card.id} skill_rule 泄露私有标识`);
    const consumer = renderConsumerCardMarkdown(card);
    assert.equal(PRIVATE_ID_RE.test(consumer), false, `${card.id} 消费卡泄露私有标识`);
  }
});

t('validateCard：第 8 栏泄露本库私有类名会被拦截', () => {
  const md = [
    '---',
    'id: demo-bad',
    'name: 测试',
    'layer: motion',
    'nature: 反馈',
    'platform: both',
    'status: shipped',
    'entry: .demo',
    'source: test',
    '---',
    '## 1 一句话\na',
    '## 2 交互问题\nb',
    '## 3 手感来源\nc',
    '## 4 参数与为什么\nd',
    '## 5 实现落点\ne',
    '## 6 降级契约\nf',
    '## 7 容易做错的地方\ng',
    '## 8 AI 提示词\n```text\n请给元素加 .mk-tap 类\n```',
  ].join('\n');
  const card = parseCard(md, 'effects/demo-bad.md');
  const errs = validateCard(card, 'demo-bad.md');
  assert.ok(errs.some((e) => e.includes('私有标识符')), `应拦住 .mk-tap，实际: ${errs}`);
});

t('validateCard：非法性质或空栏位会被拦截', () => {
  const card = parseCard('---\nid: x\nname: x\nlayer: motion\nnature: 反馈+权重\nplatform: web\nstatus: shipped\nentry: x\nsource: x\n---\n## 1 一句话\na', 'effects/x.md');
  const errs = validateCard(card, 'x.md');
  assert.ok(errs.some((e) => e.includes('非法 nature')));
  assert.ok(errs.some((e) => e.includes('第 7 栏为空')));
});

console.log(`\n${pass} 项通过${process.exitCode ? '，有失败' : ''}\n`);
