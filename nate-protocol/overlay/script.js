/**
 * NATE PROTOCOL - LIVESTREAM OVERLAY CONTROLLER
 * Simulates real-time data fetching (mock for now)
 */

// Simulation Configuration
const MOCK_DATA = {
    priceBase: 1.05,
    heartRateBase: 58,
    deepWorkSeconds: 3 * 3600 + 45 * 60, // 3h 45m start
};

function updateTicker() {
    // 1. Simulate Price Fluctuation (Volatile around $1.05)
    // Small random walk
    const volatility = (Math.random() - 0.5) * 0.01;
    MOCK_DATA.priceBase += volatility;
    // Hard floor at 1.00
    if (MOCK_DATA.priceBase < 1.00) MOCK_DATA.priceBase = 1.00;

    document.querySelector('.price-up').textContent = `$${MOCK_DATA.priceBase.toFixed(3)}`;
}

function updateBioMetrics() {
    // 2. Simulate Heart Rate (Variability)
    const variance = Math.floor(Math.random() * 5) - 2;
    const currentHR = MOCK_DATA.heartRateBase + variance;
    document.getElementById('heart-rate').innerHTML = `${currentHR} <span class="unit">BPM</span>`;

    // 3. Increment Deep Work Timer
    MOCK_DATA.deepWorkSeconds++;
    const h = Math.floor(MOCK_DATA.deepWorkSeconds / 3600);
    const m = Math.floor((MOCK_DATA.deepWorkSeconds % 3600) / 60);
    const s = MOCK_DATA.deepWorkSeconds % 60;

    const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`; // :${s.toString().padStart(2, '0')}
    document.getElementById('deep-work').textContent = timeString;
}

// Init
setInterval(updateTicker, 3000);      // Price update every 3s
setInterval(updateBioMetrics, 1000);  // Bio update every 1s

console.log("Overlay Loaded. Ready for OBS.");
