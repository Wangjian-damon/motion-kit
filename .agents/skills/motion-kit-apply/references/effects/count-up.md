---
id: count-up
name: 数字滚动 / 里程表
nature: 节奏
platform: both
source: 大屏看板与营销页的数字登场（count-up.js）+ 机场翻牌/里程表的"每位一列"
---

# 数字滚动 / 里程表 (count-up)

## 跨平台实现规范

实现两条数字动画，同一文件里二选一。

原理一句话：数值插值。两种做法二选一 —— 每帧算一个数并重绘文字，或只写一次 transform 让合成器补齐。前者通用，后者能扛几十个同时跳。

A. countUp（逐帧计算，通用）：
- easeOutCubic：v = from + (to-from) * (1 - Math.pow(1-t, 3))，t = 已过时长/总时长。
- 时长 900ms，rAF 驱动。
- 每帧回调 onUpdate(格式化后的字符串)；格式化交给调用方传 format。
- 最后一帧必须直接写 format(to)（精确值），不许让浮点误差显示成 99.9987。
- 返回 { cancel, promise }：cancel 停帧并 resolve；promise 在完成后 resolve，
  调用方用来串后续动作。
- prefers-reduced-motion：不启动 rAF，第一帧直接 onUpdate(最终值)，
  promise 立即 resolve。

B. odometer（翻牌列，高性能）：
- 把值转成字符串，每个字符一列；数字位建一列 0-9 再补一个回绕的 0（共 11 格），
  transform: translateY(-digit em)；小数点/逗号/负号是静态占位不滚动。
- 只写一次 transform，滑动交给 CSS transition（560ms ease-out）。
- 容器 height: 1em、line-height: 1、每个格子 flex-basis: 1em ——
  em 单位要求整条内 font-size 统一。
- 重建/挂载时先加 .static（transition: none），下一帧再摘 ——
  否则新列会从 0 滑到目标位，看起来像在倒转。
- update(next)：字符串长度不变 → 就地改各列 transform；
  长度变了 → 整体重建（调用方应先用等长占位起步）。
- prefers-reduced-motion：transition 恒为 none。

格式化（两路共用）：
- 千分位 + 小数位 + 前后缀；只接受 number 入参。
- 所有数字展示必须 tabular-nums（font-variant-numeric），
  否则变宽会把右边排版推来推去。

硬要求：
- 两条路都不做增减方向动画（+绿/-红）；那是调用方的展示层。
- Web 端每帧回调；小程序/Taro 端的节流放在适配层，核心不感知平台。
- reduced 下两条路都要立即呈现终值。

验收：
- countUp 到 100：最后一帧显示值恰好是 format(to)，无 99.9987。
- odometer 从 9 滚到 0：该位向下顺滑回绕，不向上倒转。
- 同屏 40 个 odometer 同时 update：无掉帧（rAF 期间无额外 DOM 写入）。
- reduced：数字直接出现，无任何动画帧。
- 金额 1234567.891，decimals 2 → "1,234,567.89"。

## 禁止做法

- 别在 format 里做副作用（写 DOM、发请求）——它每帧被调，副作用会被放大 60 倍。
- 别给 countUp 用弹簧/过冲——数字"超过目标再回来"读起来是显示错误，
  过冲留给 `detent` 那类物理控件。
- 别把 odometer 的列数做成响应式重建——位数变化才重建，
  每次 update 都重建等于放弃了它"只写一次 transform"的全部优势。
