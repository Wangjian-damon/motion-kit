---
id: shader-metaballs
name: WebGL 3D 液态水银融合球
layer: webgl
nature: 连续
platform: both
status: shipped
entry: MK.shaderMetaballs(host) + .mk-shader.mk-shader--metaballs
source: Inigo Quilez 多项式 Smooth-Min 3D Metaballs（5 颗公转液滴 + 1 颗指针引力液滴 + 42 步 SDF 射线步进与镜面虹彩反射）
---

## 1 一句话

零 Three.js、零网格重构，用多项式平滑最小函数 `smin(d1, d2, k)` 把 5 颗公转 3D 球体与 1 颗随鼠标游走的引力液滴在片元着色器里实时融合成一团拉丝粘连的液态水银。

## 2 交互问题

**想做会“靠拢融合、拉开拉丝”的 3D 液态球（Metaballs），如果走传统 3D 引擎需要每帧在 CPU 上跑 Marching Cubes 重建上万个三角形网格，手机直接发烫掉帧。** 在 SDF 射线步进里，融合两颗球体只需一行多项式 `smin`，计算量几乎等于免费，且融合颈部自带无穷光滑的液态镜面过渡。

## 3 手感来源

| 取什么 | 丢什么 |
|---|---|
| 多项式平滑最小 `smin(a, b, k)`（`k = 0.36–0.42`），C1 连续且绝不出现生硬接缝折痕 | CPU 端 Marching Cubes 网格重建与低面数多边形棱角 |
| 6 颗液滴中的第 6 颗跟随阻尼指针游走（`k = 0.42` 略大粘连半径），手一靠近就能“粘起”拉丝 | 纯观赏背景不响应用户交互 |
| 基于反射向量 `reflect(-v, n)` 采样紫/蓝/荧光绿三色环境反射 + 48 次方锐利高光 | 单一漫反射显得像橡皮泥而不是水银 |

## 4 参数与为什么

| 参数 | 值 | 为什么是这个值 |
|---|---|---|
| 平滑融合半径 `k` | 轨道球 `0.36` / 指针球 `0.42` | 略大于球半径（`0.23–0.30`），两球靠近至 0.6 倍直径时自然起粘连液桥，分开时干净拉断 |
| 射线步进预算 | `42` 步 / `d < 0.002` / `dist > 5.0` | 球体组 SDF 梯度平缓，42 步即可稳定收敛至清晰轮廓并保持移动端 60fps |
| 高光幂次与 Fresnel | `spec pow 48` / `fres pow 3.0` | 锐利高光点确立“液态水银”质感，边缘虹彩 Fresnel 让球体在暗底中清晰浮现 |
| 透明背景与微光 | 未命中输出中心淡紫蓝径向光晕 | 可无框悬浮在任意卡片、登录区或 AI 助手顶栏上 |

## 5 实现落点

```
src/core/shader.js:140   smoothMin(a, b, k)        多项式 Smooth-Min 纯函数（可单测）
src/core/shader.js:882   METABALLS_FRAG            6 球 SDF 融合 + 42 步射线步进 + 水银反射 GLSL
src/core/shader.js:949   shaderMetaballs(host)     复用 shaderCanvas（DPR 1.5 + 双停帧 + 释放 context）
styles/webgl.css:89      .mk-shader--metaballs     WebGL 不可用时的双球交融 CSS 径向渐变兜底
```

## 6 降级契约

**走 `webgl` 层专属契约：退回 CSS 渐变 + 减弱动效单帧冻结。**

- `prefers-reduced-motion: reduce`：仅绘制一帧静态液态水银雕塑，不启动 rAF 循环，不响应鼠标拖拽液滴。
- WebGL 不可用或上下文丢失时隐藏 `<canvas>`，展示容器双色交融径向渐变兜底。

## 7 容易做错的地方

**① 直接用 `min(d1, d2)` 拼接球体而没用 `smin`，球与球相交处出现生硬折线。**
硬 `min` 是刚体并集，没有液态张力；必须使用二次多项式 `h = max(k - abs(a - b), 0) / k; min(a, b) - h*h*k*0.25` 才能产出饱满的液态粘连颈部。

**② 指针引力球直接硬跟 `e.clientX/Y`，鼠标一划液滴像瞬移传送。**
指针 UV 必须经过 `mouse += (target - mouse) * 0.08` 指数阻尼，才能产生“把水银拖过来又慢慢拉断”的流体重量感。

**③ 没做 DPR 封顶与总像素上限，在 3× 屏跑满像素拖垮帧率。**
射线步进对像素数极度敏感，必须将 DPR 压在 `1.5` 且总像素 `<= 1,200,000`。

---

## 8 AI 提示词

**用途**：在任意技术栈里实现零 Three.js、支持鼠标吸附拉丝的原生 WebGL 3D 液态水银融合球。

```text
实现零 Three.js 依赖的原生 WebGL 3D 液态水银融合球（3D Raymarched Metaballs）。

原理一句话：在透明全屏三角形片元着色器里，用多项式平滑最小 smin(a, b, k) 将 5 颗 3D 轨道球与 1 颗阻尼跟随指针的引力球融合成连续液态曲面，以 42 步射线步进 + 中心差分法线 + 反射向量环境光渲染出水银镜面拉丝质感。

做法：
1. 纯函数 smoothMin(a, b, k = 0.35)：
   - 若 k <= 0 返回 Math.min(a, b)；否则 h = Math.max(k - Math.abs(a - b), 0) / k，返回 Math.min(a, b) - h * h * k * 0.25（C1 连续且严格 <= min(a, b)）。
2. 原生 WebGL 工程约束：
   - 单全屏三角形 + alpha: true + powerPreference: 'low-power'；DPR <= 1.5 且画布总像素 <= 1,200,000。
   - 接 ResizeObserver、IntersectionObserver（离屏停帧）与 visibilitychange（后台停帧）；destroy() 删除 buffer/program 并主动 loseContext。
3. GLSL 核心：
   - 短边归一化坐标：uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y)；相机 ro = vec3(0, 0, 2.45)，射线 rd = normalize(vec3(uv, -1.7))。
   - 场景 SDF mapBalls(p, t)：5 颗沿不同相位三角函数轨迹公转的 3D 球（半径 0.23–0.30）加第 6 颗指针球 cm = vec3((u_mouse.x - 0.5)*1.45, (u_mouse.y - 0.5)*1.1, 0.28)，依次用 smin(d, ..., 0.36..0.42) 融合。
   - 最多 42 步射线步进，d < 0.002 判命中，dist > 5.0 退出；未命中返回中心柔和微光。
   - 命中后用 e = 0.0028 的 6 点中心差分求法线 n，计算反射向量 rdir = reflect(-v, n) 混合紫/蓝/荧光绿环境色，叠加 48 次方镜面高光与 3.0 次方 Fresnel 轮廓亮边。
4. 指针阻尼与降级：
   - 指针坐标每帧 mouse += (target - mouse) * 0.08 平滑逼近，移出容器自动回中。
   - prefers-reduced-motion: reduce 仅渲染一帧静态雕塑，不起 rAF；context lost 或不支持时隐藏 canvas 展示 CSS 径向渐变兜底。

硬要求：
- 严禁引入 Three.js 或使用 CPU Marching Cubes 网格重建。
- 必须使用多项式 smin 实现平滑拉丝融合，禁止硬 min 刚体拼接。
- 必须落齐 DPR 封顶、离屏/后台双停帧与 destroy 释放 context。

验收：
- 多颗液态金属球在 3D 空间自由穿梭、靠拢时自然粘连起液桥、远离时顺滑拉断，表面有清晰水银镜面高光。
- 鼠标移入时引力液滴以阻尼黏附拉扯主球团，移出后柔和回落中央。
- 滚出视口、切后台或开启减弱动效时 rAF 自动停止；卸载无 WebGL context 泄漏。
```

**别让它做的**：

- 别用 `min(d1, d2)` 代替 `smin` —— 球体相交只会留下一圈硬棱线，完全没有液态融合感。
- 别在 JS 里每帧运行 Marching Cubes 生成三角形 —— 体积大且移动端必掉帧。
- 别让指针球零阻尼硬跟鼠标 —— 失去流体惯性与拉丝重量感。
