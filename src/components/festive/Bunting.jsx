import React from "react";

/**
 * String lights across the top of the content column.
 *
 * Drawn in SVG for one reason above the others: it has to stretch. A bitmap
 * strip would either tile with a visible seam or squash on a narrow window,
 * and this sits at the very top of every dashboard load where that would be
 * the first thing anyone sees.
 *
 * The wire is a single quadratic curve with the bulbs placed ALONG it rather
 * than hung from fixed y values, so they still sit on the wire at any width.
 *
 * It stops at 82% on purpose. Running the full width puts bulbs behind the
 * notification bell and the account chip, and on a narrow window they collide
 * outright.
 */
const BULBS = [
  { t: 0.08, colour: "#E2662A", drop: 16 },
  { t: 0.17, colour: "#F4A024", drop: 24 },
  { t: 0.26, colour: "#AC2334", drop: 14 },
  { t: 0.35, colour: "#F6C45E", drop: 22 },
  { t: 0.44, colour: "#3FA34D", drop: 15 },
  { t: 0.53, colour: "#E8456B", drop: 26 },
  { t: 0.62, colour: "#F4A024", drop: 16 },
  { t: 0.71, colour: "#3C9CD1", drop: 21 },
  { t: 0.80, colour: "#AC2334", drop: 14 },
];

/* The wire: y = a quadratic sag from the left anchor to the right one. */
const SAG = 26;
const wireY = (t) => 6 + SAG * 4 * t * (1 - t);

const Bunting = ({ className = "" }) => (
  <svg
    viewBox="0 0 1000 70"
    preserveAspectRatio="none"
    aria-hidden="true"
    className={className}
  >
    <path
      d={`M0 6 Q 500 ${6 + SAG * 2} 1000 6`}
      fill="none"
      stroke="#C9A227"
      strokeOpacity="0.55"
      strokeWidth="1.6"
      vectorEffect="non-scaling-stroke"
    />

    {BULBS.map((b, i) => {
      const x = b.t * 1000;
      const y = wireY(b.t);
      return (
        <g key={b.t}>
          <line
            x1={x}
            y1={y}
            x2={x}
            y2={y + b.drop}
            stroke="#C9A227"
            strokeOpacity="0.5"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          {/* Each bulb glows in its own colour. The halo is a separate, wider
              circle at low alpha rather than an SVG filter — filters on a
              dozen nodes are expensive, and this costs nothing. */}
          <circle cx={x} cy={y + b.drop + 7} r="11" fill={b.colour} opacity="0.16" />
          <circle
            cx={x}
            cy={y + b.drop + 7}
            r="4.6"
            fill={b.colour}
            className="bunting-bulb"
            style={{ animationDelay: `${(i % 5) * 0.45}s` }}
          />
          <circle cx={x - 1.3} cy={y + b.drop + 5.4} r="1.4" fill="#FFF6E2" opacity="0.8" />
        </g>
      );
    })}
  </svg>
);

export default Bunting;
