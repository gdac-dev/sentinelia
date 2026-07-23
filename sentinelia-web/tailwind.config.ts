/**
 * SentinelIA Design System — Token Reference
 *
 * NOTE: Tailwind CSS v4 uses CSS-first configuration via @theme blocks
 * in globals.css. This file serves as a TypeScript reference for the
 * design tokens used throughout the application.
 *
 * The actual theme values are defined in: app/globals.css
 */

const designTokens = {
  colors: {
    bg: {
      primary: "#0A0E17",
      card: "#131826",
      elevated: "#1A2035",
    },
    accent: {
      DEFAULT: "#00E5CC",
      muted: "#00E5CC33",
    },
    alert: {
      DEFAULT: "#FFB020",
      muted: "#FFB02033",
    },
    danger: {
      DEFAULT: "#FF4C61",
      muted: "#FF4C6133",
    },
    text: {
      primary: "#E8ECF4",
      secondary: "#8892A8",
      muted: "#4A5568",
    },
    border: {
      DEFAULT: "#1E2640",
      accent: "#00E5CC40",
    },
  },
  fonts: {
    heading: "Space Grotesk",
    body: "Inter",
  },
  radius: {
    sm: "6px",
    md: "10px",
    lg: "16px",
    xl: "24px",
  },
} as const;

export default designTokens;
