/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        'text-main': '#0F172A',
        muted: '#64748B',
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC2626',

        // Auth-specific warm cream, gold, dark brown, and burgundy palette.
        // Kept as separate tokens from the primary application palette.
        cream: '#F5F1E8',
        gold: '#B8935A',
        espresso: '#1E1B16',
        burgundy: '#5C1A1A',
        'border-warm': '#E1D6BF',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
