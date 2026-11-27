---
id: tunnel
name: 无限深渊隧道
layer: 3d
nature: 方向
platform: both
status: shipped
entry: v-mk-tunnel + .mk-tunnel-stage / .mk-tunnel / .mk-tunnel__ring / tunnel(el, { count })
source: 负 animation-delay 错相无限穿越隧道（同周期错相，第 0 帧即满环零冷启动，零 JS 循环）
---

## 1 一句话

10 道光环共用同一条从远端 `-900px` 冲向镜头 `+200px` 的 CSS 关键帧，靠**负 `animation-delay`** 在第 0 帧就把整条无限深渊隧道铺满，零 JS 动画循环。

## 2 交互问题

**想做星际穿越/空间入口的无限隧道感，如果给每道环写正延迟（`+0.36s`），前 3 秒页面是空荡荡的一道道往外冒；如果用不同周期又会很快乱成一团。** 统一周期 + 负延迟错相，页面打开第 1 帧整条隧道就已经处于完美流动状态。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 全部环共用同一条 `3.6s linear infinite` 关键帧，仅用负 `delay = -i * (3.6s / count)` 均匀错相 | JS rAF 每帧更新 10 个环的 `translateZ` |
| 两端淡入淡出（远端 `0%` 透明、近端冲过镜头 `100%` 透明），避免眼前突兀闪现 | 环突然在眼前硬裁切消失 |
| 3D 归零降级：减弱动效直接 `animation: none; transform: none` | 停成一团错乱叠框 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 环数 `count` | `8 ~ 10` | 少于 6 环显得稀疏断层，多于 14 环重叠过密发白 |
| 单环周期 | `3.6s linear infinite` | 与 10 环配合每环错相 `-0.36s`，穿越速度既有纵深感又不晃眼 |
| 深度区间 | `translateZ(-900px → 180px)` | 配合 `perspective: 420px`，远端收敛到一点、近端刚好掠过镜框外沿 |

## 5 实现落点

```
src/core/scene3d.js:217  tunnel(el, { count })     自动生成 count 个环，零 rAF
styles/3d.css:154        .mk-tunnel-stage / .mk-tunnel / .mk-tunnel__ring
```

## 6 降级契约

**走 `3d` 层专属契约：归零塌回平面（停止穿越动画，仅留静态同心环或收起）。**

## 7 容易做错的地方

**① 延迟写成正数 `calc(var(--i) * 0.36s)`。**
正延迟会让页面刚加载时前 3 秒隧道半空，必须写成**负延迟** `calc(var(--i) * -0.36s)` 让所有环第 0 帧就在轨道上就位。

**② 忘了在 `100%` 处将 `opacity` 压回 `0`。**
光环冲过 `translateZ` 接近 `perspective` 时会瞬间铺满整屏闪烁；最后 12% 必须平滑淡出到 `0`。

---

## 8 AI 提示词

**用途**：在任意前端项目里用纯 CSS 负延迟错相（零 JS 循环 / 零 WebGL）实现无限 3D 深渊隧道。

```text
实现纯 CSS 负延迟错相的无限 3D 深渊隧道（Infinite 3D Tunnel），零 WebGL / 零 JS 动画循环。

原理一句话：N 道光环共用同一条 3.6s 从 translateZ(-900px) 冲向 translateZ(180px) 的关键帧，用负 animation-delay: calc(var(--i) * -0.36s) 在第 0 帧即均匀铺满整条隧道。

做法：
1. 结构：.tunnel-stage（perspective: 420px; overflow: hidden; display: grid; place-items: center）> .tunnel（transform-style: preserve-3d）> 10 个 .tunnel-ring（--i: 0..9）。
2. CSS 关键帧：
   @keyframes tunnel-fly {
     0%   { transform: translateZ(-900px) scale(0.75); opacity: 0; }
     18%  { opacity: 0.75; }
     85%  { opacity: 0.85; }
     100% { transform: translateZ(180px) scale(1.1); opacity: 0; }
   }
   .tunnel-ring {
     position: absolute; width: 140px; height: 140px; border-radius: 24px;
     border: 1.5px solid rgba(184,255,61,0.55);
     animation: tunnel-fly 3.6s linear infinite;
     animation-delay: calc(var(--i, 0) * -0.36s);
   }
3. 降级：@media (prefers-reduced-motion: reduce) { .tunnel-ring { animation: none; transform: none; opacity: 0.2; } }

硬要求：
- 必须使用负 animation-delay（-周期/环数），确保首帧即满环无冷启动空洞。
- 0% 与 100% 两端必须淡出到 opacity: 0，防止冲过镜头时全屏闪白。
- 严禁用 JS rAF 每帧更新环坐标。
- prefers-reduced-motion: reduce 下停止动画并归零塌回平面。

验收：
- 页面打开第 1 帧即可看到 10 道光环等距均匀铺满隧道并匀速向前涌动，无接缝无闪白。
- 全程零 JS 帧循环，纯合成器运行。
- 开启减弱动效后彻底静止。
```

**别让它做的**：

- 别写正的 `animation-delay` —— 开局前几秒会看到隧道是空的。
- 别给每道环写不同的 `animation-duration` —— 几秒后环距会彻底乱掉撞在一起。
- 别让 `100%` 关键帧保持 `opacity: 1` —— 环贴到镜头上会爆闪。
