---
id: enter
name: 进场
nature: 节奏
platform: both
source: Framer Motion whileInView 的语义 + IntersectionObserver 的标准做法
---

# 进场 (enter)

## 跨平台实现规范

实现「滚动入场」：元素进入视口后位移 + 淡入一次。IntersectionObserver，不引依赖。

原理一句话：用可见性观察器决定"该入场了"，用 CSS 过渡做位移。时机与动画解耦，不要用滚动事件自己算位置。

结构：
  CSS 预隐藏（没有 JS 时由兜底保证可见，见下）：
    .enter { opacity: 0; transform: translate3d(0, 16px, 0);
             transition: opacity 380ms cubic-bezier(0.22,1,0.36,1),
                         transform 380ms cubic-bezier(0.22,1,0.36,1); }
    .enter.is-in { opacity: 1; transform: translate3d(0, 0, 0); }
    .enter.is-done { will-change: auto; }

行为：
- IntersectionObserver，threshold 0.15，rootMargin '0px 0px -8% 0px'
  （元素要再进视口 8% 才触发，避免动画一半发生在屏幕外）。
- 进入后 requestAnimationFrame 再加 .is-in —— 元素刚插入 DOM 就同帧加类
  会被浏览器合并，过渡直接从终态开始，动画静默失效。
- once 默认 true：触发后 unobserve。
- 环境没有 IntersectionObserver：立即对所有元素触发回调，保证内容可见。
  这是兜底的底线 —— 动画可以缺，内容不能消失。
- prefers-reduced-motion：跳过观察器直接加 .is-in。

级联（同批多个元素）：
- 按数组顺序给每个元素写内联 transition-delay = i * 70ms，封顶 600ms。
- 同样要在 rAF 后再加 is-in。
- 过渡结束（transitionend）后：加 .is-done 清 will-change，
  并把内联 transitionDelay 清成 '' —— 否则级联延迟会拖慢该元素
  之后的所有过渡（包括按压反馈），表现为整个页面交互慢半拍。
- transitionend 不总来（中断/时长被压到 1ms），用 setTimeout(900) 兜底。

硬要求：
- 初始隐藏只能写在 CSS 的 .enter 类上，JS 不做预隐藏 ——
  JS 失败时元素必须是可见的。
- will-change 只在动画期间存在，.is-done 必须释放。
- 不要把这个类加在自身被 transform 驱动的元素（tilt/磁吸）上，
  初始态的 translate3d 会覆盖它们的 transform。

验收：
- 刷新页面：首屏元素立即入场（不等滚动）；下方元素滚到 15% 露出才入场。
- 级联：同批 5 个元素依次相差 70ms；第 10 个元素 delay 不超过 600ms。
- 入场完成后 getComputedStyle(el).transitionDelay 为 '0s'，
  will-change 为 auto。
- 禁用 JS：内容全部可见（只有动画缺失）。
- prefers-reduced-motion：无位移无淡入，内容直接可见。

## 禁止做法

- 别用 `scroll` 事件 + `getBoundingClientRect` 逐帧判断——
  IntersectionObserver 由合成器调度，不占主线程，这是入场效果唯一正确的入场券。
- 别给首屏元素也配 delay——首屏的级联延迟是白等的，首屏只该有一个整体的错相。
- 别把入场做成"退场对称"——离开视口再播一次退场动画是反模式，
  用户往上回滚时会看到内容反复消失又出现。
