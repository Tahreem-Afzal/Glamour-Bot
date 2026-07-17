import { useState, useRef, useCallback, useLayoutEffect } from "react";
import { COLORS } from "../styles.js";

/**
 * Drag-to-compare slider. `before` and `after` are image URLs (object
 * URLs, data URLs, or regular URLs all work). Works with mouse, touch,
 * and pen input via the Pointer Events API.
 */
export default function BeforeAfterSlider({ before, after, height = 420 }) {
  const [pos, setPos] = useState(50); // percent from the left
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef(null);
  const draggingRef = useRef(false);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const updateFromClientX = useCallback((clientX) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  }, []);

  const onPointerDown = (e) => {
    draggingRef.current = true;
    e.target.setPointerCapture?.(e.pointerId);
    updateFromClientX(e.clientX);
  };
  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };
  const onPointerUp = () => {
    draggingRef.current = false;
  };

  if (!before || !after) return null;

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: 8,
        overflow: "hidden",
        cursor: "ew-resize",
        userSelect: "none",
        touchAction: "none",
        background: COLORS.surfaceAlt,
      }}
    >
      {/* After image — full width base layer */}
      <img
        src={after}
        alt="After"
        draggable={false}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
      />

      {/* Before image — clipped to the left of the handle */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${pos}%`,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <img
          src={before}
          alt="Before"
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: containerWidth || "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Divider handle */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${pos}%`,
          width: 2,
          background: "#fff",
          boxShadow: "0 0 6px rgba(0,0,0,0.4)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: `${pos}%`,
          transform: "translate(-50%, -50%)",
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: COLORS.accent,
          pointerEvents: "none",
        }}
      >
        ⇔
      </div>

      {/* Labels */}
      <span
        style={{
          position: "absolute", top: 10, left: 10,
          background: "rgba(0,0,0,0.55)", color: "#fff",
          fontSize: 11, padding: "3px 9px", borderRadius: 20, pointerEvents: "none",
        }}
      >
        Before
      </span>
      <span
        style={{
          position: "absolute", top: 10, right: 10,
          background: "rgba(0,0,0,0.55)", color: "#fff",
          fontSize: 11, padding: "3px 9px", borderRadius: 20, pointerEvents: "none",
        }}
      >
        After
      </span>
    </div>
  );
}