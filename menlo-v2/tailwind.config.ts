import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // מותג מנלו - שילוב הייטקי ונוכחות חזקה
        menlo: {
          charcoal: '#414042',    // אפור פחם שלד מקורי
          dark: '#1e2022',        // פחם עמוק לרקעי חמ"ל
          surface: '#2b2d30',     // משטחי כרטיסיות כהים
          blue: '#1b75bc',        // כחול הנדסי מנלו מקורי
          blueHover: '#155d96',   // כחול כהה לריחוף
          amber: '#f3c936',       // ענבר בטיחות / נוכחות חזקה
          amberGlow: '#ffd84d',   // ענבר מואר לטאץ' בשטח
          teal: '#00a79d',        // טורקיז אדריכלי לאישורים
          slate: '#0f172a',       // רקע כהה עמוק
        },
      },
      fontFamily: {
        hebrew: ['Heebo', 'system-ui', 'sans-serif'],
        num: ['Rubik', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-blue': '0 0 20px -3px rgba(27, 117, 188, 0.4)',
        'glow-amber': '0 0 20px -3px rgba(243, 201, 54, 0.45)',
        'strong': '0 10px 30px -5px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
