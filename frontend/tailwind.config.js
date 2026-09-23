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

        // Auth-specific palette (Phase 3 spec, §34): warm cream / gold /
        // dark brown / burgundy. Scoped to auth pages only — the rest of
        // the app (dashboards etc., not yet built) still uses the blue
        // tokens above from Phase 1. Kept as separate tokens rather than
        // replacing `primary` so neither design system clobbers the other.
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
