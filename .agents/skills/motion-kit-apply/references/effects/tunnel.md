---
id: tunnel
name: 无限深渊隧道
nature: 方向
platform: both
source: 负 animation-delay 错相无限穿越隧道（同周期错相，第 0 帧即满环零冷启动，零 JS 循环）
---

# 无限深渊隧道 (tunnel)

## 跨平台实现规范

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

## 禁止做法

- 别写正的 `animation-delay` —— 开局前几秒会看到隧道是空的。
- 别给每道环写不同的 `animation-duration` —— 几秒后环距会彻底乱掉撞在一起。
- 别让 `100%` 关键帧保持 `opacity: 1` —— 环贴到镜头上会爆闪。
