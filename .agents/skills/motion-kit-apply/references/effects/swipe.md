---
id: swipe
name: 左滑操作
nature: 方向
platform: touch
source: iOS 列表的左滑删除（body 滑开露出底下固定宽度的操作区）
---

# 左滑操作 (swipe)

## 跨平台实现规范

实现 iOS 式的左滑操作行。Pointer Events + touch-action，不引依赖。

原理一句话：横向指针位移写进 translate3d，松手按阈值吸附到开/关两态。没有物理，只有位移钳制 + 一个过渡。

结构（三层）：
  <div class="swipe">                    /* overflow: hidden 的裁剪容器 */
    <div class="swipe__action">删除</div>  /* 铺底，绝对定位 right:0，不动 */
    <div class="swipe__body">…</div>       /* 唯一被位移的行内容 */
  </div>

行为：
- 只给 body 挂 pointer 拖拽（axis: x），并在 body 上设 touch-action: pan-y ——
  竖向滚动完全交给浏览器（惯性、回弹都是原生的），
  只有横向位移会到 JS。不要在容器上设 touch-action，不要 preventDefault。
- 拖动中加 .dragging：body 的 transform 过渡此时必须关掉（跟手零延迟），
  松手摘类恢复 240ms 过渡落位。
- 位移 = clamp(基准 + dx, -actionWidth, 0)。基准在拖拽开始时确定：
  已打开是 -actionWidth，否则 0。actionWidth 读 offsetWidth，不写死。
- 松手判定：x < -actionWidth * 0.4（拖过 40%）或 velocity < -0.4 px/ms
  （向左快甩，注意负号是方向）→ 打开；否则关闭。
- 速度必须复用同一个拖拽器算出的那份（px/ms，e.timeStamp 做分母）。
- 操作区按钮的 click 直接调 onDismiss 回调。

硬要求：
- transform 用 translate3d(x, 0, 0)，只有 body 动，操作区不动。
- 已打开时往右拖，要能拖回关闭位；向右快甩不允许触发打开（速度方向判定）。
- 左滑无橡皮筋：clamp 的下界就是 -actionWidth，不要做过滚。
- teardown 摘监听、归位。

已知限制（写进注释）：不做"打开 A 行自动关 B 行"和"滚动列表自动收起"——
那是列表组件层的事，手势核心只负责一行。

验收：
- 慢拖过 50% 松手 → 停在打开位；慢拖到 30% 松手 → 弹回关闭。
- 轻快向左一甩（不足 40%）→ 打开。
- 打开后向右拖回 0 → 关闭；向右快甩 → 仍关闭（不会误开）。
- 行内上下滚动列表：行不动、页面正常滚，无掉帧。
- 打开状态下再按住拖动：从 -width 基准开始，不跳变。

## 禁止做法

- 别用 `overflow-x: scroll` + scroll-snap 模拟——snap 停靠位置没法和
  "40% 或甩速"的双判定对齐，而且拿不到松手速度。
- 别把删除直接做进手势（拖过阈值就删）——**打开位先确认再点**是安全设计，
  拖过即删的操作不可撤销，iOS 自己都不这么做。
- 别让 body 和 action 各自动画——只有 body 有 transform，
  action 是背景，动了就露馅。
