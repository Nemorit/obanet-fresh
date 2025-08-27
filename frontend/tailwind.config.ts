import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ObaNet Diaspora Color Palette
      colors: {
        // Primary colors inspired by Turkish cultural heritage
        primary: {
          50: '#fef7f0',
          100: '#fdeee0',
          200: '#fad9c1',
          300: '#f7be96',
          400: '#f39969',
          500: '#ee7544', // Main brand orange (Turkish sunset)
          600: '#df5a2c',
          700: '#b84423',
          800: '#933623',
          900: '#772e20',
          950: '#40150f',
        },
        // Secondary colors (Turkish flag red)
        secondary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#e11d48', // Turkish flag red
          600: '#be123c',
          700: '#9f1239',
          800: '#881337',
          900: '#7c2d12',
          950: '#450a0a',
        },
        // Diaspora theme colors
        diaspora: {
          // Oba tent colors (nomadic heritage)
          tent: '#8B4513',
          felt: '#DEB887',
          // Journey colors
          journey: '#4A90E2',
          homeland: '#228B22',
          // Connection colors
          bridge: '#FFD700',
          community: '#9370DB',
          // Cultural colors
          turkish: '#E11D48',
          cultural: '#FF6B35',
        },
        // Neutral grays
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
      },
      // Typography
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: [
          'Cal Sans',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        mono: [
          'Fira Code',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      // Spacing based on golden ratio and cultural significance
      spacing: {
        '18': '4.5rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      // Border radius (Oba circle inspiration)
      borderRadius: {
        'oba': '50% 20% / 10% 40%',
        'tent': '0 0 50% 50%',
        'cultural': '25% 10%',
      },
      // Shadows
      boxShadow: {
        'oba': '0 25px 50px -12px rgba(238, 117, 68, 0.25)',
        'cultural': '0 10px 25px -5px rgba(225, 29, 72, 0.1)',
        'diaspora': '0 20px 25px -5px rgba(74, 144, 226, 0.1), 0 10px 10px -5px rgba(74, 144, 226, 0.04)',
      },
      // Animation
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'oba-float': 'obaFloat 6s ease-in-out infinite',
        'cultural-glow': 'culturalGlow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        obaFloat: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        culturalGlow: {
          '0%': { boxShadow: '0 0 5px rgba(238, 117, 68, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(238, 117, 68, 0.8)' },
        },
      },
      // Breakpoints for responsive design
      screens: {
        'xs': '475px',
        '3xl': '1600px',
      },
      // Background patterns
      backgroundImage: {
        'oba-pattern': "url('/patterns/oba-pattern.svg')",
        'cultural-gradient': 'linear-gradient(135deg, #ee7544 0%, #e11d48 100%)',
        'diaspora-gradient': 'linear-gradient(135deg, #4A90E2 0%, #9370DB 100%)',
        'tent-texture': "url('/textures/felt-texture.png')",
      },
      // Grid system
      gridTemplateColumns: {
        'diaspora': 'repeat(auto-fit, minmax(300px, 1fr))',
        'community-card': 'repeat(auto-fill, minmax(280px, 1fr))',
        'post-grid': 'repeat(auto-fit, minmax(350px, 1fr))',
      },
      // Typography scales
      fontSize: {
        'diaspora-title': ['3rem', { lineHeight: '1.1', fontWeight: '700' }],
        'community-title': ['2rem', { lineHeight: '1.2', fontWeight: '600' }],
        'post-title': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
      },
      // Z-index scale
      zIndex: {
        'modal': '50',
        'dropdown': '40',
        'header': '30',
        'sidebar': '20',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    // Custom plugin for ObaNet components
    function({ addComponents, theme }: any) {
      addComponents({
        '.oba-card': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.xl'),
          boxShadow: theme('boxShadow.oba'),
          padding: theme('spacing.6'),
          border: `1px solid ${theme('colors.gray.200')}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme('boxShadow.cultural'),
          },
        },
        '.diaspora-gradient': {
          background: theme('backgroundImage.diaspora-gradient'),
        },
        '.cultural-text': {
          background: theme('backgroundImage.cultural-gradient'),
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
        },
        '.oba-button': {
          backgroundColor: theme('colors.primary.500'),
          color: theme('colors.white'),
          padding: `${theme('spacing.3')} ${theme('spacing.6')}`,
          borderRadius: theme('borderRadius.lg'),
          fontWeight: theme('fontWeight.semibold'),
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: theme('colors.primary.600'),
            transform: 'translateY(-1px)',
            boxShadow: theme('boxShadow.md'),
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
      })
    },
  ],
  darkMode: 'class',
}

export default config