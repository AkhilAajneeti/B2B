import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
  // Dark mode is driven by a `dark` class on <html>, not by the OS media
  // query. The OS preference is still honoured — utils/theme.js seeds the
  // first visit from prefers-color-scheme — but it is honoured by ADDING the
  // class, which leaves the user a toggle that can disagree with their OS.
  // With the default "media" strategy there is nothing to toggle.
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: 'rgb(var(--color-border) / <alpha-value>)', // slate-200
        input: 'rgb(var(--color-input) / <alpha-value>)', // white
        ring: 'rgb(var(--color-ring) / <alpha-value>)', // violet-500
        background: 'rgb(var(--color-background) / <alpha-value>)', // #FAF8F6 warm off-white
        sidebar: 'rgb(var(--color-sidebar) / <alpha-value>)', // #F9F9F8 neutral warm off-white
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)', // slate-800
        mahroon:"#fee0df",//#AC2334
        /* ----------------------------------------------------------------
         * HUE RAMPS — only the pale end (50/100/200) is redirected to a
         * variable; 300-950 are spread in from Tailwind untouched. Spread
         * explicitly rather than relying on `extend` to deep-merge, so what
         * each ramp contains is readable here instead of inferred.
         *
         * Scoping is by STEP, not by property, so `text-red-50` and
         * `ring-red-200` follow the theme too. Checked before committing to
         * it: there is no text at these steps outside an existing `dark:`
         * variant, and all 18 ring usages are decorative halos rather than
         * focus indicators, so a dark-tinted halo is what they should become.
         * A light LABEL at step 50 would need changing to text-white; there
         * are none today, and that is the thing to watch for when adding one.
         * ---------------------------------------------------------------- */
        red: {
          ...colors.red,
          50: 'rgb(var(--red-50) / <alpha-value>)',
          100: 'rgb(var(--red-100) / <alpha-value>)',
          200: 'rgb(var(--red-200) / <alpha-value>)',
        },
        orange: {
          ...colors.orange,
          50: 'rgb(var(--orange-50) / <alpha-value>)',
          100: 'rgb(var(--orange-100) / <alpha-value>)',
          200: 'rgb(var(--orange-200) / <alpha-value>)',
        },
        amber: {
          ...colors.amber,
          50: 'rgb(var(--amber-50) / <alpha-value>)',
          100: 'rgb(var(--amber-100) / <alpha-value>)',
          200: 'rgb(var(--amber-200) / <alpha-value>)',
        },
        yellow: {
          ...colors.yellow,
          50: 'rgb(var(--yellow-50) / <alpha-value>)',
          100: 'rgb(var(--yellow-100) / <alpha-value>)',
          200: 'rgb(var(--yellow-200) / <alpha-value>)',
        },
        lime: {
          ...colors.lime,
          50: 'rgb(var(--lime-50) / <alpha-value>)',
          100: 'rgb(var(--lime-100) / <alpha-value>)',
          200: 'rgb(var(--lime-200) / <alpha-value>)',
        },
        green: {
          ...colors.green,
          50: 'rgb(var(--green-50) / <alpha-value>)',
          100: 'rgb(var(--green-100) / <alpha-value>)',
          200: 'rgb(var(--green-200) / <alpha-value>)',
        },
        emerald: {
          ...colors.emerald,
          50: 'rgb(var(--emerald-50) / <alpha-value>)',
          100: 'rgb(var(--emerald-100) / <alpha-value>)',
          200: 'rgb(var(--emerald-200) / <alpha-value>)',
        },
        teal: {
          ...colors.teal,
          50: 'rgb(var(--teal-50) / <alpha-value>)',
          100: 'rgb(var(--teal-100) / <alpha-value>)',
          200: 'rgb(var(--teal-200) / <alpha-value>)',
        },
        cyan: {
          ...colors.cyan,
          50: 'rgb(var(--cyan-50) / <alpha-value>)',
          100: 'rgb(var(--cyan-100) / <alpha-value>)',
          200: 'rgb(var(--cyan-200) / <alpha-value>)',
        },
        sky: {
          ...colors.sky,
          50: 'rgb(var(--sky-50) / <alpha-value>)',
          100: 'rgb(var(--sky-100) / <alpha-value>)',
          200: 'rgb(var(--sky-200) / <alpha-value>)',
        },
        blue: {
          ...colors.blue,
          50: 'rgb(var(--blue-50) / <alpha-value>)',
          100: 'rgb(var(--blue-100) / <alpha-value>)',
          200: 'rgb(var(--blue-200) / <alpha-value>)',
        },
        indigo: {
          ...colors.indigo,
          50: 'rgb(var(--indigo-50) / <alpha-value>)',
          100: 'rgb(var(--indigo-100) / <alpha-value>)',
          200: 'rgb(var(--indigo-200) / <alpha-value>)',
        },
        violet: {
          ...colors.violet,
          50: 'rgb(var(--violet-50) / <alpha-value>)',
          100: 'rgb(var(--violet-100) / <alpha-value>)',
          200: 'rgb(var(--violet-200) / <alpha-value>)',
        },
        purple: {
          ...colors.purple,
          50: 'rgb(var(--purple-50) / <alpha-value>)',
          100: 'rgb(var(--purple-100) / <alpha-value>)',
          200: 'rgb(var(--purple-200) / <alpha-value>)',
        },
        fuchsia: {
          ...colors.fuchsia,
          50: 'rgb(var(--fuchsia-50) / <alpha-value>)',
          100: 'rgb(var(--fuchsia-100) / <alpha-value>)',
          200: 'rgb(var(--fuchsia-200) / <alpha-value>)',
        },
        pink: {
          ...colors.pink,
          50: 'rgb(var(--pink-50) / <alpha-value>)',
          100: 'rgb(var(--pink-100) / <alpha-value>)',
          200: 'rgb(var(--pink-200) / <alpha-value>)',
        },
        rose: {
          ...colors.rose,
          50: 'rgb(var(--rose-50) / <alpha-value>)',
          100: 'rgb(var(--rose-100) / <alpha-value>)',
          200: 'rgb(var(--rose-200) / <alpha-value>)',
        },
        /* ----------------------------------------------------------------
         * NEUTRAL RAMPS — all five Tailwind ships: slate, gray, zinc, neutral,
     * stone. All five, because missing one is invisible until someone hovers
     * the row that uses it: the Settings nav item was `hover:bg-zinc-100`
     * and stayed a white slab after the other ramps were done.
         *
         * The values are IDENTICAL to Tailwind's in light mode (see the
         * :root block in styles/tailwind.css), so this override changes
         * nothing today. What it buys is that the ~900 hardcoded
         * `bg-slate-50` / `text-slate-700` / `bg-gray-300` utilities across
         * the app follow the theme instead of staying light — without
         * rewriting 900 call sites, which is the only reason dark mode was
         * affordable here at all.
         *
         * The six places that use these ramps for a DARK surface are the
         * exception and carry their own `dark:` override; see the note in
         * styles/tailwind.css.
         * ---------------------------------------------------------------- */
        zinc: {
          50: 'rgb(var(--zinc-50) / <alpha-value>)',
          100: 'rgb(var(--zinc-100) / <alpha-value>)',
          200: 'rgb(var(--zinc-200) / <alpha-value>)',
          300: 'rgb(var(--zinc-300) / <alpha-value>)',
          400: 'rgb(var(--zinc-400) / <alpha-value>)',
          500: 'rgb(var(--zinc-500) / <alpha-value>)',
          600: 'rgb(var(--zinc-600) / <alpha-value>)',
          700: 'rgb(var(--zinc-700) / <alpha-value>)',
          800: 'rgb(var(--zinc-800) / <alpha-value>)',
          900: 'rgb(var(--zinc-900) / <alpha-value>)',
          950: 'rgb(var(--zinc-950) / <alpha-value>)',
        },
        stone: {
          50: 'rgb(var(--stone-50) / <alpha-value>)',
          100: 'rgb(var(--stone-100) / <alpha-value>)',
          200: 'rgb(var(--stone-200) / <alpha-value>)',
          300: 'rgb(var(--stone-300) / <alpha-value>)',
          400: 'rgb(var(--stone-400) / <alpha-value>)',
          500: 'rgb(var(--stone-500) / <alpha-value>)',
          600: 'rgb(var(--stone-600) / <alpha-value>)',
          700: 'rgb(var(--stone-700) / <alpha-value>)',
          800: 'rgb(var(--stone-800) / <alpha-value>)',
          900: 'rgb(var(--stone-900) / <alpha-value>)',
          950: 'rgb(var(--stone-950) / <alpha-value>)',
        },
        slate: {
          50: 'rgb(var(--slate-50) / <alpha-value>)',
          100: 'rgb(var(--slate-100) / <alpha-value>)',
          200: 'rgb(var(--slate-200) / <alpha-value>)',
          300: 'rgb(var(--slate-300) / <alpha-value>)',
          400: 'rgb(var(--slate-400) / <alpha-value>)',
          500: 'rgb(var(--slate-500) / <alpha-value>)',
          600: 'rgb(var(--slate-600) / <alpha-value>)',
          700: 'rgb(var(--slate-700) / <alpha-value>)',
          800: 'rgb(var(--slate-800) / <alpha-value>)',
          900: 'rgb(var(--slate-900) / <alpha-value>)',
          950: 'rgb(var(--slate-950) / <alpha-value>)',
        },
        gray: {
          50: 'rgb(var(--gray-50) / <alpha-value>)',
          100: 'rgb(var(--gray-100) / <alpha-value>)',
          200: 'rgb(var(--gray-200) / <alpha-value>)',
          300: 'rgb(var(--gray-300) / <alpha-value>)',
          400: 'rgb(var(--gray-400) / <alpha-value>)',
          500: 'rgb(var(--gray-500) / <alpha-value>)',
          600: 'rgb(var(--gray-600) / <alpha-value>)',
          700: 'rgb(var(--gray-700) / <alpha-value>)',
          800: 'rgb(var(--gray-800) / <alpha-value>)',
          900: 'rgb(var(--gray-900) / <alpha-value>)',
          950: 'rgb(var(--gray-950) / <alpha-value>)',
        },
        neutral: {
          50: 'rgb(var(--neutral-50) / <alpha-value>)',
          100: 'rgb(var(--neutral-100) / <alpha-value>)',
          200: 'rgb(var(--neutral-200) / <alpha-value>)',
          300: 'rgb(var(--neutral-300) / <alpha-value>)',
          400: 'rgb(var(--neutral-400) / <alpha-value>)',
          500: 'rgb(var(--neutral-500) / <alpha-value>)',
          600: 'rgb(var(--neutral-600) / <alpha-value>)',
          700: 'rgb(var(--neutral-700) / <alpha-value>)',
          800: 'rgb(var(--neutral-800) / <alpha-value>)',
          900: 'rgb(var(--neutral-900) / <alpha-value>)',
          950: 'rgb(var(--neutral-950) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)', // violet-500
          foreground: 'rgb(var(--color-primary-foreground) / <alpha-value>)', // white
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary) / <alpha-value>)', // violet-400
          foreground: 'rgb(var(--color-secondary-foreground) / <alpha-value>)', // white
        },
        destructive: {
          DEFAULT: 'rgb(var(--color-destructive) / <alpha-value>)', // red-500
          foreground: 'rgb(var(--color-destructive-foreground) / <alpha-value>)', // white
        },
        muted: {
          DEFAULT: 'rgb(var(--color-muted) / <alpha-value>)', // slate-50
          foreground: 'rgb(var(--color-muted-foreground) / <alpha-value>)', // slate-500
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)', // amber-300
          foreground: 'rgb(var(--color-accent-foreground) / <alpha-value>)', // slate-800
        },
        popover: {
          DEFAULT: 'rgb(var(--color-popover) / <alpha-value>)', // white
          foreground: 'rgb(var(--color-popover-foreground) / <alpha-value>)', // slate-800
        },
        card: {
          DEFAULT: 'rgb(var(--color-card) / <alpha-value>)', // white
          foreground: 'rgb(var(--color-card-foreground) / <alpha-value>)', // slate-800
        },
        success: {
          DEFAULT: 'rgb(var(--color-success) / <alpha-value>)', // emerald-500
          foreground: 'rgb(var(--color-success-foreground) / <alpha-value>)', // white
        },
        warning: {
          DEFAULT: 'rgb(var(--color-warning) / <alpha-value>)', // amber-500
          foreground: 'rgb(var(--color-warning-foreground) / <alpha-value>)', // white
        },
        error: {
          DEFAULT: 'rgb(var(--color-error) / <alpha-value>)', // red-500
          foreground: 'rgb(var(--color-error-foreground) / <alpha-value>)', // white
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      boxShadow: {
        'elevation-1': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'elevation-2': '0 4px 6px rgba(0, 0, 0, 0.1)',
      },
      transitionTimingFunction: {
        // Shared easing for premium micro-interactions (ProjectCard et al).
        premium: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-in': 'slideIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        // Expanding halo behind the "Active" status dot on ProjectCard.
        'pulse-ring': 'pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // Bell swing fired when a new notification arrives (Header).
        'bell-swing': 'bellSwing 900ms cubic-bezier(0.36, 0.07, 0.19, 0.97) 1',
        // Tight, fast shake when the notification button is hovered. Runs ONCE
        // per hover rather than looping — a shake that never stops reads as a
        // fault rather than a response. Leaving and re-entering replays it,
        // because the class is removed and re-added.
        'bell-vibrate': 'bellVibrate 450ms ease-in-out 1',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.55' },
          '70%': { transform: 'scale(2.6)', opacity: '0' },
          '100%': { transform: 'scale(2.6)', opacity: '0' },
        },
        bellVibrate: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '20%': { transform: 'rotate(-11deg)' },
          '40%': { transform: 'rotate(9deg)' },
          '60%': { transform: 'rotate(-6deg)' },
          '80%': { transform: 'rotate(3deg)' },
        },
        bellSwing: {
          '0%, 100%': { transform: 'rotate(0)' },
          '10%': { transform: 'rotate(18deg)' },
          '20%': { transform: 'rotate(-16deg)' },
          '30%': { transform: 'rotate(14deg)' },
          '40%': { transform: 'rotate(-12deg)' },
          '50%': { transform: 'rotate(8deg)' },
          '60%': { transform: 'rotate(-6deg)' },
          '70%': { transform: 'rotate(4deg)' },
          '80%': { transform: 'rotate(-2deg)' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      zIndex: {
        '60': '60',
        '50': '50',
        '40': '40',
        '30': '30',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('tailwindcss-animate'),
  ],
}