/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lula: '#E53E3E',
        bolsonaro: '#3182CE',
        neutraldata: '#718096',
        abstencao: '#DD6B20',
        post17h: '#805AD5',
        app: '#F7FAFC',
      },
    },
  },
  plugins: [],
};
