"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Tilts its children up out of the page as they scroll into view: they start
 * leaning back in 3D, a little smaller and faded, and straighten as they reach
 * the middle of the screen. Driven by scroll position (not a one-off
 * animation), so scrolling back reverses it. Off for reduced motion.
 */
export function Scroll3D({
  children, className, strength = 1,
}: {
  children: React.ReactNode;
  className?: string;
  /** 1 = default tilt; smaller is subtler. */
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the top edge is at the bottom of the screen, 1 by the time it's ~40% up.
      const progress = (vh - r.top) / (vh * 0.6);
      setP(Math.max(0, Math.min(1, progress)));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const k = (1 - p) * strength;
  return (
    <div className="[perspective:1400px]">
      <div
        ref={ref}
        className={className}
        style={{
          transform: `rotateX(${k * 22}deg) translateY(${k * 60}px) scale(${1 - k * 0.08})`,
          opacity: 0.35 + p * 0.65,
          transformOrigin: "center top",
          willChange: "transform, opacity",
        }}
      >
        {children}
      </div>
    </div>
  );
}
