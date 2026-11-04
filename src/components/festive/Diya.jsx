import React from "react";

/**
 * A diya.
 *
 * This was an SVG drawing until the artwork arrived. It is now the supplied
 * "Glowing Ornate Diwali Diya", keyed to transparency by
 * scripts/clean-festive-assets.py — the file ships as mode RGB with the
 * checkerboard painted into the pixels, so it has no usable alpha of its own.
 *
 * Kept as a component rather than an <img> at each call site so every diya on
 * the page stays one decision: swap the asset here and the dashboard, the
 * hero band and the chart all follow.
 */
const Diya = ({ className = "" }) => (
  <img
    src="/festive/diya.png"
    alt=""
    aria-hidden="true"
    className={`pointer-events-none select-none object-contain ${className}`}
  />
);

export default Diya;
