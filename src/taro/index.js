/**
 * taro/index.js — Taro / 微信小程序适配层。
 *
 * 小程序没有 DOM、没有 IntersectionObserver 的 DOM 版本、每帧 setData 会卡。
 * 所以这里的策略是：
 *   1. 入场 = 切 class，动画交给 CSS（WXSS 里写好 .mk-enter / .mk-in）
 *   2. 视口检测 = Taro.createIntersectionObserver（原生能力，不占 JS 线程）
 *   3. 数字滚动 = 按 60ms 节流 setData，不是每帧
 *   4. 倾斜/磁吸 = 直接关闭（触屏上本来就不该有）
 *
 * 用法：
 *   const { inView: entry } = useEnter()
 *   <view :class="['mk-enter', entry && 'mk-in']">...</view>
 */
import { ref, onMounted, onUnmounted, getCurrentInstance } from 'vue';
import Taro from '@tarojs/taro';
import { durations } from '../tokens.js';

/**
 * 视口检测。返回 { inView, bind }，bind 是绑定到元素的 ref。
 * @param {object} [opts]
 * @param {number} [opts.threshold=0.15]
 * @param {boolean} [opts.once=true]
 * @param {string} [opts.relativeToViewport] 传 '-80px 0px' 之类做提前触发
 */
export function useEnter(opts = {}) {
  const visible = ref(false);
  const el = ref(null);
  let observer = null;

  const observe = () => {
    // #ifdef H5
    // H5 端 Taro 的 createIntersectionObserver 可用，但直接用原生更省事
    if (!el.value) return;
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            visible.value = true;
            if (opts.once !== false) observer.disconnect();
          } else if (opts.once === false) {
            visible.value = false;
          }
        }
      },
      { threshold: opts.threshold ?? 0.15 },
    );
    observer.observe(el.value);
    // #endif

    // #ifndef H5
    if (!el.value) return;
    const inst = getCurrentInstance();
    const ctx = inst?.proxy;
    if (!ctx) return;
    observer = Taro.createIntersectionObserver(ctx, {
      thresholds: [opts.threshold ?? 0.15],
      observeAll: false,
    });
    if (opts.relativeToViewport !== false) {
      observer.relativeToViewport(
        typeof opts.relativeToViewport === 'string' ? opts.relativeToViewport : { bottom: -60 },
      );
    }
    observer.observe(`#${el.value.id || el.value.uid}`, (res) => {
      const hit = res.intersectionRatio > 0 || res.intersectionRect.height > 0;
      if (hit) {
        visible.value = true;
        if (opts.once !== false) observer.disconnect();
      } else if (opts.once === false) {
        visible.value = false;
      }
    });
    // #endif
  };

  onMounted(observe);
  onUnmounted(() => observer?.disconnect?.());

  return { inView: visible, bind: el };
}

/**
 * 数字滚动（小程序版）。回调式，由调用方写进 data。
 * 60ms 一帧 ≈ 16fps，小程序上肉眼看不出差别，但 setData 次数少一个数量级。
 */
export function useCountUp({ from = 0, to = 0, duration = 900, onUpdate, step = 60 } = {}) {
  const value = ref(from);
  let timer = null;

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const start = () => {
    const begin = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - begin) / duration, 1);
      const v = from + (to - from) * easeOutCubic(p);
      value.value = p === 1 ? to : Math.round(v * 100) / 100;
      onUpdate?.(value.value);
      if (p < 1) timer = setTimeout(tick, step);
    };
    tick();
  };

  onUnmounted(() => timer && clearTimeout(timer));
  return { value, start, stop: () => timer && clearTimeout(timer) };
}

/**
 * 列表入场延迟：给第 i 项算 transition-delay。
 * 直接绑到 style 上：:style="{ transitionDelay: delay(i) + 'ms' }"
 */
export function useStagger(step = 70, cap = 600) {
  return (i) => Math.min(i * step, cap);
}

/** 主题值同步给小程序（小程序不支持 CSS 变量继承到自定义组件时用） */
export const taroTokens = {
  durationEnter: durations[3],
  durationFast: durations[2],
  easeOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
};

export * from '../tokens.js';
export * from '../spring.js';
export * from '../core/motion-pref.js';
