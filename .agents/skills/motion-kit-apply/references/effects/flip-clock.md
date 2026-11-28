---
id: flip-clock
name: 3D 机械翻页时钟 / 翻牌器
nature: 节奏
platform: both
source: Braun / 机场出发屏机械翻牌（上下独立裁切静页 + 居中水平转轴两段接力翻折 + 折角亮度压暗）
---

# 3D 机械翻页时钟 / 翻牌器 (flip-clock)

## 跨平台实现规范

实现零依赖的 3D 机械翻页时钟 / 翻牌器（Split-Flap 3D Mechanical Flip Card）。

原理一句话：每位翻牌由上静页、下静页、上翻叶、下翻叶四层构成，内部文字高度 200% 各自裁切上下半；数值变化时仅变更位触发两段 90° 3D 接力翻折（重力加速下折 + 减速着陆 + 折角压暗阴影）。

做法：
1. 纯函数 splitFlapDigits(value, pad = 2)：
   - pad 钳制在 [1, 8]；数字取 Math.max(0, Math.floor(value))（非有限数按 0）左侧补零截断为定长数组；字符串转大写去非字母数字后补零截断。
2. 四层 DOM 与 CSS 3D 结构（单格 perspective: 420px，居中 1.5px 铰链黑缝）：
   - 上静页 / 上翻叶：top: 0; height: 50%; overflow: hidden; 内层文字 height: 200%; top: 0;
   - 下静页 / 下翻叶：bottom: 0; height: 50%; overflow: hidden; 内层文字 height: 200%; bottom: 0;
   - 两片翻叶均设 backface-visibility: hidden；上翻叶 transform-origin: 50% 100%，下翻叶 transform-origin: 50% 0% 且默认 rotateX(90deg)。
3. 严密四层赋值与两段接力动画（仅当 next[i] !== cur[i] 时触发）：
   - 翻转起点：上静页 = 新字，下静页 = 旧字，上翻叶 = 旧字，下翻叶 = 新字；
   - 上翻叶 220ms cubic-bezier(0.55, 0.05, 0.9, 0.6)：rotateX(0deg) brightness(1) -> rotateX(-90deg) brightness(0.45)；
   - 下翻叶 220ms 延迟 215ms cubic-bezier(0.16, 1, 0.3, 1)：rotateX(90deg) brightness(0.55) -> rotateX(0deg) brightness(1)；
   - 460ms 结束后将下静页与上翻叶同步为新字并移除翻转态类。
4. 降级与清理：
   - prefers-reduced-motion: reduce 禁用两段翻折关键帧，直接完成数值更新。
   - destroy() 清理全部未完成 timer 防止内存泄漏。

硬要求：
- 必须严格按四层时序更新文字，确保翻折前后与中点瞬间绝不出现新旧字穿帮。
- 仅发生变化的位触发翻页，未变位严禁重播动画；数字必须开启 tabular-nums。
- 翻页叶必须设置 backface-visibility: hidden 与折角压暗阴影。

验收：
- 倒计时或点击 +1 / 随机切换时，只有变动的位数发生干脆利落的机械翻折，未变动位纹丝不动。
- 翻折经过 90° 中缝时有真实阴影变暗与无缝接力，无白闪、无镜像反字。
- 开启减弱动效后数值干净切换无晃动；卸载后无残留定时器报错。

## 禁止做法

- 别用单个 `div` 直接 `rotateX(-180deg)` 假装翻牌 —— 真实翻牌是上下两半在水平中缝处翻折，整卡旋转会失去机械感且字会上下颠倒。
- 别在只变个位时把十位、百位也一起翻一遍 —— 极其吵闹且违背物理机械结构。
- 别忘了在上下翻页交界留 `5ms` 重叠（`220ms` 与 `215ms` 延迟）—— 严丝合缝设为 `220ms` 时部分浏览器帧对齐会漏出 1 帧黑缝。
