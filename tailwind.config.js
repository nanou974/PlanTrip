/** @type {import('tailwindcss').Config} */

// Tokens d'identité — source : VISUAL_IDENTITY_GUIDELINES.md
// Palette UI : planches 04 (Color Language) et 06/07/08/09 (écrans).
// Typographie : planche 05 (Space Grotesk titres, Inter texte).
// Grille : planche 11 (unité 8 px, icônes 24 px, trait 2 px).
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pt: {
          orange: "#FFBA3D",
          "orange-ink": "#A85400",
          "orange-soft": "#FFF4DF",
          green: "#2E7D5B",
          "green-dark": "#24634A",
          "green-soft": "#E8F1ED",
          sage: "#6FABA1",
          blue: "#1E3A5F",
          neutral: "#2B2F33",
          cream: "#F5F2ED",
          light: "#F1F3F4",
          line: "#E4E1DA",
          danger: "#B4341F",
          "danger-soft": "#FBECE8",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        // planche 05 — hiérarchie visuelle
        h1: ["2rem", { lineHeight: "2.5rem", fontWeight: "700" }],
        h2: ["1.5rem", { lineHeight: "2rem", fontWeight: "600" }],
        h3: ["1.125rem", { lineHeight: "1.625rem", fontWeight: "500" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(43,47,51,.04), 0 8px 24px rgba(43,47,51,.06)",
        pop: "0 12px 40px rgba(43,47,51,.14)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "fade-up": "fade-up .4s ease both",
      },
    },
  },
  plugins: [],
}
