---
id: shader-ripple
name: WebGL 光学水波纹折射
nature: 反馈
platform: both
source: 光学水面涟漪折射（6 槽环形池 + 正弦高斯波包位移 + 波峰高光与轻微色散，零 Three.js）
---

# WebGL 光学水波纹折射 (shader-ripple)

## 跨平台实现规范

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

## 禁止做法

- 别忘了翻转 Y 坐标 —— 否则点上半区水波从下半区炸出来。
- 别在非正方形画布里省掉 `aspect` 修正 —— 水波会被拉扁成椭圆。
- 别在波心直接写 `normalize(d)` 或 `d / length(d)` —— 中心点 `0/0` 会冒出一个永久黑像素。
