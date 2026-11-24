---
id: refraction
name: 边缘折射
layer: glass
nature: 材质
platform: both
status: shipped
entry: refract(el, { strength, feather }) / glass(el, { refract: 0.34 })
source: shuding/liquid-glass（MIT © 2025 Shu Ding）的 SVG 位移图配方
---

## 1 一句话

在玻璃边缘把背景**弯折**一下：生成一张 dx/dy 位移图，交给 `feDisplacementMap`，
让 `backdrop-filter` 折出"这块东西有厚度"的那一圈。

## 2 交互问题

**「毛玻璃卡片」和「液态玻璃」的区别只有一件事：边缘有没有被折弯。**

`backdrop-filter: blur()` 是把背景磨平——它让表面看起来是**半透明**的，
但半透明不等于**实心**。一块真正有厚度的玻璃，靠近边缘时会把后面的东西
压缩、错位，这是光学上唯一的"厚度证据"。没有它，再叠多少高光、亮边、投影，
读起来都是一张贴纸。

这个效果不给用户任何新信息，但它回答了一个问题：**"这东西是块实体，还是一层膜？"**

## 3 手感来源

拿的是 shuding/liquid-glass 的**配方**，不是实现：

| 取的（原样保留） | 丢的（本库改写） |
|---|---|
| `roundedRectSDF` 的四个分支合并写法 | 写死的 `300×200` + `radius: 0.6`（uv 单位）→ 改成读元素实测尺寸与 `border-top-left-radius` |
| `smoothStep(a, b, t)`（a > b 的反向区间也成立） | 每个实例各建一份 `<svg>` + `<canvas>` + dataURL → 改成按几何共享一个 filter 池 |
| 双层 smoothStep：外层求边缘权重、内层再缓一次 | 拖拽交互、`window.liquidGlass` 全局、`mouse` 参数（上游留了但没用） |
| R/G 编码：`(dx/max + 0.5) * 255`，128 = 不动 | 1:1 采样（300×200 = 6 万像素逐点算）→ 降到长边 168 格，位移仍按 CSS px 算 |
| `feDisplacementMap` 配 `xChannelSelector="R"` / `yChannelSelector="G"` | 上游用 `canvasDPI` 缩放 canvas 再反算 scale；这里直接按 CSS px 采 |

> **这里有一处必须写明的偏差。** 位移的**方向**取法不同：
> 上游是把 uv 朝中心等比缩放（`texture(ix*scaled+0.5, ...)`），位移沿**径向**；
> 本库用 SDF 的中心差分梯度取**内法线**，位移沿**法线**。
> 直边中点两者完全一致，圆角处会分叉 —— 实测 340×150 / r26 的卡片，
> 有效位移点上两者夹角中位数 **32.4°**、p90 **62.7°**、最大 **71.6°**。
> 观感上本库的圆角弯折更"贴边"、上游的更"朝心"。
> 这不是等价变换，README 里"数学一行没动"的说法只对 SDF / smoothStep / 编码成立，
> 对方向场不成立。

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| `samples` | 168（长边格数） | 位移场是平滑的，降采样后双线性放大看不出来。168 格 = 340px 宽的卡片每格约 2px；再低圆角会出现阶梯。上限压到 172 是为了大卡片（1200px）不把主线程卡住 |
| `feather` | 0.42 | 折弯带宽 = 短边 × feather。0.42 时 150px 高的卡片带宽约 31px —— 比圆角半径（26px）略大，弯折刚好裹住圆角外沿。低于 0.3 会只剩一条细线 |
| `strength` | 0.34 | 位移峰值 = 带宽 × strength ≈ 10.7px。这是"看得出被压扁、但认得出后面是什么"的上限；0.5 以上背景会糊成一团 |
| `--mk-glass-blur` | **6px**（原 24px） | **模糊和折射在抢同一件事。** 背景糊得越狠，边缘那圈被折弯的纹理越看不出来，最后只剩一块灰板子。24px 时折射基本白做 |
| `contrast(1.12)` `brightness(1.04)` | 写死在 `.is-refract` 里 | 位移之后像素被重采样，整体会软一档，不提一点看起来像蒙了层雾 |
| ResizeObserver 重算阈值 | 2px | 位移图按 px 算，尺寸一变就过期。但 grid 重排会连响好几次，所以小于 2px 不动、且攒到一帧里做 |
| filter 池 key | `w×h r s f` | 几何 + 参数完全相同才能共用。实测 6 块玻璃 / 3 种尺寸 → 3 条 filter，而不是 6 条 |

**三个属性少一行就变灰图**（这是整套东西里最容易踩的坑，见第 7 节）：

```
filterUnits="userSpaceOnUse"
colorInterpolationFilters="sRGB"
x="0" y="0" width=W height=H      ← W/H 必须是元素尺寸
```

## 5 实现落点

```
glass.js:77    smoothStep(a, b, t)                      纯函数
glass.js:87    roundedRectSDF(x, y, halfW, halfH, radius)  纯函数
glass.js:106   lensField(w, h, { radius, feather, strength, samples })
                 → { data: Uint8ClampedArray, width, height, scale }
glass.js:193   ensureFilter(w, h, radius, opt)  → 共享池，key = 几何+参数
glass.js:262   refract(el, { strength, feather }) → teardown
glass.css:62   .mk-glass 的基底（纯 blur，没折射时唯一的一层）
glass.css:76   .mk-glass.is-refract  覆盖成 url(#…) + blur + 提对比
```

职责切得很干净：

- **数学全在 `lensField`**，纯函数、不碰 DOM，所以能单测（R/G 的方向、scale 与 strength 成正比、
  降采样后力道不变、极扁的条也能出图 —— 都有断言盯着）。
- **池子在 `ensureFilter`**，只负责"这个几何算过没有"。
- **`refract()` 只管生命周期**：算几何、写 `--mk-glass-url`、加 `.is-refract`、挂 ResizeObserver。
  它**不写 transform、也不碰高光** —— 那是 `glass()` 的事。

`scale` 必须是**全图最大偏移**，因为 `feDisplacementMap` 只有一个 `scale` 属性。
按每侧各自归一化的话，大的那一侧会被裁掉。

## 6 降级契约

**走 `glass` 那档：冻。**

折射是**贴图**不是动画 —— 静止画面里它就在那儿，`prefers-reduced-motion` 下不需要任何处理。
这一条和 `motion.css` 的"减"、`fun/3d` 的"关"都不同，是第三套契约里的特例。

两条真正的降级：

```css
/* 弱机 / 省电：feDisplacementMap 是逐像素重采样，
   和 backdrop-filter 叠在一起正是最贵的那一段 */
.mk-lite .mk-glass.is-refract {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  background-color: rgba(16, 21, 29, 0.94);
}
```

以及能力门（在 `refract()` 里，不是 CSS）：

```js
if (!CSS.supports('backdrop-filter', 'url(#mk-glass-f0) blur(1px)')) return noop;
```

门失败时**安静退回纯模糊**：class 不加、变量不写、filter 不建。
实测通过这道门的是 **Chrome / Edge / Safari 18.6**（三者都落到 `.is-refract`，
`--mk-glass-url` 都写入、`#mk-glass-defs` 里都建出一条 filter）。
旧版 Safari 与拿不到 `feDisplacementMap` 的引擎才走降级。

## 7 容易做错的地方

**① 三个 filter 属性少一个，Chrome 就给一张灰图。**

```
filterUnits="userSpaceOnUse"        ← 坐标锁到元素盒，而不是默认的 -10%..120% bbox
colorInterpolationFilters="sRGB"    ← 编码是 sRGB 直存的 u8，线性色彩空间会算错
x="0" y="0" width=W height=H        ← 显式给区域；缺省时位移图会被缩放到一个奇怪的范围
```

表现是玻璃变成一块均匀的灰色/空白，而不是"折射弱一点"。**没有渐变、没有提示，
只是全灰** —— 所以这三行必须当成不可省略的字面量。

**② `blur` 和折射抢同一件事。**
`--mk-glass-blur` 从 24px 降到 6px 不是为了省性能，是为了让边缘那圈折弯**看得见**。
如果哪天有人把它调回去"让玻璃更磨砂"，折射会立刻消失，而现象是"折射坏了"——
实际是被模糊吃掉了。`.is-refract` 那条覆盖里必须把 `blur()` 再写一遍（它是覆盖不是追加），
少写就是"一开折射模糊就没了"。

**③ 位移图过期是静默的。**
图是按 px 画的。元素从 340 变成 200 宽之后，如果没重算，折射会按旧比例拉伸，
看起来像"折射突然变淡"。所以 `refract()` 挂 ResizeObserver；但 grid 重排时会连响多次，
所以只在 ≥2px 时动、并且攒一帧。

**④ `feImage` 的 href 必须走 xlink 命名空间。**

```js
feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', canvas.toDataURL())
```

只用 `setAttribute('href', ...)` 在部分引擎里不生效。

**⑤ 位移图的采样分辨率**和**位移量**是两个独立的东西。**
降采样把格数降到 168 之后，如果偏移按"采样像素"算，折射力道会跟着变弱 3 倍。
所以 `lensField` 里 `dx/dy` 一律按 `cellW/cellH` 换算回 CSS px ——
这条有单测（`samples: 24` 的 scale 必须不低于 `samples: 168` 的 85%）。

**⑥ `rect.height` 的取整。**
池子 key 用 `Math.round`，但 `rect.width` 是浮点。0.4px 的差异会造成两条 filter 白算一遍。
现在用 round 挡住大部分，但 `<canvas>` 里仍是 `field.width × field.height` 的整数格 ——
`preserveAspectRatio="none"` 负责把非整数比例拉回去。

**⑦ `.is-press` 和 `v-mk-tap` 抢 `transform`。**
`glass()` 在触屏上接管按压（加 `.is-press` 播 `mk-glass-press` 关键帧），
而 `v-mk-tap` 写的是 `scale(0.955)` —— 同一个节点只能二选一，
否则两段关键帧互相抢，按压看起来像抽搐。

**⑧ 文档里的默认值曾经是错的。** `refract()` 的 JSDoc 有一段时间写
`[opt.strength=0.26]`，实际签名是 `0.34` —— 0.26 是更早一版的默认，
调参之后注释没跟上。这类错比没有注释更糟：读代码的人会以为自己在看默认值。
现在已改回 `0.34`，与 `glass({ refract: 0.34 })` 一致。

---

## 8 AI 提示词

**用途**：在一个新项目里从零复现这个材质，不需要本库。

```text
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
```

**验收（人工）**：把玻璃放在一张有竖条纹或细文字的底图上，边缘应该看到条纹被压弯；
放在纯色底上应该**看不出任何折射**（没有可弯的东西）—— 这是正常的，不是没生效。

**别让它做的**：

- 别加 `will-change: backdrop-filter`，对这条几乎无效，还可能反而掉帧。
- 别把位移图放进 rAF 每帧重画 —— 它只跟几何有关，不跟时间有关。
- 别用 `feGaussianBlur` 冒充边缘弯折：那是模糊，不是折射。
- 别在 `prefers-reduced-motion` 下把它设成 `none`，那会让玻璃变薄一档。