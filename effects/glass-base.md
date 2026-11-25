---
id: glass-base
name: 玻璃基底材质
layer: glass
nature: 材质
platform: both
status: shipped
entry: .mk-glass（配 v-mk-glass / refract()）
source: Apple iOS 26 Liquid Glass 四要素分层（折射 + 低模糊高饱和 + 连续斜向亮棱 + 镜面高光）
---

## 1 一句话

把导航栏、操作条、浮层卡片做成有厚度的实心玻璃：低模糊高饱和底材 + 沿圆角连续的 1.5px 斜向亮棱 + 镜面高光，且不挂 JS 也能静态成立。

## 2 交互问题

**普通「毛玻璃卡片」只是半透明糊板子，没有层级边界。** 很多界面给弹窗加一个 `backdrop-filter: blur(20px)` + 1px 白边就叫玻璃，但在深色或复杂内容上滚动时，边界发灰、文字对比度不稳定，用户感受不到它是一层浮在内容之上的实体材质。

更棘手的是降级：**玻璃承载版面（导航栏、操作条），不能像装饰层一样在减弱动效下直接关掉**；它必须有独立的「冻住」与弱机实底两档退路。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| Apple Liquid Glass 的四层叠加：低半径模糊 + 高饱和 + 斜向高光棱 + 镜面高光 | WebGL / Three.js 实时光线追踪（违反 0 运行时原则） |
| 双 `mask` + `mask-composite: exclude` 掏空中间，让 152° 斜向高光穿过圆角连续 | 12px 宽渐变边框拟物「厚度圈」（读起来像塑料壳） |
| `isolation: isolate` 锁定 `mix-blend-mode: screen` 混合范围 | 把所有动态特效写死在基底里（流动/按压/折射拆分到独立变体与状态类） |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 背景模糊 | `6px` | 模糊和边缘折射抢同一件事：超过 12px 会把边缘被折弯的纹理磨平，只剩一块灰板子；低于 4px 背景文字干扰前景可读性 |
| 饱和度 | `178%` | 玻璃滤镜会把底色拉灰，提饱和才能让背后的色块透出“透亮”而不是“脏灰” |
| 基底着色 | `rgba(255, 255, 255, 0.068)` | 足够把玻璃面和纯黑背景拉开，又不至于把底层内容盖死 |
| 边缘亮线 | `1.5px` + `152deg` 渐变 | 1px 在高分屏偏弱，超过 2px 像硬描边；152° 模拟左上主光源、右下微弱回光 |
| 默认高光位 | `30%`, `-8%`, `opacity: 0.26` | 即使完全不挂 JS，静态页面也自带自然顶光；强度压在 0.26 防止与边缘折射亮带叠加发腻 |
| 弱机实底 | `rgba(16, 21, 29, 0.94)` | 摘掉 `backdrop-filter` 后必须立刻补足不透明度，否则文字会直接糊在底层内容上 |

## 5 实现落点

```
styles/glass.css:33   :root 变量定义（--mk-glass-blur / -sat / -tint / -r / -band / -x / -y / -o）
styles/glass.css:54   @property --mk-glass-x / --mk-glass-y（登记为 <percentage> 以支持 CSS 插值）
styles/glass.css:76   .mk-glass 基底（backdrop-filter + 四层 box-shadow）
styles/glass.css:96   .mk-glass.is-refract（叠加折射 filter 时重新补全 blur + contrast(1.12) + brightness(1.04)）
styles/glass.css:106  .mk-glass::before（双 mask 掏空形成连续斜向亮棱）
styles/glass.css:130  .mk-glass::after（screen 混合镜面高光）
```

## 6 降级契约

**走 `glass` 专属两档契约：冻，而不是关。**

- `prefers-reduced-motion: reduce`：材质本身、边缘亮线、静态高光与边缘折射**全部保留**（它们静止时不动），只停掉流动、按压与高光位移动画。
- 低端机 / 省电模式（`.mk-lite`）：摘掉 `backdrop-filter: none`（含折射滤镜），并立刻切为高不透明度实色底 `rgba(16, 21, 29, 0.94)` 保证文字可读。

## 7 容易做错的地方

**① 直接用 `border` 或 `border-image` 画斜向高光边。**
`border` 无法在圆角处平滑连续过渡，会断成四条直线；必须用 `::before` 铺满 + `padding: 1.5px` + 双 `mask` 掏空中间。

**② 忘了 Safari 的旧语法 `-webkit-mask-composite: xor`。**
标准属性是 `mask-composite: exclude`，但 Safari 的前缀版本值叫 `xor`，写错成 `exclude` 会导致整块卡片被白色渐变糊死。

**③ 叠加折射滤镜时漏重写 `blur()`。**
`backdrop-filter` 是整条覆盖而不是追加。加上 `url(#refract)` 时如果没把 `blur(6px) contrast(1.12) brightness(1.04) saturate(178%)` 一起写回去，背景模糊会突然消失，且重采样后的像素会发软发雾。

**④ 漏写 `isolation: isolate` 或 `pointer-events: none`。**
高光伪元素 `::after` 用了 `mix-blend-mode: screen`，不加 `isolation: isolate` 会穿透容器去混合外层页面背景；不加 `pointer-events: none` 会挡住玻璃里的按钮点击。

**⑤ 弱机摘掉 `backdrop-filter` 却不提高背景不透明度。**
原本 `rgba(255,255,255,0.068)` 在没模糊时几乎全透明，文字会直接和底层图文撞在一起不可读。

---

## 8 AI 提示词

**用途**：在任意项目里搭建一套不依赖重型库的液态玻璃基底材质（纯 CSS 即可成立，可叠加折射与交互高光）。

```text
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
```

**别让它做的**：

- 别把 `blur` 开到 20px–30px —— 过度模糊会让玻璃退化成灰板子，且叠加折射时完全看不出边缘弯曲。
- 别用 `border` 模拟高光边 —— 圆角处会断开，无法表现连续光源。
- 别在 `prefers-reduced-motion` 下删掉 `backdrop-filter` —— 静止材质不是动画，删掉会破坏导航栏层级可读性。
