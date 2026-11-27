---
id: confetti
name: 物理撒花礼炮
nature: 反馈
platform: both
source: 物理抛射礼炮（WAAPI 零依赖批量起播 + 抛物线重力坠落 + 播完自毁 DOM）
---

# 物理撒花礼炮 (confetti)

## 跨平台实现规范

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

## 禁止做法

- 别为了撒一次花引入几十 KB 的第三方粒子/Canvas 库。
- 别用纯随机角度不均匀分布 —— 容易在一侧扎堆、另一侧留白。
- 别在循环里边 appendChild 边 animate 读布局 —— 先批量建节点再统一起播。
