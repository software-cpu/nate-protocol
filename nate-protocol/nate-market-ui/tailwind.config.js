/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'nate-dark': '#0a0a0f',
                'nate-green': '#00ff41',
                'nate-blue': '#00f3ff',
                'nate-red': '#ff0033',
                'nate-card': '#1a1a24'
            },
            fontFamily: {
                'display': ['Orbitron', 'sans-serif'],
                'body': ['Rajdhani', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
