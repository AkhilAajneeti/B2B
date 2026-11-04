import React from "react";
import Diya from "./Diya";

/**
 * The festive hero band.
 *
 * COMPOSED FROM SPRITES, not from one strip. An earlier version scaled the
 * supplied celebration strip into a lane, and that can never match a layout
 * where each element is placed individually: the pieces crowded into the
 * middle while the rest of the band sat empty, and the temple landed on top
 * of the lockup. The strip is now cut into four sprites by
 * scripts/clean-festive-assets.py and positioned here.
 *
 * The artwork lives in this bounded element rather than on a page-wide
 * backdrop, because anything behind the content is covered by the KPI cards
 * — which is exactly what happened the first time.
 */
const FestiveHeroBand = ({ title, subtitle }) => (
  <section className="relative min-h-[190px] overflow-hidden rounded-3xl border border-[#EBD9B4] bg-[linear-gradient(105deg,#FFFDF8_0%,#FDF7EC_42%,#FBEFDC_100%)] shadow-[0_18px_44px_-28px_rgba(140,90,30,0.55)] sm:min-h-[210px]">
    <div aria-hidden="true" className="pointer-events-none select-none">
      {/* Mandalas at both ends, WHOLE rather than cropped.
          These were the corner asset pushed off the band's edges, so only a
          quarter of each showed — and that asset has a hanging lantern baked
          into it, which is where the stray lamp over the heading came from.
          mandala-full is a complete circle, so it is sized to the band's
          height and sits inside it. */}
      <img
        src="/festive/mandala-full-clean.png"
        alt=""
        className="absolute left-2 top-1/2 h-[170px] w-auto -translate-y-1/2 opacity-[0.22] sm:h-[190px]"
      />
      <img
        src="/festive/mandala-full-clean.png"
        alt=""
        className="absolute right-2 top-1/2 hidden h-[170px] w-auto -translate-y-1/2 -scale-x-100 opacity-[0.18] sm:h-[190px] xl:block"
      />

      {/* Skyline behind the heading: the temple again, washed back almost to
          nothing. It gives the text side something to sit against, so the
          band is not half artwork and half blank. */}
      <img
        src="/festive/temple.png"
        alt=""
        className="absolute bottom-0 left-[27%] hidden w-[230px] opacity-[0.10] grayscale md:block"
      />

      {/* Two strings of lights at opposite ends of the arc, as in the
          reference — one leading in left of centre, a shorter one picking it
          up again on the right. */}
      <img
        src="/festive/string-lights.png"
        alt=""
        className="absolute -top-6 left-[30%] hidden w-[260px] lg:block"
      />
      <img
        src="/festive/string-lights.png"
        alt=""
        className="absolute -top-7 right-[9%] hidden w-[190px] opacity-85 xl:block"
      />

      {/* Lanterns hang FROM THE TOP EDGE, so they read as suspended rather
          than floating in the middle of the band. */}
      <img
        src="/festive/lantern-trio.png"
        alt=""
        className="absolute -top-2 left-[45%] hidden h-[128px] w-auto sm:block md:h-[150px]"
      />

      {/* The lockup — the one piece here meant to be READ, so it gets the
          clear span between the bursts and the temple, at full strength. */}
      <img
        src="/festive/diwali-lettering.png"
        alt="Happy Diwali"
        className="absolute left-[60%] top-1/2 h-[80px] w-auto -translate-y-1/2 sm:left-[62%] md:h-[96px] xl:h-[112px]"
      />

      {/* A pair of diyas on the ground line, in front of the temple. */}
      <Diya className="absolute bottom-1 right-[23%] hidden h-9 w-12 md:block" />
      <Diya className="absolute -bottom-1 right-[19%] hidden h-12 w-16 md:block" />

      {/* Temple at the right edge, standing on the band's floor. */}
      <img
        src="/festive/temple.png"
        alt=""
        className="absolute bottom-0 right-0 w-[150px] md:w-[190px] xl:w-[225px]"
      />

      {/* Ground sweep — a soft horizon for the temple and diyas to stand on,
          so the elements belong to one scene instead of floating apart. */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(to_top,rgba(247,214,160,0.45),transparent)]" />
    </div>

    {/* ── heading ─────────────────────────────────────────────────────── */}
    <div className="relative max-w-[56%] px-6 py-8 sm:max-w-[44%] sm:px-9 sm:py-10">
      <div className="flex items-center gap-2.5">
        <span className="h-px w-8 bg-[#C9A227]" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#B08B3E]">
          Shubh Deepavali
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[#8E1B2B] lg:text-[32px]">
          {title}
        </h1>
        <Diya className="h-9 w-12 shrink-0" />
      </div>

      <p className="mt-2 text-sm text-[#6b6355]">{subtitle}</p>
    </div>
  </section>
);

export default FestiveHeroBand;
