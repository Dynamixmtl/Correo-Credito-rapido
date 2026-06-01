import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          blue: '#1a3a5c',
          accent: '#0078d4',
          light: '#e8f0f8',
          success: '#107c10',
          danger: '#d13438',
          warning: '#797673',
        },
      },
    },
  },
  plugins: [],
};

export default config;
