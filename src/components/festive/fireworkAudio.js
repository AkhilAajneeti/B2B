/**
 * Cracker ambience.
 *
 * Plays the supplied recording for exactly as long as crackers are on screen,
 * and not a moment longer.
 *
 * WHY AMBIENCE RATHER THAN A HIT PER BURST. This was synthesised per burst
 * before the recording arrived, which suited a generated sound. A recording
 * cannot be used that way: it is a continuous crackle, so firing a fresh copy
 * on every shell layers five or six overlapping tracks within seconds and the
 * result is mush. One looping track, faded in and out, is both cleaner and
 * cheaper.
 *
 * Fades matter more than they look. Starting at full volume is a jump scare
 * on a page that was silent a moment ago, and cutting out mid-crackle is
 * audibly abrupt — so both ends ramp.
 */

const SRC = "/festive/freesound_community-fire-crackers-23055.mp3";
const VOLUME = 0.32;
const FADE_MS = 700;

let el = null;
let fadeTimer = null;
let muted = false;

const ensure = () => {
  if (typeof window === "undefined") return null;
  if (!el) {
    el = new Audio(SRC);
    el.loop = true;
    el.preload = "none"; // 1.8MB — not fetched unless the show actually runs
    el.volume = 0;
  }
  return el;
};

const fadeTo = (target, done) => {
  const audio = ensure();
  if (!audio) return;
  clearInterval(fadeTimer);

  const from = audio.volume;
  const steps = Math.max(1, Math.round(FADE_MS / 40));
  let i = 0;

  fadeTimer = setInterval(() => {
    i += 1;
    const t = Math.min(1, i / steps);
    audio.volume = Math.max(0, Math.min(1, from + (target - from) * t));
    if (t >= 1) {
      clearInterval(fadeTimer);
      fadeTimer = null;
      done?.();
    }
  }, 40);
};

/**
 * Begin the ambience. Safe to call more than once.
 *
 * Browsers block audio until the user has interacted with the page, and
 * play() rejects when that has not happened yet. That is not an error worth
 * surfacing — the fireworks still run, just silently — so the rejection is
 * swallowed and a one-shot pointer listener retries on the first click.
 */
export const startAmbience = () => {
  const audio = ensure();
  if (!audio || muted) return;

  const attempt = () =>
    audio
      .play()
      .then(() => fadeTo(VOLUME))
      .catch(() => {
        const retry = () => {
          document.removeEventListener("pointerdown", retry);
          if (!muted) attempt();
        };
        document.addEventListener("pointerdown", retry, { once: true });
      });

  attempt();
};

/** Fade out and stop. Called when the show ends, on unmount, and on mute. */
export const stopAmbience = () => {
  const audio = el;
  if (!audio) return;
  fadeTo(0, () => {
    audio.pause();
    audio.currentTime = 0;
  });
};

export const setMuted = (next) => {
  muted = next;
  if (next) {
    clearInterval(fadeTimer);
    fadeTimer = null;
    if (el) {
      el.pause();
      el.volume = 0;
    }
  }
};
