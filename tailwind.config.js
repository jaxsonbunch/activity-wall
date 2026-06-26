/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0a0f',
        'bg-secondary': '#111118',
        'bg-card': '#16161e',
        'bg-sidebar': '#0d0d12',
        'border': '#1f1f2e',
        'accent': '#dc2626',
        'accent-light': '#ef4444',
        'accent-hover': '#b91c1c',
        'text-primary': '#f1f5f9',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
        'success': '#22c55e',
        'warning': '#f59e0b',
        'info': '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
