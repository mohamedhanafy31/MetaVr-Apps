import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
      },
      colors: {
        // AI/VR Technology Theme Colors
        primary: {
          DEFAULT: "#0066FF",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#00D4FF",
          foreground: "#0A0E27",
        },
        secondary: {
          DEFAULT: "#7B2FFF",
          foreground: "#FFFFFF",
        },
        dark: {
          DEFAULT: "#0A0E27",
          foreground: "#E8E8E8",
        },
        background: {
          DEFAULT: "#F8F9FA",
          dark: "#0F1419",
        },
        foreground: {
          DEFAULT: "#1A1A1A",
          dark: "#E8E8E8",
        },
        // Status Colors
        success: "#00C851",
        warning: "#FFB300",
        error: "#FF4444",
        info: "#33B5E5",
        // Neutral colors for shadcn/ui compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      spacing: {
        // 4px base unit scale
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "6": "24px",
        "8": "32px",
        "12": "48px",
        "16": "64px",
        "24": "96px",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { 
            boxShadow: "0 0 10px rgba(0, 102, 255, 0.3)",
            opacity: "0.7"
          },
          "50%": { 
            boxShadow: "0 0 20px rgba(0, 102, 255, 0.3)",
            opacity: "1"
          },
        },
        "float-subtle": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "neon-glow": {
          "0%, 100%": { textShadow: "0 0 5px rgba(0, 102, 255, 0.3)" },
          "50%": { textShadow: "0 0 20px rgba(0, 102, 255, 0.3), 0 0 30px rgba(0, 102, 255, 0.3)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "shimmer": "shimmer 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "float-subtle": "float-subtle 6s ease-in-out infinite",
        "neon-glow": "neon-glow 2s ease-in-out infinite alternate",
      },
      boxShadow: {
        "glow-sm": "0 0 10px rgba(0, 102, 255, 0.3)",
        "glow-md": "0 0 20px rgba(0, 102, 255, 0.3)",
        "glow-lg": "0 0 30px rgba(0, 102, 255, 0.3)",
        "glow-purple": "0 0 20px rgba(123, 47, 255, 0.3)",
        "glow-cyan": "0 0 20px rgba(0, 212, 255, 0.3)",
        "glow-green": "0 0 20px rgba(0, 200, 81, 0.3)",
      },
      backdropBlur: {
        "xs": "2px",
        "sm": "4px",
        "md": "8px",
        "lg": "12px",
        "xl": "16px",
      },
      transitionTimingFunction: {
        "vr-smooth": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "vr-bounce": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
    },
  },
  plugins: [],
};

export default config;
