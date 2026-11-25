---
id: state-button
name: 态变按钮
layer: motion
nature: 反馈
platform: both
status: shipped
entry: v-mk-state-btn + .mk-state-btn / nextButtonState() / loadingRemaining()
source: Family App / Linear / Emil Kowalski 的四态提交按钮（零宽跳 + 400ms 防闪 + 防连点）
---

## 1 一句话

把提交按钮的 `idle → loading → success / error → idle` 压进同一个不跳宽的网格格子里，旧文案上移微糊退场、新文案下移弹入，且自带 400ms 最低加载时长与防连点锁。

## 2 交互问题

**异步提交按钮最常见的三个廉价感：宽度乱跳、转圈一闪而过、重复点击发两次请求。** 文案从「保存」变成「保存中…」再变成「已保存」时，按钮宽一变就把旁边整排元素推歪；接口 60ms 返回时转圈闪一帧像页面抽风；禁用按钮用原生 `disabled` 又会把键盘焦点踢飞。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| Family / Linear 的纵向错位换字（`±0.7em` + `blur(2px)`）与 `≤240ms` 干脆节奏 | JS 测量文字宽度并用 Framer Motion `layout` 动画 `width`（容易推挤邻近按钮） |
| CSS Grid `grid-area: 1 / 1` 四态叠放，天然撑出最宽态的固定宽度 | 给按钮写死 `min-width: 120px`（换文案或多语言立刻撑爆或留白失衡） |
| `aria-disabled="true"` 拦点击而不丢焦点 | 原生 `disabled` 属性踢掉焦点 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 最低加载时长 `minLoading` | `400ms` | 低于 300ms 的 spinner 读起来像闪屏/报错；400ms 刚好让眼睛确认“系统在干活”又不拖慢操作 |
| 成功态停留 `hold.success` | `1600ms` | 够读一眼确认打勾并自动复位，不长到妨碍下一轮操作 |
| 失败态停留 `hold.error` | `2400ms` | 失败比成功需要多 0.8s 读清原因；且失败态下随时点一下可直接重试 |
| 退场 / 入场时长 | `160ms` / `240ms` | 退场比入场快一档，避免新旧两行字在中间叠成一团 |
| 错位距离 + 模糊 | `±0.7em` + `blur(2px)` | 相对字号缩放，大按钮小按钮比例一致；2px 轻糊掩盖字形切换硬边 |
| 失败抖动 | `360ms`、`±4px` 阻尼衰减 | 用独立 CSS `translate` 属性而不碰 `transform`，方便与按压反馈叠加不打架 |

## 5 实现落点

```
src/core/state-button.js:14   STATE_BUTTON                  常量表
src/core/state-button.js:24   nextButtonState(state, event) 纯函数状态机
src/core/state-button.js:41   loadingRemaining(t0, now, min)纯函数，防闪剩余时长
src/core/state-button.js:54   stateButton(el, getOpts)      绑定点击与 Promise，只写 data-state / aria-*
styles/motion.css             .mk-state-btn / [data-for] / .mk-state-btn__spin / @keyframes mk-state-shake
```

## 6 降级契约

**走 `motion` 档：减，不关。**

`prefers-reduced-motion: reduce` 下取消文案上下位移、模糊与失败抖动，仅保留透明度切换；加载圈停止旋转，改为缓慢透明度呼吸（`1.2s`）以继续传达“进行中”状态。

## 7 容易做错的地方

**① 用原生 `disabled` 属性锁定加载态，导致键盘用户焦点瞬间丢失。**
应使用 `aria-disabled="true"` + `aria-busy="true"` 并在点击处理器里由状态机吃掉重复提交，焦点始终留在按钮上。

**② 连续两次失败不触发抖动。**
同一个 `.is-shaking` 类还在或同帧移除再加会被浏览器合并；必须在加类前移除并触发一次 `void el.offsetWidth`，且在 `animationend` 清掉类。

**③ 抖动动画写 `transform: translateX(...)` 覆盖了按压的 `scale()`。**
使用现代 CSS 独立变换属性 `translate: -4px` 做抖动，与按压的 `transform: scale(...)` 完全正交，同一按钮可同时挂按压反馈。

**④ 异步请求在组件卸载后才 resolve，继续操作已销毁节点的定时器。**
控制器必须维护 `alive` 标志，在 `destroy()` 中清掉全部定时器并拦截延迟回来的状态迁移。

---

## 8 AI 提示词

**用途**：在任意技术栈里实现一个不跳宽、不闪屏、防重复提交、支持失败重试的四态提交按钮。

```text
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
```

**别让它做的**：

- 别用 `v-if` / 条件渲染把旧文案直接卸掉 —— 节点没了就失去退场过渡，且按钮宽度会随着当前文案长度来回跳动。
- 别让抖动动画写 `transform: translateX()` —— 会和按钮按压的 `scale()` 互相覆盖。
- 别在接口秒回时跳过 loading 直接闪一帧转圈 —— 要么不进 loading，进了就撑满 400ms。
