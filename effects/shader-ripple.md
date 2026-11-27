---
id: shader-ripple
name: WebGL 光学水波纹折射
layer: webgl
nature: 反馈
platform: both
status: shipped
entry: MK.shaderRipple(host, opts) + .mk-shader.mk-shader--ripple
source: 光学水面涟漪折射（6 槽环形池 + 正弦高斯波包位移 + 波峰高光与轻微色散，零 Three.js）
---

## 1 一句话

点击或触碰表面时，片元着色器从触点向外扩散一圈带高斯包络的物理水波，实时折弯底层纹理并叠加波峰高光与轻微色散；支持 6 道波纹并发叠加与自动过期复用。

## 2 交互问题

**普通 CSS 点击涟漪只是一个半透明白圆放大淡出，缺少“液体表面真的被按出波纹并折弯光线”的沉浸感。** 在互动封面、创意卡片或音视频表面，用 6 槽 uniform 数组在 GPU 上实时叠加多道水波位移，点击哪里就从哪里荡开一圈真实光学涟漪。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 高斯包络调制正弦波 `exp(-k²*120) * sin(k*70) * fade²`，既有波峰波谷又自然消散 | 昂贵的双缓冲 FBO 流体纳维-斯托克斯求解器 |
| 6 槽固定 `uniform vec3 u_rip[6]`（`x, y, startTime`），纯函数 `rippleSlot()` 优先复用过期槽 | 无限增长的波纹数组导致 shader 循环失控 |
| 按位移幅度叠一点色散 + 波峰高光，水面折射感立竿见影 | 过度扭曲把底层画面拉扯成马赛克 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 并发槽数 | `6` | 连续快点 6 下均可完整同屏叠加干涉；超出后自动覆盖最老的一道波，片元开销恒定可控 |
| 波纹寿命 `LIFE` | `2.2s` | 刚好够一圈水波优雅扩散过整个卡片并自然消隐，不显得戛然而止 |
| 波速 | `0.42` 归一化单位/秒 | 类似平静水面的扩散速度，快于 0.8 像冲击波、慢于 0.2 像粘稠糖浆 |
| 折射强度 | `0.02` UV 位移 | 足够明显折弯背后条纹又保持清晰优雅，超过 0.06 会撕裂变形 |

## 5 实现落点

```
src/core/shader.js:43    rippleEnvelope(age, life)       纯函数，平方衰减包络（可单测）
src/core/shader.js:50    rippleSlot(starts, now, life)   纯函数，槽位分配与最老覆盖（可单测）
src/core/shader.js:146   RIPPLE_FRAG                     6 槽并发光学水波 + 高光 + 色散 GLSL
src/core/shader.js:349   shaderRipple(host, opts)        pointerdown 触发 + 闲置偶发环境滴落
styles/webgl.css:54      .mk-shader--ripple              静态条纹渐变兜底
```

## 6 降级契约

**走 `webgl` 层专属契约：退回静态条纹渐变 + 减弱动效单帧冻结。**

- `prefers-reduced-motion: reduce`：不触发水波动画、不跑环境滴落，保持安静静态画面。
- 不支持 WebGL 或 `webglcontextlost` 时显示容器静态 CSS 条纹渐变底图。

## 7 容易做错的地方

**① 忘记把点击的屏幕 Y 坐标翻转成 WebGL 坐标系（Y 轴向上）。**
DOM `clientY` 从顶向下递增，而 GLSL `gl_FragCoord.y` 从底向上递增；必须计算 `uvY = 1 - (clientY - rect.top) / rect.height`，否则点上面波纹从下面冒出来。

**② 没按宽高比 `aspect = u_res.x / u_res.y` 修正距离向量。**
宽卡片里直接算 `length(uv - center)` 会把圆形水波拉成扁椭圆；必须先把 X 差值乘以 `aspect` 再求长度。

**③ 没对 `length(d)` 做 `max(dist, 1e-4)` 保护。**
波心处 `d = (0, 0)`，直接做 `d / dist` 会在波纹中心产生 `NaN` 黑点。

---

## 8 AI 提示词

**用途**：在任意技术栈里实现零 Three.js 依赖、支持多点并发干涉的原生 WebGL 光学水波纹折射效果。

```text
实现零 Three.js 依赖的原生 WebGL 光学水波纹折射效果（Optical Water Ripple Shader）。

原理一句话：维护 6 槽固定 uniform vec3 u_rip[6]（x, y, startTime），片元着色器将每道活跃水波的高斯正弦波包合成径向 UV 位移来折弯底层纹理，并叠加波峰高光与轻微色散。

做法：
1. 纯函数槽位管理（寿命 LIFE = 2.2s）：
   - rippleSlot(starts, now, life = 2.2)：优先返回空槽（< 0）或已过期槽（now - s >= life），若全忙则覆盖最早的槽。
   - rippleEnvelope(age, life = 2.2)：age 在 [0, life) 内返回 (1 - age / life)²，否则 0。
2. 指针坐标换算（关键：Y 轴翻转）：
   - pointerdown 时算 x = (e.clientX - rect.left) / rect.width，y = 1 - (e.clientY - rect.top) / rect.height，写入选中槽位 (x, y, currentTimeSec)。
3. 片元着色器（DPR <= 1.5，离屏/后台双停帧，卸载释放 context）：
   - asp = u_res.x / u_res.y；遍历 6 槽跳过无效或超时项。
   - d = (uv - rp.xy) * vec2(asp, 1.0)；dist = length(d)；k = dist - age * 0.42；
   - fade = 1.0 - age / 2.2；env = exp(-k * k * 120.0) * fade * fade；w = sin(k * 70.0) * env；
   - disp += (d / max(dist, 1e-4)) * w * 0.02；hi += env * max(w, 0.0)；
   - 用 suv = uv + disp 采样底层纹理/程序化条纹，叠加轻微色散与 hi * 0.55 高光。

硬要求：
- 必须翻转 Y 坐标（1 - clientY_norm）并按宽高比修正距离向量，保证触点精准且波纹为正圆。
- 波心除法必须用 max(dist, 1e-4) 防止 NaN 黑点。
- 并发槽数固定上限（6 槽），严禁动态无限增长循环。
- 必须含 DPR<=1.5、离屏/后台停帧、卸载 loseContext 与 CSS 静态兜底；prefers-reduced-motion 下停止动画。

验收：
- 点击画布任意位置，严格正圆水波精准从点击点向外扩散 2.2s，肉眼可见底层纹理被波峰折弯并带柔和光泽。
- 连续快点 6 次以上，多道波纹自然叠加干涉、不卡顿不溢出，最老槽平滑复用。
- 滚出视口或切后台 rAF 停止；不支持 WebGL 时平滑回退 CSS 静态底纹。
```

**别让它做的**：

- 别忘了翻转 Y 坐标 —— 否则点上半区水波从下半区炸出来。
- 别在非正方形画布里省掉 `aspect` 修正 —— 水波会被拉扁成椭圆。
- 别在波心直接写 `normalize(d)` 或 `d / length(d)` —— 中心点 `0/0` 会冒出一个永久黑像素。
