---
id: glass-base
name: 玻璃基底材质
nature: 材质
platform: both
source: Apple iOS 26 Liquid Glass 四要素分层（折射 + 低模糊高饱和 + 连续斜向亮棱 + 镜面高光）
---

# 玻璃基底材质 (glass-base)

## 跨平台实现规范

实现一套“液态玻璃”基底材质（纯 CSS 即可成立，无运行时依赖）。

原理一句话：四层叠加——低半径高饱和背景模糊 + 双 mask 掏空连续斜向亮棱 + screen 混合镜面高光 + 四层立体投影，并配合“减弱动效冻住、弱机换实底”的两档降级契约。

做法：
1. 容器基底（.glass-surface）：
   - position: relative; isolation: isolate; border-radius: 26px;
   - background: rgba(255, 255, 255, 0.068);
   - backdrop-filter: blur(6px) saturate(178%);（同时写 -webkit-backdrop-filter）
   - box-shadow 四层：
     inset 0 1px 0 rgba(255,255,255,0.34),
     inset 0 -1px 0 rgba(255,255,255,0.05),
     0 0 0 1px rgba(255,255,255,0.085),
     0 18px 42px -18px rgba(0,0,0,0.62)
2. 连续斜向亮棱（::before）：
   - position: absolute; inset: 0; border-radius: inherit; padding: 1.5px; pointer-events: none;
   - background: linear-gradient(152deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.18) 28%, rgba(255,255,255,0.02) 54%, rgba(255,255,255,0.12) 82%, rgba(255,255,255,0.38) 100%);
   - 双掩膜掏空中间：
     -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
     mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
     -webkit-mask-composite: xor;
     mask-composite: exclude;
3. 镜面高光（::after）：
   - position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
   - 用 CSS 变量 --glass-x (默认 30%)、--glass-y (默认 -8%)、--glass-o (默认 0.26) 驱动径向渐变：
     radial-gradient(118% 88% at var(--glass-x) var(--glass-y), rgba(255,255,255,0.42), rgba(255,255,255,0.10) 26%, rgba(255,255,255,0) 58%)
   - mix-blend-mode: screen; opacity: var(--glass-o);
   - 用 @property 将 --glass-x 和 --glass-y 登记为 <percentage>，以便后续高光坐标可做 CSS 过渡。

硬要求：
- 两档降级不可混为一谈：
  1) prefers-reduced-motion: reduce：保留玻璃材质、亮棱与静态高光，只停止动态流动/高光动画。
  2) 低端机/省电模式类（如 .is-lite）：关闭 backdrop-filter: none，并把背景切为高不透明度实色 rgba(16, 21, 29, 0.94)。
- ::before 和 ::after 必须带 pointer-events: none，容器必须带 isolation: isolate。
- 若后续叠加 SVG 边缘折射滤镜，必须在同一条 backdrop-filter 里重新写出 blur(6px) contrast(1.12) brightness(1.04) saturate(178%)。

验收：
- 静态无 JS 渲染下，玻璃边缘可见 1.5px 沿圆角连续的左上高光棱，中间完全透出底层色彩且无白色糊层。
- 在 Safari 与 Chrome 下圆角亮棱均正常镂空（不整块变白）。
- 玻璃内部按钮点击畅通，不被伪元素拦截。
- 切换 prefers-reduced-motion 时玻璃不消失、不闪烁；切换弱机模式时背景变实色且前景文字清晰可读。

## 禁止做法

- 别把 `blur` 开到 20px–30px —— 过度模糊会让玻璃退化成灰板子，且叠加折射时完全看不出边缘弯曲。
- 别用 `border` 模拟高光边 —— 圆角处会断开，无法表现连续光源。
- 别在 `prefers-reduced-motion` 下删掉 `backdrop-filter` —— 静止材质不是动画，删掉会破坏导航栏层级可读性。
