/**
 * TricolorBurst — subtle Indian-flag ambiance for a page: a faint saffron glow
 * bleeding down from the top and a green glow rising from the bottom, neutral in
 * the middle. Fixed to the viewport, non-interactive, and painted BEHIND the
 * page content.
 *
 * Purely decorative — no state, no functionality. Drop `<TricolorBurst />` as
 * the first child of a page's root element, and give that root the `isolate`
 * class so the `-z-10` layer sits above the page background but under the
 * content. All colours live here, so tweaking the two stops restyles every page.
 */
const TricolorBurst = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
    <div
      className="absolute inset-x-0 top-0 h-48"
      style={{
        background:
          "radial-gradient(115% 100% at 50% 0%, rgba(255,153,51,0.13), rgba(255,153,51,0) 72%)",
      }}
    />
    <div
      className="absolute inset-x-0 bottom-0 h-48"
      style={{
        background:
          "radial-gradient(115% 100% at 50% 100%, rgba(19,136,8,0.13), rgba(19,136,8,0) 72%)",
      }}
    />
  </div>
);

export default TricolorBurst;
