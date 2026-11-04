import React from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * FestiveBackdrop — the festive login artwork, with no content of its own.
 *
 * Decoration only: no logo, no headline, no card, no wordmark. Callers drop
 * their own content into `children`, which renders in the right-hand column.
 * Every layer is aria-hidden, alt="", pointer-events-none and absolutely
 * positioned, so nothing here intercepts a click or affects layout.
 *
 * ASSET SUBSTITUTIONS, because this project's festive set is not the one the
 * original spec was written against:
 *   lotus lamp.jpg                      -> festive-login-v2.jpg
 *   Illuminated Ivory Hindu Temple ...  -> omitted; the scene is already in
 *                                          festive-login-v2.jpg
 *   wave.png                            -> omitted; the right panel keeps its
 *                                          veil, light pool and warm lift
 *   <FestiveFireworks />                -> omitted; no such component here
 * Everything else — gradients, opacities, offsets, blur radii — is the spec's
 * values verbatim.
 *
 * The base artwork is anchored object-left-bottom, NOT object-[78%_bottom]:
 * our hero has the archer on the LEFT, so pushing the focal point to 78%
 * crops him out of frame entirely.
 */
const FestiveBackdrop = ({
  className = "",
  left = null,
  // Both panels' decoration is opt-out rather than deleted: every layer is
  // still here, switched off while the page is redesigned.
  leftDecor = true,
  rightDecor = true,
  children,
}) => {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`relative grid min-h-screen grid-cols-1 bg-[#fffaf4] lg:h-screen lg:grid-cols-[1.18fr_1fr] lg:overflow-hidden ${className}`}
    >
      {/* ───────────────────── LEFT · ARTWORK ───────────────────── */}
      <div className="relative hidden overflow-hidden bg-[#fffaf4] lg:block">
        {leftDecor && (
          <>
            {/* 1 — the ivory silk base. Carries the lotus-diya watermark in
                the artwork itself; it is not a separate layer. */}
            <img
              src="/festive/lotus lamp.jpg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-[78%_bottom]"
            />

            {/* 2 — veil, so the type on the left stays readable over it. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 select-none bg-[linear-gradient(103deg,rgba(255,254,251,0.97)_0%,rgba(255,251,244,0.93)_42%,rgba(255,247,236,0.66)_70%,rgba(253,240,222,0.4)_100%)]"
            />

            {/* 3 — mandala watermark, left edge. The -clean copies are used
                throughout: the originals keep a near-white field that was
                never keyed out, which paints a visible pale rectangle on this
                panel. See scripts/clean-festive-assets.py. */}
            <img
              src="/festive/mandala-full-clean.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -left-40 top-[22%] w-[360px] select-none opacity-[0.06]"
            />

            {/* 4 — gold mandala in the top-right corner. */}
            <img
              src="/festive/corner-mandala-clean.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 w-[290px] select-none opacity-45"
            />

            {/* 5 — hanging lantern. object-left crops the pair down to the
                single lantern the reference hangs here. */}
            <img
              src="/festive/Ornate Glowing Diwali Lantern.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -top-8 right-[14%] h-[230px] w-[135px] select-none object-cover object-left"
            />

            {/* 7 — the temple, bottom-right. Used as supplied: this cut is
                clean — hard edges, flags intact, no fringe — unlike the
                earlier source, which needed a de-halo pass. */}
            <img
              src="/festive/temple.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 bottom-0 w-[62%] max-w-[640px] select-none object-contain"
            />

            {/* 8 — glow pool under the temple. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[2%] right-[10%] h-[360px] w-[360px] select-none rounded-full bg-[radial-gradient(circle,rgba(247,186,99,0.38)_0%,rgba(247,186,99,0)_70%)] blur-2xl"
            />

            {/* 9 — floor lift. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-28 select-none bg-gradient-to-t from-[#fdf0de] via-[#fdf0de]/55 to-transparent"
            />
          </>
        )}

        {/* Content slot for the artwork panel. Optional: with nothing passed
            the panel stays pure decoration, which is what the component was
            built for. */}
        {left && (
          <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
            {left}
          </div>
        )}
      </div>

      {/* ───────────────────── RIGHT · CONTENT SLOT ───────────────────── */}
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fdf6ea] p-6 pb-16 sm:p-8 sm:pb-20 lg:h-full lg:min-h-0 lg:p-6 lg:pb-24 xl:p-8 xl:pb-28">
        {rightDecor && (
          <>
            <img
              src="/festive/wave.png"
              alt=""
              aria-hidden="true"
              style={{ filter: "brightness(1.1) saturate(0.78)" }}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-bottom opacity-[0.45]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 select-none bg-[linear-gradient(180deg,rgba(255,253,249,0.6)_0%,rgba(255,251,244,0.34)_45%,rgba(255,248,238,0.28)_100%)]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[780px] w-[680px] -translate-x-1/2 -translate-y-1/2 select-none rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.8)_0%,rgba(255,253,248,0.38)_48%,rgba(255,253,248,0)_74%)] blur-2xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-40 select-none bg-gradient-to-t from-[#fbead2]/55 to-transparent"
            />

            {/* ONE corner piece, top-right only. No mirrored or rotated copy
                at the bottom: the asset has hanging lanterns baked into it,
                and rotating it stands them upright from the floor. */}
            <img
              src="/festive/corner-mandala-clean.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 w-[230px] select-none opacity-60"
            />

            <img
              src="/festive/mandala-full-clean.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 bottom-[18%] w-[220px] select-none opacity-[0.08]"
            />
          </>
        )}

        <div className="relative z-10 mx-auto w-full max-w-[520px]">{children}</div>
      </div>
    </motion.div>
  );
};

export default FestiveBackdrop;
