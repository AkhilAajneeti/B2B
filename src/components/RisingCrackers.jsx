import React, { useEffect, useRef, useState } from "react";
import Icon from "./AppIcon";
import {
  setMuted,
  startAmbience,
  stopAmbience,
} from "./festive/fireworkAudio";

/**
 * RisingCrackers — a ten-second Diwali fireworks show, drawn on one canvas.
 *
 * WHY CANVAS AND NOT CSS. The version this replaces animated DOM nodes with
 * keyframes, and it always read as mechanical: a keyframe sends every spark
 * down a fixed path at a fixed speed, dying at a fixed radius, so each burst
 * is the same ring every time. Fireworks look real because of per-frame
 * physics — drag, gravity, a spread of launch speeds — and none of that is
 * expressible in a keyframe. A canvas is also far cheaper than ~100 animated
 * elements each forcing its own compositor layer.
 *
 * The show runs once on mount and then stops dead: no idle animation frame
 * ticks over for the rest of the session.
 */

/**
 * How long to keep launching, in ms. `0` runs for as long as the component is
 * mounted — which on the login page means until the user signs in, since the
 * page unmounts with them.
 */
const DEFAULT_SHOW_MS = 10000;

const GRAVITY = 0.035; // added to vy each frame
const DRAG = 0.985; // vx and vy multiplied each frame

const MAX_ROCKETS = 3;
const LANES = 6;

// Saturated on purpose: the page behind this is cream, and pale sparks vanish
// against it. Each shell picks one palette; each spark picks one of its three
// tints, so a single burst has internal variation.
// Drawn from the palette the rest of the CRM already uses — the maroon
// primary, and the accent hues on the KPI tiles and status pills — so the
// sky belongs to this product rather than to a stock fireworks effect.
// Each shell is three tints of one hue: a bright core, the accent itself,
// and a deep tail.
//
// Saturated on purpose: the page behind is cream, and pale sparks vanish on
// it — a pastel palette was tried first and read as smoke.
const PALETTES = [
  ["#E8536A", "#AC2334", "#6E1420"], // primary maroon
  ["#FFD166", "#F59E0B", "#B4600A"], // amber, the KPI tiles
  ["#FF8FA3", "#F43F5E", "#9F1239"], // rose
  ["#C4B5FD", "#8B5CF6", "#5B21B6"], // violet
  ["#6EE7B7", "#10B981", "#065F46"], // emerald
  ["#7DD3FC", "#0EA5E9", "#075985"], // sky
];

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

class Particle {
  constructor(x, y, vx, vy, life, colour, size) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.colour = colour;
    this.size = size;
  }

  step() {
    this.vx *= DRAG;
    this.vy = this.vy * DRAG + GRAVITY;
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 1;
  }

  // Sparks burn steadily and then go out; they do not dim linearly. Holding
  // full brightness for the first third and falling away on a curve after is
  // what stops a burst looking like a dissolving circle.
  get alpha() {
    const t = this.life / this.maxLife;
    return t > 0.65 ? 1 : Math.pow(t / 0.65, 1.6);
  }
}

const MUTE_KEY = "festive_crackers_muted";

const RisingCrackers = ({ showMs = DEFAULT_SHOW_MS, sound = false }) => {
  const canvasRef = useRef(null);

  // Muted state is PERSISTED. Someone who silences fireworks on a CRM they
  // use all day should not have to silence them again on the next page load.
  const [muted, setMutedState] = useState(() => {
    try {
      return localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Read through a ref inside the animation loop: the loop is created once
  // and would otherwise close over the first value forever.
  const soundOn = useRef(sound && !muted);
  soundOn.current = sound && !muted;

  useEffect(() => {
    setMuted(muted);
    if (!muted && sound && soundOn.current) startAmbience();
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      // storage disabled — the toggle still works for this session
    }
  }, [muted, sound]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    ) {
      return undefined;
    }

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let frame = 0;
    let finished = false;

    const startedAt = performance.now();
    let nextLaunchAt = startedAt + rand(200, 600);

    const rockets = [];
    const sparks = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // LAUNCH POSITIONS COME FROM A SHUFFLED QUEUE OF LANES, not from a plain
    // random x. Over a ten-second show pure randomness clusters: you get three
    // shells over one corner and a dead half. Lanes guarantee full-width
    // coverage; the shuffle and the within-lane jitter stop it reading as a
    // metronome walking across the screen.
    let laneQueue = [];
    const nextLaneX = () => {
      if (laneQueue.length === 0) {
        laneQueue = Array.from({ length: LANES }, (_, i) => i);
        for (let i = laneQueue.length - 1; i > 0; i -= 1) {
          const j = (Math.random() * (i + 1)) | 0;
          [laneQueue[i], laneQueue[j]] = [laneQueue[j], laneQueue[i]];
        }
      }
      const lane = laneQueue.pop();
      const start = width * 0.08;
      const band = (width * 0.84) / LANES;
      return start + band * lane + rand(band * 0.2, band * 0.8);
    };

    const launch = () => {
      const palette = pick(PALETTES);
      rockets.push({
        x: nextLaneX(),
        y: height + 10,
        vx: rand(-0.5, 0.5),
        // LAUNCH ENERGY IS SIZED TO THE VIEWPORT, not a fixed number.
        //
        // The bursts were appearing low, and it was arithmetic rather than
        // placement: under the spark drag of 0.985 a rocket launched at -9
        // runs out of climb after ~76 frames having risen only ~365px, which
        // on a 900px window is below the middle. Rockets now use a much
        // lighter drag (see the step below) and a speed scaled to the height
        // they have to cover, so flight is near-ballistic and rise is about
        // v^2 / 0.098. The 0.28-0.32 band peaks around 70-75% up the screen
        // at every viewport size.
        vy: -(Math.sqrt(height) * rand(0.28, 0.32)),
        // Burst at the apex of its OWN arc, never at a fixed height. Varying
        // the launch energy is what makes a display feel natural rather than
        // like a row of identical shells.
        // A ceiling, not the plan: the shell normally bursts at its own
        // apex, and this only catches one launched hot enough to leave the
        // top of the screen.
        targetY: rand(height * 0.08, height * 0.16),
        palette,
        colour: palette[0],
      });
    };

    const burst = (rocket) => {
      const willow = Math.random() < 0.3;
      const count = (rand(54, 100) | 0);
      const power = willow ? rand(1.6, 2.6) : rand(3.0, 4.6);

      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2 + rand(-0.06, 0.06);
        // The SPREAD of speeds is what gives a burst depth. One speed for
        // every spark produces a hollow ring with nothing inside it.
        const speed = power * rand(0.45, 1);
        sparks.push(
          new Particle(
            rocket.x,
            rocket.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            willow ? rand(70, 110) : rand(42, 72),
            pick(rocket.palette),
            willow ? rand(1.1, 1.9) : rand(1.3, 2.4),
          ),
        );
      }
    };

    const tick = (now) => {
      // showMs = 0 means run until unmount; there is no finish state to reach.
      const launching = showMs === 0 || now - startedAt < showMs;

      if (launching && now >= nextLaunchAt && rockets.length < MAX_ROCKETS) {
        launch();
        nextLaunchAt = now + rand(900, 2200);
      }

      // Fade the previous frame by ERASING it, not by painting over it. A
      // translucent fill rectangle would tint the page showing through this
      // transparent canvas; destination-out eats alpha instead.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      for (let i = rockets.length - 1; i >= 0; i -= 1) {
        const r = rockets[i];
        // Light drag on the rocket itself. The spark value (0.985) models a
        // tumbling ember shedding speed fast; a shell in flight is nothing
        // like that, and applying it to the climb is what kept the bursts low.
        r.vx *= 0.998;
        r.vy = r.vy * 0.998 + GRAVITY * 1.4;
        r.x += r.vx;
        r.y += r.vy;

        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = r.colour;
        ctx.fillStyle = r.colour;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (r.vy >= -0.6 || r.y <= r.targetY) {
          burst(r);
          rockets.splice(i, 1);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const p = sparks[i];
        p.step();

        if (p.life <= 0 || p.y > height + 40) {
          sparks.splice(i, 1);
          continue;
        }

        ctx.save();
        // Real sparks tumble, so their brightness jitters frame to frame.
        // A smooth fade is the single biggest tell that something is drawn.
        ctx.globalAlpha = p.alpha * rand(0.75, 1);
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.colour;
        ctx.fillStyle = p.colour;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // The window stops LAUNCHES, not flight: a shell already climbing
      // finishes its arc rather than vanishing mid-air. In continuous mode
      // this never fires, so the loop keeps running until cleanup.
      if (!launching && rockets.length === 0 && sparks.length === 0) {
        ctx.clearRect(0, 0, width, height);
        stopAmbience(); // sound lasts exactly as long as the show
        finished = true;
        return; // and no further frame is scheduled, for the whole session
      }

      frame = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      if (finished) return;
      if (document.hidden) {
        cancelAnimationFrame(frame);
        stopAmbience();
      } else {
        frame = requestAnimationFrame(tick);
        if (soundOn.current) startAmbience();
      }
    };

    resize();
    if (soundOn.current) startAmbience();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      stopAmbience();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [showMs]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[55] h-full w-full select-none"
      />

      {/* A mute control, because sound on a page someone keeps open all day
          has to be refusable — and refusable in one obvious click, not buried
          in settings. */}
      {sound && (
        <button
          type="button"
          onClick={() => setMutedState((m) => !m)}
          aria-label={muted ? "Unmute fireworks" : "Mute fireworks"}
          title={muted ? "Unmute fireworks" : "Mute fireworks"}
          className="fixed bottom-5 right-5 z-[56] grid h-10 w-10 place-items-center rounded-full border border-[#EBD9B4] bg-white/90 text-[#8E1B2B] shadow-lg backdrop-blur transition-all hover:scale-105 hover:bg-white active:scale-95"
        >
          <Icon name={muted ? "VolumeX" : "Volume2"} size={17} />
        </button>
      )}
    </>
  );
};

export default RisingCrackers;
