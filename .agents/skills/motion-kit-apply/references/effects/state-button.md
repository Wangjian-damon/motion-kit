---
id: state-button
name: 态变按钮
nature: 反馈
platform: both
source: Family App / Linear / Emil Kowalski 的四态提交按钮（零宽跳 + 400ms 防闪 + 防连点）
---

# 态变按钮 (state-button)

## 跨平台实现规范

实现一个四态提交按钮（idle → loading → success / error → idle），零动画库依赖。

原理一句话：四态文案全部叠在同一个 CSS Grid 格子里（grid-area: 1 / 1）天然锁定最宽宽度，状态机纯函数防重复提交并保证 loading 至少停留 400ms 防闪屏。

做法：
1. 纯函数状态机 nextButtonState(state, event)：
   - submit：仅 idle / error → loading（loading 和 success 态下点击一律吃掉，防重复提交；error 态点一下即重试）。
   - resolve：仅 loading → success；reject：仅 loading → error；reset：仅 success / error → idle。
   - loadingRemaining(startedAt, now, min = 400) = Math.max(0, min - (now - startedAt))。
2. 布局与零宽跳 CSS：
   - 按钮容器：display: inline-grid; place-items: center; overflow: hidden;
   - 四个状态文案节点 [data-for="idle|loading|success|error"] 全部 grid-area: 1 / 1; white-space: nowrap; pointer-events: none;
   - 非当前态：opacity: 0; transform: translate3d(0, 0.7em, 0); filter: blur(2px); transition: 240ms cubic-bezier(0.22,1,0.36,1);
   - 当前态（容器 data-state 匹配）：opacity: 1; transform: none; filter: none;
   - 刚离开的旧态加 .is-leaving：transform: translate3d(0, -0.7em, 0); transition-duration: 160ms（退得比进快，避免两行字叠糊）。
   - 失败态加 .is-shaking：360ms 阻尼横抖（0/100%: 0, 20%: -4px, 40%: 4px, 60%: -3px, 80%: 2px），用独立 CSS 属性 translate 而非 transform。
3. 交互与无障碍：
   - 点击时驱动状态机切到 loading，记录 t0 = performance.now()，await 业务 action()；返回后等待 loadingRemaining(t0, performance.now(), 400) 再切入 success / error。
   - success 停留 1600ms、error 停留 2400ms 后自动 reset 回 idle；loading / success 期间设 aria-disabled="true"（不用原生 disabled 防止丢键盘焦点），loading 设 aria-busy="true"，非当前态文案设 aria-hidden="true"。

硬要求：
- 严禁在状态切换时动画 width 或用 JS 测量文字宽度 —— 四态同格 grid 天然零宽跳。
- 严禁使用原生 disabled 属性锁加载态（会踢掉键盘焦点）；必须用 aria-disabled + 状态机拦截。
- 连续失败重播抖动前必须先摘 .is-shaking 并触发一次 reflow。
- prefers-reduced-motion: reduce 下去掉位移、模糊与抖动，加载圈由旋转改为 1.2s 透明度呼吸。

验收：
- 四个状态切换全程按钮宽度像素级不变（前后 getBoundingClientRect().width 差为 0）。
- 接口 30ms 内返回时，loading 态仍稳定停留满 400ms 后再切到 success，无一帧闪烁。
- loading 或 success 期间狂点按钮，action 仅执行 1 次；error 态点击立即进入新一轮 loading 重试。
- 键盘 Tab 聚焦后按 Enter 提交，全程焦点不丢失。

## 禁止做法

- 别用 `v-if` / 条件渲染把旧文案直接卸掉 —— 节点没了就失去退场过渡，且按钮宽度会随着当前文案长度来回跳动。
- 别让抖动动画写 `transform: translateX()` —— 会和按钮按压的 `scale()` 互相覆盖。
- 别在接口秒回时跳过 loading 直接闪一帧转圈 —— 要么不进 loading，进了就撑满 400ms。
