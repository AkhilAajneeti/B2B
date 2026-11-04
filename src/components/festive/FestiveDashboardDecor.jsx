import React from "react";

/**
 * Page-level festive decoration for the dashboard — the WASH AND WATERMARKS
 * only. The temple and the Diwali lockup used to live here too, and the KPI
 * cards covered them: anything behind the content can only ever be a
 * watermark. They now have their own bounded band, FestiveHeroBand, in the
 * flow above the cards.
 *
 * Decoration only — no text, nothing interactive, nothing in the layout flow.
 * Every layer is aria-hidden, pointer-events-none and absolutely positioned,
 * so a screen reader hears the dashboard exactly as before and no click can
 * land on a lantern.
 *
 * WHY NO CANVAS HERE. The login page runs a real particle simulation
 * (RisingCrackers), which is right for a screen you look at for twenty
 * seconds. This is a screen people keep open all day while working, so the
 * decoration is static artwork plus two small CSS loops — it must cost
 * nothing to leave running.
 *
 * `absolute` rather than `fixed`: the dashboard scrolls, and fixed artwork
 * would hang in front of the content as it moved.
 */
const FestiveDashboardDecor = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none overflow-hidden">
    {/* Warm wash. The app background is near-white; this tints the top of the
        page toward cream so the gold artwork has something to sit on. */}
    <div className="absolute inset-x-0 top-16 h-[520px] bg-[linear-gradient(180deg,#FDF4E4_0%,#FDF7EC_42%,rgba(253,247,236,0)_100%)]" />

    {/* Mandala watermarks. The -clean copies: the originals keep a near-white
        field that was never keyed out, which paints a pale rectangle on a
        cream page. See scripts/clean-festive-assets.py. */}
    <img
      src="/festive/mandala-full-clean.png"
      alt=""
      className="absolute -left-24 -top-16 w-[320px] opacity-[0.07]"
    />
    <img
      src="/festive/corner-mandala-clean.png"
      alt=""
      className="absolute -right-16 top-[360px] hidden w-[300px] opacity-[0.06] xl:block"
    />

    {/* Large mandalas bleeding between the cards, behind the KPI row. These
        are the page's own watermark — the small ones inside each card are a
        separate, tighter layer. */}
    <img
      src="/festive/mandala-full-clean.png"
      alt=""
      className="absolute -left-28 top-[430px] hidden w-[420px] opacity-[0.05] lg:block"
    />
    <img
      src="/festive/mandala-full-clean.png"
      alt=""
      className="absolute right-[6%] top-[560px] hidden w-[340px] opacity-[0.04] xl:block"
    />

  </div>
);

export default FestiveDashboardDecor;
