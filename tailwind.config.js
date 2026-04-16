/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-container': 'var(--primary-container)',
        secondary: 'var(--secondary)',
        'secondary-container': 'var(--secondary-container)',
        'on-secondary-container': 'var(--on-secondary-container)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'surface-container': 'var(--surface-container)',
        'surface-container-low': 'var(--surface-container-low)',
        'surface-container-lowest': 'var(--surface-container-lowest)',
        'surface-container-high': 'var(--surface-container-high)',
        'surface-bright': 'var(--surface-bright)',
        'on-surface': 'var(--on-surface)',
        'on-surface-variant': 'var(--on-surface-variant)',
        'outline-variant': 'var(--outline-variant)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius-default)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
    },
  },
  plugins: [],
}
