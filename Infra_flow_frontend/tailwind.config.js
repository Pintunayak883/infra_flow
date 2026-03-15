/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        primary: {
          50: '#e0edff',
          100: '#c7dcff',
          200: '#8fb1ff',
          300: '#5f8bff',
          400: '#3b6ffa',
          500: '#1e4ed8',
          600: '#1840b1',
          700: '#12328b',
          800: '#0b225d',
          900: '#051433',
          DEFAULT: '#1e4ed8',
          foreground: '#f8fafc',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5f5',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          DEFAULT: '#64748b',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#22c55e',
          50: '#e8f9ed',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          DEFAULT: '#f97316',
          50: '#fff4e6',
          500: '#f97316',
          600: '#ea580c',
        },
        danger: {
          DEFAULT: '#ef4444',
          50: '#feecec',
          500: '#ef4444',
          600: '#dc2626',
        },
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5f5',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f8fafc',
          alt: '#f1f5f9',
          border: '#e2e8f0',
          shadow: '#0f172a0d',
        },
      },
      borderRadius: {
        lg: '20px',
        xl: '28px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 20px 50px rgba(15, 23, 42, 0.08)',
        soft: '0 10px 30px rgba(15, 23, 42, 0.06)',
      },
      spacing: {
        gutter: '1.75rem',
        section: '4rem',
      },
      screens: {
        '2xl': '1400px',
      },
      animation: {
        fade: 'fade 300ms ease-out',
      },
      keyframes: {
        fade: {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
