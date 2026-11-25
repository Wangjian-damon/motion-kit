---
id: refraction
name: 边缘折射
nature: 材质
platform: both
source: shuding/liquid-glass（MIT © 2025 Shu Ding）的 SVG 位移图配方
---

# 边缘折射 (refraction)

## 跨平台实现规范

实现「液态玻璃」的边缘折射材质。不要用 WebGL，只用 CSS + SVG filter。

原理：
用一张 PNG 位移图告诉浏览器「背景在这个像素要往哪个方向挪多少」。
把它挂到 backdrop-filter 上，背景就会在边缘被弯折，出现"玻璃有厚度"的观感。

第一步：画位移图（canvas，一次性，不进 rAF）
1. 尺寸取元素的 getBoundingClientRect()，圆角取 computedStyle 的 border-top-left-radius。
2. 逐点算圆角矩形 SDF（内部为负、边界为 0、外部为正）：
     qx = |x| - halfW + r;  qy = |y| - halfH + r
     sdf = min(max(qx,qy), 0) + hypot(max(qx,0), max(qy,0)) - r
3. 带宽 reach = min(halfW, halfH) * 0.42，位移峰值 amp = reach * 0.34。
4. 边缘权重 t = 1 - smoothstep(0, reach, -sdf)，即贴边为 1、往里 reach 之后为 0。
5. 用中心差分求 SDF 梯度得到单位外法线，位移向内：dx = -nx * amp * smoothstep01(t)。
6. 整图取最大偏移 max，编码成 RGBA：
     R = (dx / max + 0.5) * 255
     G = (dy / max + 0.5) * 255     ← 128 表示"不位移"
     B = 0, A = 255
7. 采样可以降密度：长边限制在 168 格左右。但 dx/dy 必须按 CSS px 算，
   不能按采样格算，否则降采样会让折射变弱。
8. canvas.toDataURL() 拿 dataURL。记得释放 canvas。

第二步：建 filter（全站共用一个池）
   <svg id="defs" width="0" height="0" aria-hidden="true"><defs/></svg>
   <filter id="f0" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB"
           x="0" y="0" width="{W}" height="{H}">
     <feImage href="{dataURL}" width="{W}" height="{H}" preserveAspectRatio="none" result="map"/>
     <feDisplacementMap in="SourceGraphic" in2="map" scale="{max}"
                        xChannelSelector="R" yChannelSelector="G"/>
   </filter>
   池子的 key 用 `${round(W)}x${round(H)}r${round(r)}s${strength}f${feather}`，
   几何 + 参数完全一样才能共用。feImage 的 href 用 setAttributeNS(xlink 命名空间)。

第三步：挂上去
   el.style.setProperty('--glass-url', `url(#f0)`)
   el.classList.add('is-refract')
   配合的 CSS（注意是覆盖不是追加，blur 必须重写一遍）：
     .is-refract {
       backdrop-filter: var(--glass-url) blur(6px) contrast(1.12) brightness(1.04) saturate(1.78);
     }

第四步：能力门与降级
   - 开门：CSS.supports('backdrop-filter', 'url(#f0) blur(1px)') 为真才做。
     为假时安静返回，什么都不写（class 不加、变量不写），CSS 回落到纯 blur。
   - 元素尺寸变化 ≥2px 时重算，用 ResizeObserver，并攒到一帧里做。
   - 低端机 / 省电模式：backdrop-filter: none + 实色背景。feDisplacementMap 是逐像素重采样，
     和 backdrop-filter 叠加时最贵。

硬要求（少一条就会失败）：
- 三个 filter 属性必须写全：filterUnits="userSpaceOnUse"、colorInterpolationFilters="sRGB"、
  显式 x/y/width/height。缺一个 Chrome 会给一张全灰的图，没有报错。
- blur 必须 ≤ 8px。模糊和折射抢同一件事：背景糊得越狠，边缘那圈弯折越看不出来。
- 位移方向一律向内。向外是"推挤"不是"折射"。
- prefers-reduced-motion 下不要摘掉它 —— 它是贴图不是动画，静止画面里也需要。

验收：
- 一块 340×150、圆角 26px 的玻璃，边缘 30px 内背景有明显压缩/错位，中心不变形。
- 两块同尺寸玻璃只建 1 条 filter；不同尺寸建 2 条。
- 元素从 340 缩到 200 宽后，折射依旧贴着新边缘（不是被拉伸的旧图）。
- 不支持 backdrop-filter: url() 的浏览器：不报错、无灰块、退回纯模糊。

## 禁止做法

**验收（人工）**：把玻璃放在一张有竖条纹或细文字的底图上，边缘应该看到条纹被压弯；
放在纯色底上应该**看不出任何折射**（没有可弯的东西）—— 这是正常的，不是没生效。

- 别加 `will-change: backdrop-filter`，对这条几乎无效，还可能反而掉帧。
- 别把位移图放进 rAF 每帧重画 —— 它只跟几何有关，不跟时间有关。
- 别用 `feGaussianBlur` 冒充边缘弯折：那是模糊，不是折射。
- 别在 `prefers-reduced-motion` 下把它设成 `none`，那会让玻璃变薄一档。
