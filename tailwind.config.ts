import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        apex: {
          red: '#C0392B',
          'red-dark': '#A93226',
          'red-light': '#E74C3C',
          bg: '#1C1C1C',
          surface: '#242424',
          card: '#2A2A2A',
          border: '#333333',
          'border-light': '#3D3D3D',
          text: '#F5F5F5',
          muted: '#9CA3AF',
          gold: '#F59E0B',
          silver: '#9CA3AF',
          bronze: '#B45309',
        },
        discipline: {
          rally: '#F97316',
          circuito: '#3B82F6',
          drift: '#A855F7',
          kartcross: '#22C55E',
          monoplaza: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['var(--font-space-grotesk)', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'apex-gradient': 'linear-gradient(135deg, #C0392B 0%, #1C1C1C 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-red': 'pulseRed 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(192, 57, 43, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(192, 57, 43, 0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
