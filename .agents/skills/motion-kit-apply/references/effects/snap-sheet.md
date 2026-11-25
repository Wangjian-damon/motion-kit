---
id: snap-sheet
name: 多档位弹层
nature: 权重
platform: touch
source: Vaul 的 snapPoints + Apple Maps 的三档面板
---

# 多档位弹层 (snap-sheet)

## 跨平台实现规范

实现一个多档位底部面板（snap points）。原生 Pointer Events + CSS 过渡，不引依赖。

原理一句话：档位是一组固定的位移落点，松手时把"当前位移 + 速度×一小段时间"投影成一个落点，
再取最近的档 —— 一套最近邻数学同时覆盖"慢慢拖"和"轻甩"。

结构：
  <div class="backdrop"></div>
  <div class="sheet" style="max-height: 82dvh">
    <div class="grabber" data-handle></div>
    ...内容...
  </div>

档位用「面板自身可见高度的比例」表示，升序，例如 [0.35, 0.62, 1]。
位移 = 高度 × (1 − 比例)：全开 0，完全收起 = 高度。

单指针拖动（只接主键 e.button === 0），pointerdown 时调 setPointerCapture，
这样手指移出元素也继续收到 move。

拖动中：transform = translate3d(0, clamp(当前档位移 + dy, 0, 高度), 0)，
并且该元素 transition: none。

松手：
1. 若是 pointercancel → 不做任何判定，直接滑回当前档（浏览器抢走手势不是用户松手）。
2. 若 velocity > 0.55 px/ms 且当前位移已到最低档（容差 1px）→ 关闭。
3. 否则取档：
     projected = clamp(offset + velocity * 160, 0, 高度)   // 160ms 投影窗口
     在 [各档位移..., 高度] 里找距离 projected 最近的；若最近的正好是最后那个
     (= 高度) → 关闭；否则吸附到该档位移。
4. 恢复过渡（transition: ''）后再写新的 transform，让过渡从当前跟手位置接管。

硬要求：
- 档位位移必须**用到时现算**（高度 × (1 − 比例)），不要在初始化时缓存 ——
  节点在 display:none 状态下 offsetHeight 是 0，缓存会让面板永远停在全开档。
- 位移一律走 transform，不要动 top / bottom / height。
- 投影结果必须 clamp 到 0..高度。不钳的话往上狂甩会算出负落点。
- 有档位时遮罩**不要**跟手变淡。档位之间是稳态，跟手淡出会让最低档看起来像快关了。
  遮罩只在真正关闭时过渡到 0。
- 关闭 = 滑到 translateY(100%)，然后通知调用方隐藏节点；组件自己不要 remove 节点。
- 调用方传初始档位时，下标按"排序后的档位数组"数；实现内部必须自己 sort 一次。

验收：
- 从最低档慢慢往上拖 27% 高度（正好到中档）→ 停在 62%，位移 = 高度 × 0.38。
- 再慢慢往上拖 38% 高度 → 停在 0（全开）。
- 从全开慢慢往下拖 20% 高度 → 回到 62%（不是直接关）。
- 在最低档往下轻甩（约 0.5px/ms，只拖 70px）→ 面板关闭。
- 慢慢往下拖 25% 高度（从 62% 出发）→ 停在最低档，不关。
- 拖到任意位置派发 pointercancel → 滑回拖动前那一档，不关闭。
- 关闭后重新打开 → 回到调用方指定的初始档，且没有"先闪一下全开"。

## 禁止做法

- 别用 height / max-height 做档位切换 —— 每帧重排，而且会打断内容滚动。
- 别把"拖得够远"和"甩得够快"写成两个并列的 if —— 它们要合成一个投影落点。
- 别在最低档只靠投影判断关闭 —— 最低档到关闭档隔着一整段高度，
  必须单独给"在最低档甩一把"开一条判定。
- 别给面板常驻 will-change: transform —— 拖动开始加、结束摘。
