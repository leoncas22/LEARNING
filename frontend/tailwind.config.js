/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Shared LMS design tokens: warm neutral foundations with a restrained blue action accent.
        primary: '#2563EB',
        background: '#F5F1E8',
        surface: '#FFFFFF',
        'text-main': '#1E1B16',
        muted: '#786F65',
        success: '#287A55',
        warning: '#A56816',
        danger: '#5C1A1A',
        info: '#2563EB',
        cream: '#F5F1E8',
        gold: '#B8935A',
        espresso: '#1E1B16',
        burgundy: '#5C1A1A',
        'border-warm': '#E1D6BF',
        'focus-ring': '#2563EB',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
