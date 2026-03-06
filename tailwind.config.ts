import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#454547",
          teal: "#F18E00",
          slate: "#808083",
          mist: "#EFEFF1"
        }
      }
    }
  },
  plugins: []
};

export default config;
