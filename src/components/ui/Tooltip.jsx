import React, { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../AppIcon";

/**
 * Hover explanation panel.
 *
 * Rendered through a PORTAL on purpose. The obvious implementation — an
 * absolutely positioned child of the trigger — is clipped the moment any
 * ancestor scrolls, and our tables all sit inside `overflow-x-auto`. The
 * symptom is a tooltip that looks half-drawn near the right-hand columns and
 * reads as a CSS bug, so the position is measured from the trigger and the
 * panel is drawn at the top of the document instead.
 *
 * Position is captured on enter rather than tracked on scroll: the panel is
 * only on screen while the pointer rests on the trigger, and scrolling in that
 * state closes it anyway.
 */
const WIDTH = 288; // w-72
const MARGIN = 12; // keep this clear of the viewport edge

const Tooltip = ({ title, text, children, className = "" }) => {
  const triggerRef = useRef(null);
  const [pos, setPos] = useState(null);

  const show = useCallback(() => {
    const el = triggerRef.current;
    if (!el || !text) return;

    const r = el.getBoundingClientRect();

    // Left-align under the trigger, but pull back inside the viewport when
    // that would overflow — the right-hand columns otherwise open off-screen.
    let left = r.left;
    if (left + WIDTH > window.innerWidth - MARGIN) {
      left = window.innerWidth - MARGIN - WIDTH;
    }
    left = Math.max(MARGIN, left);

    // Flip above the trigger when there is not enough room below it.
    const below = window.innerHeight - r.bottom;
    const placeAbove = below < 160;

    setPos({
      left,
      top: placeAbove ? null : r.bottom + 10,
      bottom: placeAbove ? window.innerHeight - r.top + 10 : null,
      // The arrow follows the trigger even after the panel has been pulled
      // back from the edge, so it still points at what it describes.
      arrow: Math.min(Math.max(r.left + r.width / 2 - left, 16), WIDTH - 16),
      above: placeAbove,
    });
  }, [text]);

  const hide = useCallback(() => setPos(null), []);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        className={`inline-flex items-center gap-1 ${text ? "cursor-help" : ""} ${className}`}
      >
        {children}
      </span>

      {pos &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.top ?? undefined,
              bottom: pos.bottom ?? undefined,
              width: WIDTH,
            }}
            className="pointer-events-none z-[9999] animate-in fade-in-0 zoom-in-95 duration-150"
          >
            <div className="relative rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-2xl shadow-black/40">
              <span
                style={{ left: pos.arrow }}
                className={`absolute h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-white/10 bg-neutral-900 ${
                  pos.above
                    ? "-bottom-[5px] border-b border-r"
                    : "-top-[5px] border-l border-t"
                }`}
              />

              {title && (
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Icon name="Sparkles" size={14} className="text-emerald-400" />
                  <span className="text-[13px] font-semibold normal-case tracking-normal text-emerald-400">
                    {title}
                  </span>
                </div>
              )}

              <p className="text-[13px] font-normal normal-case leading-relaxed tracking-normal text-neutral-300">
                {text}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default Tooltip;
