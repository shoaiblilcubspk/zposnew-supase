/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
  extend: {
    scale: {
      '115': '1.15',
    },
  },
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary-rgb, 16 185 129) / <alpha-value>)',
        'primary-hover': 'rgb(var(--color-primary-hover-rgb, 5 150 105) / <alpha-value>)',
        app: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-hover': 'var(--color-surface-hover)',
        danger: 'rgb(var(--color-danger-rgb, 239 68 68) / <alpha-value>)',
        success: 'rgb(var(--color-success-rgb, 16 185 129) / <alpha-value>)',
        warning: 'rgb(var(--color-warning-rgb, 245 158 11) / <alpha-value>)',
      },
      textColor: {
        default: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
      },
      borderColor: {
        default: 'var(--color-border)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
};
