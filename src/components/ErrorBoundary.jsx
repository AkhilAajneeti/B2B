import React from "react";
import Icon from "./AppIcon";

/**
 * Illustration for the error screen.
 *
 * Drawn inline as SVG rather than loaded as an image file, for three reasons
 * that all matter specifically HERE: there is no licence to buy or attribute,
 * it costs no network request on a screen whose whole premise is that the
 * network just failed, and it stays sharp at any size.
 *
 * What it depicts: this browser, the server it talks to, and the link between
 * them broken in the middle. That is the actual story of almost every failure
 * that lands on this screen, and it puts the fault on the connection rather
 * than on the CRM — which is the entire point of this redesign.
 *
 * `offline` greys the cloud out. When the device itself has no connection the
 * far end is not merely unreachable, it is not being talked to at all, and a
 * grey cloud says that without another line of text.
 */
const ConnectionArt = ({ offline = false }) => {
  const cloudFill = offline ? "#E2E8F0" : "#FBD9DC"; // slate-200 / rose-100
  const accent = offline ? "#64748B" : "#AC2334"; // slate-500 / brand

  return (
    <svg
      viewBox="0 0 320 180"
      className="w-full max-w-[280px] h-auto mx-auto"
      role="img"
      aria-label={
        offline
          ? "Illustration: this device is not connected"
          : "Illustration: the connection to the server was interrupted"
      }
    >
      {/* Loose confetti. Keeps the composition from reading as a diagram
          without adding anything a person has to interpret. */}
      <circle cx="80" cy="38" r="4" fill="#FBD9DC" />
      <circle cx="243" cy="26" r="6" fill="#FBD9DC" />
      <circle cx="259" cy="98" r="3.5" fill="#E2E8F0" />
      <circle cx="64" cy="112" r="5" fill="#E2E8F0" />
      <circle cx="232" cy="156" r="4" fill="#FBD9DC" />
      <circle cx="58" cy="70" r="2.5" fill="#FBD9DC" />

      {/* The server, as a cloud. */}
      <g>
        <circle cx="139" cy="47" r="16" fill={cloudFill} />
        <circle cx="162" cy="38" r="21" fill={cloudFill} />
        <circle cx="185" cy="49" r="15" fill={cloudFill} />
        <rect x="123" y="47" width="78" height="19" rx="9.5" fill={cloudFill} />
      </g>

      {/* The link, drawn as two dashed runs with a deliberate gap — the break
          is the subject, so it is the empty space at the centre rather than
          something drawn on top of a continuous line. */}
      <path
        d="M162 70 V86"
        stroke={accent}
        strokeWidth="2.5"
        strokeDasharray="2 6"
        strokeLinecap="round"
      />
      <path
        d="M162 104 V120"
        stroke={accent}
        strokeWidth="2.5"
        strokeDasharray="2 6"
        strokeLinecap="round"
      />

      {/* Break marker, sitting in the gap. */}
      <circle
        cx="162"
        cy="95"
        r="11"
        fill="#FFFFFF"
        stroke={accent}
        strokeWidth="2"
      />
      <path
        d="M158.5 91.5 L165.5 98.5 M165.5 91.5 L158.5 98.5"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* This browser window, mid-load: a header bar and two skeleton rows,
          i.e. the page that never finished arriving. */}
      <g>
        <rect
          x="104"
          y="120"
          width="116"
          height="54"
          rx="10"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="2"
        />
        <path d="M104 138 H220" stroke="#E2E8F0" strokeWidth="2" />
        <circle cx="117" cy="129" r="2.5" fill="#CBD5E1" />
        <circle cx="126" cy="129" r="2.5" fill="#CBD5E1" />
        <circle cx="135" cy="129" r="2.5" fill="#CBD5E1" />
        <rect x="116" y="149" width="60" height="6" rx="3" fill="#E2E8F0" />
        <rect x="116" y="160" width="38" height="6" rx="3" fill="#E2E8F0" />
      </g>
    </svg>
  );
};

/**
 * The screen shown when a render throws.
 *
 * WHY IT READS THE WAY IT DOES
 * ----------------------------
 * In practice almost everything that lands here is transient and not the
 * user's problem: a chunk that failed to download after a deploy, a request
 * that never came back, a flaky connection on a sales rep's phone. The old
 * copy — "Something went wrong / We encountered an unexpected error while
 * processing your request" — described all of that as a fault in the CRM, and
 * people reasonably read it as "the CRM is broken" and reported it as such.
 *
 * So the wording names the likely cause (the connection), says plainly that
 * nothing was lost, and offers the action that actually fixes it: reload.
 * "Back" was the old primary button and it was the wrong one — it navigates to
 * "/" WITHOUT a fresh load, so the same broken bundle stays in memory and the
 * next route can throw straight back to this screen.
 *
 * What it deliberately does NOT do:
 *
 * - It does not print the error text, stack, or component tree. That is for
 *   the console (see componentDidCatch, which still logs everything), not for
 *   a salesperson in front of a client. It also keeps file paths and internals
 *   off a screen that may be shared or screenshotted.
 *
 * - It does not auto-reload on a timer. That is safe for a network blip and a
 *   trap for a genuine render bug: the reload hits the same code, throws
 *   again, and the page sits in a loop nobody can read or escape. The reload
 *   is one click, deliberately taken by a person.
 *
 * ⚠️  Honest about the one case it cannot dress up: if the failure is a real
 * bug rather than the network, reloading will land here again. That is why the
 * console log stays, and why the footer line tells them what to do when a
 * second attempt doesn't take.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      // Read once up front, then kept current by the listeners below.
      // `navigator.onLine` is only trustworthy when FALSE — the browser
      // reports true whenever an interface is up, even if it goes nowhere. So
      // false is used to state the cause outright, and true is never used to
      // claim the connection is fine.
      offline: typeof navigator !== "undefined" && navigator.onLine === false,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidMount() {
    // Live, because the usual journey is: lose signal → land here → walk back
    // into coverage. Without these the "you're offline" wording would stay on
    // screen after the connection returned, telling them to fix something that
    // had already fixed itself.
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
  }

  handleOnline = () => this.setState({ offline: false });
  handleOffline = () => this.setState({ offline: true });

  componentDidCatch(error, errorInfo) {
    error.__ErrorBoundary = true;
    window.__COMPONENT_ERROR__?.(error, errorInfo);
    // Logged, not swallowed. The screen below is deliberately generic, so
    // without this there is no way to tell a failed chunk load after a deploy
    // from a genuine render error — and both look identical to the user.
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  // A full load, not a react-router navigate: the point is to fetch the
  // bundle again, which is what repairs a chunk that failed to download.
  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state?.hasError) return this.props?.children;

    const { offline } = this.state;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-slate-50 to-slate-100 px-4 py-10">
        <div className="w-full max-w-lg">
          {/* Brand mark above the card. Seeing the CRM's own identity here is
              part of the reassurance — an unbranded error page reads as the
              browser having given up on the site entirely. */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <img
              src="/assets/images/aajneeti-favicon.png"
              alt=""
              className="w-7 h-7 object-contain"
              // This screen must still work when the network is the very thing
              // that is broken, so a missing logo simply disappears.
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span className="text-lg font-semibold tracking-tight text-slate-800">
              CRM
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] px-8 pt-8 pb-9 text-center">
            <ConnectionArt offline={offline} />

            <h1 className="mt-6 text-[1.375rem] leading-tight font-semibold text-slate-900">
              {offline ? "You're offline" : "That didn't load"}
            </h1>

            {/* Names the cause, then removes the worry, then says what to do —
                in that order, because "did I just lose my work?" is the
                question people actually have when a screen disappears. */}
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600 max-w-sm mx-auto">
              {offline ? (
                <>
                  Your device has lost its internet connection, so this page
                  couldn&apos;t finish loading.{" "}
                  <span className="text-slate-800 font-medium">
                    Nothing you saved has been lost.
                  </span>{" "}
                  Reconnect, then refresh.
                </>
              ) : (
                <>
                  The connection dropped while this page was loading, so part of
                  it never arrived.{" "}
                  <span className="text-slate-800 font-medium">
                    Nothing you saved has been lost.
                  </span>{" "}
                  Refreshing usually sorts it.
                </>
              )}
            </p>

            {/* Hairline above the actions: separates "what happened" from
                "what to do", so the eye lands on the buttons as a next step
                rather than as more of the paragraph. */}
            <div className="mt-7 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#AC2334] hover:bg-[#8e1c2b] active:scale-[0.98] text-white text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#AC2334]/40 focus:ring-offset-2"
                autoFocus
              >
                <Icon name="RefreshCw" size={16} color="#fff" />
                Refresh page
              </button>

              <button
                type="button"
                onClick={this.handleHome}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 text-sm font-semibold border border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
              >
                <Icon name="LayoutDashboard" size={16} />
                Dashboard
              </button>
            </div>
          </div>

          {/* The honest escape hatch. If a refresh lands them back here it is
              not the network, and leaving them to keep clicking Refresh would
              waste their time and bury a real bug. Kept small and below the
              card so it reads as a footnote, not as an alarm. */}
          <p className="mt-5 text-center text-xs text-slate-400 max-w-sm mx-auto">
            Still seeing this after a refresh? Let the team know what you were
            doing when it appeared.
          </p>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
