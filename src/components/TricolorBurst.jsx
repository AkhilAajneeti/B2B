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
// Tricolor theme removed — renders nothing. (Left in place so the existing
// <TricolorBurst /> usages stay valid; safe to delete entirely later.)
const TricolorBurst = () => null;

export default TricolorBurst;
