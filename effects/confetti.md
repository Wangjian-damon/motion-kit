---
id: confetti
name: 物理撒花礼炮
layer: fun
nature: 反馈
platform: both
status: shipped
entry: MK.confetti({ origin, count, colors, spread }) + .mk-confetti
source: 物理抛射礼炮（WAAPI 零依赖批量起播 + 抛物线重力坠落 + 播完自毁 DOM）
---

## 1 一句话

在按钮或视口中心瞬间炸出一蓬彩色纸屑，按圆周抖动角向上抛射再受重力旋转飘落，全部走原生 WAAPI 并在播完后自动销毁节点不留残留。

## 2 交互问题

**完成关键里程碑（首次发布、支付成功、通关打卡）时，一个冷冰冰的「成功」弹窗缺少情绪峰值；但为此引入 30KB 的 canvas-confetti 库又显得过重。** 用 60 行原生 Web Animations API 批量起播 + 播完自摘容器，零依赖就能给出极爽的庆祝瞬间。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 礼炮先向上抛（`dy - 90`）再受重力下坠（`+320px`）的两段抛物线感 | 整页常驻 `<canvas>` 粒子引擎 |
| 角度按 `2π * i / count` 均匀铺开再加随机抖动，避免聚成一坨或排成车轮 | 纯 `Math.random() * 2π` 导致某些方向空一大块 |
| 建完所有关键帧后统一 `animate()`，避免肉眼可见的先后起飞差 | 播完不清理 DOM 导致内存与节点泄漏 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 碎片数 `count` | 桌面 `90` / 触屏上限 `60` | 90 片足够热闹饱满；手机端自动压到 60 片省电防掉帧 |
| 抛射峰值偏移 | `offset: 0.42`、`dy - 90` | 先在 42% 时长冲到最高点，后 58% 旋转下坠淡出，符合真实纸屑阻力感 |
| 持续时长 `duration` | `1600ms`（× 0.7..1.2 随机） | 错开每片落地时间，不会像一块布同时消失 |
| 清理兜底 | `Promise.all(finished)` + `setTimeout` | 切到后台标签页时 `finished` 可能挂起，兜底定时器保证容器必被摘除 |

## 5 实现落点

```
src/core/fun.js:36    confetti({ count, origin, colors, spread, duration, seed })
styles/fun.css        .mk-confetti / .mk-confetti__bit
```

## 6 降级契约

**走 `fun` 层专属契约：整层关掉。**

`prefers-reduced-motion: reduce` 下 `confetti()` 第一行直接返回空清理函数，不创建任何节点、不启动任何动画——庆祝彩带是纯情绪装饰，在减弱动效下没有折中空间。

## 7 容易做错的地方

**① 纸屑容器忘了设 `pointer-events: none` 与 `position: fixed; inset: 0`。**
如果挡住点击，用户庆祝完点“下一步”会点在透明撒花层上没反应。

**② 只靠 `animation.finished` 清理容器，没加 `setTimeout` 兜底。**
用户点了按钮立刻切标签页，浏览器暂停动画导致 `finished` 迟迟不触发，DOM 节点挂着不释放。

**③ 节点原点没设到点击按钮中心，全从屏幕左上角 `(0,0)` 炸出来。**
若传入 `origin` DOM 元素，应读取 `getBoundingClientRect()` 算出按钮正中心 `(x, y)` 作为爆炸起点。

---

## 8 AI 提示词

**用途**：在任意 Web 项目里实现零依赖、原生 WAAPI 驱动、播完自动清理的物理撒花礼炮动效。

```text
实现零依赖的物理撒花礼炮动效（Confetti Burst，原生 Web Animations API）。

原理一句话：在触发点（按钮中心或视口中心）创建一个 pointer-events: none 的 fixed 容器，按均匀圆周+抖动角生成 60–90 片彩纸，统一用 WAAPI 播放「先上抛 → 旋转下坠淡出」三帧动画，播完后自动销毁容器。

做法：
1. 降级与节流：prefers-reduced-motion: reduce 直接返回不播；触屏粗指针将 count 上限压至 60。
2. 起点计算：若传入 DOM 元素 origin，取其 getBoundingClientRect() 中心 (x, y)；否则取视口中心。
3. 批量生成纸屑（默认 count = 90, duration = 1600ms）：
   - 宿主容器：position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 9999; aria-hidden="true"。
   - 每片纸屑定位在 (x, y)，宽 8px 高 5px 圆角 2px，从高对比色板随机取色。
   - 角度 angle = (i / count) * Math.PI * 2 + random * 0.8（均匀铺开再加抖动，既不聚团也不像车轮）；
     力度 power = 70 + random * 150；
     dx = cos(angle) * power；dy = sin(angle) * power * 0.75 - 90（先向上抛）；
     rot = (random - 0.5) * 900deg；单寿命 life = duration * (0.7 + random * 0.5)。
   - 三帧关键帧：
     0%: transform: translate3d(0,0,0) rotate(0deg), opacity: 1
     42%: transform: translate3d(dx, dy, 0) rotate(rot), opacity: 1
     100%: transform: translate3d(dx*1.32, dy+320px, 0) rotate(rot*1.6), opacity: 0
   - 所有节点挂完后再统一调用 bit.animate(keyframes, { duration: life, easing: 'cubic-bezier(0.16, 0.8, 0.3, 1)', fill: 'both' })。
4. 自动清理：Promise.all(anims.map(a => a.finished.catch(() => {}))) 与 setTimeout(cleanup, duration * 1.6 + 600) 双保险取消动画并 remove() 容器。

硬要求：
- 容器必须设 pointer-events: none 与 aria-hidden="true"，绝不挡住页面点击。
- 必须带双保险清理，播完后 DOM 中 0 残留节点。
- prefers-reduced-motion: reduce 下彻底不播（整层关闭）。

验收：
- 点击按钮后，彩纸从该按钮正中心向四周先上抛再旋转飘落，约 2 秒内全部消失。
- 播完后检查 document.body，撒花容器已被完整移除，无残留节点。
- 撒花过程中页面其他按钮点击畅通无阻。
- 开启减弱动效后点击不产生任何动画与节点。
```

**别让它做的**：

- 别为了撒一次花引入几十 KB 的第三方粒子/Canvas 库。
- 别用纯随机角度不均匀分布 —— 容易在一侧扎堆、另一侧留白。
- 别在循环里边 appendChild 边 animate 读布局 —— 先批量建节点再统一起播。
