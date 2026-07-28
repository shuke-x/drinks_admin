// ------------------------------------------------------------------
// react-bits 风格动效组件(reactbits.dev 的组件以「复制进项目」方式分发,
// 这里是零依赖的本地实现,API 与官方同名组件保持一致的使用习惯)。
// 样式定义见 styles.css 中的 .rb-* 部分;均已适配 prefers-reduced-motion。
// ------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';

/** SplitText —— 逐字上浮入场 */
export function SplitText({ text = '', delay = 34, className = '', as: Tag = 'span' }) {
  const chars = useMemo(() => [...String(text)], [text]);
  return (
    <Tag className={`rb-split ${className}`} aria-label={text}>
      {chars.map((ch, i) => (
        <span key={`${i}-${ch}`} aria-hidden="true" className="rb-split__char" style={{ animationDelay: `${i * delay}ms` }}>
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </Tag>
  );
}

/** CountUp —— 数字滚动 */
export function CountUp({ value = 0, duration = 900, className = '' }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = Number(value) || 0;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = Math.round(from + (to - from) * eased);
      setDisplay(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={`rb-countup ${className}`}>{display.toLocaleString()}</span>;
}

/** SpotlightCard —— 鼠标追光卡片 */
export function SpotlightCard({ className = '', children, ...rest }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--rb-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--rb-y', `${e.clientY - rect.top}px`);
  };
  return (
    <div ref={ref} onMouseMove={onMove} className={`rb-spotlight ${className}`} {...rest}>
      {children}
    </div>
  );
}

/** Aurora —— 暖色流动光晕背景 */
export function Aurora({ className = '' }) {
  return (
    <div className={`rb-aurora ${className}`} aria-hidden="true">
      <span className="rb-aurora__blob rb-aurora__blob--a" />
      <span className="rb-aurora__blob rb-aurora__blob--b" />
      <span className="rb-aurora__blob rb-aurora__blob--c" />
    </div>
  );
}

/** FadeContent —— 淡入上移容器 */
export function FadeContent({ delay = 0, className = '', children }) {
  return (
    <div className={`rb-fade ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** ShinyText —— 流光文字 */
export function ShinyText({ text, className = '' }) {
  return <span className={`rb-shiny ${className}`}>{text}</span>;
}

/**
 * ImageTrail —— 光标拖影卡片(官方同名组件的零依赖实现)。
 * items 为一组 React 节点(卡片池);光标在容器内每移动 threshold 距离,
 * 就在光标处「甩出」池中的下一张卡片,弹起后自行淡出。
 * 触屏 / prefers-reduced-motion 环境自动降级为可横滑的静态卡片列。
 */
export function ImageTrail({ items = [], threshold = 52, className = '', children }) {
  const zoneRef = useRef(null);
  const idxRef = useRef(0);
  const lastRef = useRef({ x: null, y: null });
  const [interactive, setInteractive] = useState(true);

  useEffect(() => {
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setInteractive(Boolean(fine) && !reduced);
  }, []);

  const onMove = (e) => {
    const zone = zoneRef.current;
    if (!zone || items.length === 0) return;
    const rect = zone.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { x: lx, y: ly } = lastRef.current;
    if (lx !== null && (x - lx) ** 2 + (y - ly) ** 2 < threshold * threshold) return;
    lastRef.current = { x, y };

    const pool = zone.querySelectorAll('.rb-trail__item');
    if (!pool.length) return;
    const el = pool[idxRef.current % pool.length];
    idxRef.current += 1;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.zIndex = String(10 + (idxRef.current % 90)); // 新卡片盖在旧的上面
    el.style.setProperty('--rb-rot', `${(Math.random() * 16 - 8).toFixed(1)}deg`);
    el.classList.remove('is-live');
    void el.offsetWidth; // 强制重排,重启 CSS 动画
    el.classList.add('is-live');
  };

  if (!interactive) {
    return (
      <div className={`rb-trail rb-trail--static ${className}`}>
        {children}
        <div className="rb-trail__fallback">
          {items.map((node, i) => (
            <div key={i} className="rb-trail__fallback-item">{node}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={zoneRef}
      className={`rb-trail ${className}`}
      onPointerMove={onMove}
      onPointerLeave={() => { lastRef.current = { x: null, y: null }; }}
    >
      {children}
      {items.map((node, i) => (
        <div key={i} className="rb-trail__item" aria-hidden="true">{node}</div>
      ))}
    </div>
  );
}
