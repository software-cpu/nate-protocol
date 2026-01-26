// This code executes in the Chainlink Functions Decentralized Oracle Network.
// It fetches data from multiple APIs and calculates the Human Capital Valuation.

// ==================================================================
// 1. FETCH DATA (Mocking APIs for Phase 2)
// In production, we would use Functions.makeHttpRequest()
// ==================================================================

// Sleep Data (e.g., from Oura/Whoop API)
// GET /v2/user/sleep
const sleepScore = 85; // Target: 80+
const restingHeartRate = 52; // Target: <60

// Productivity (e.g., from GitHub API)
// GET /users/nate/events
const deepWorkHours = 6; // Target: 4+
const commitStreak = 14;

// Social Impact (e.g., Twitter/Lens API)
const dailyImpressions = 15000;
const viralMultiplier = 1.2;
const socialScore = Math.floor(dailyImpressions * viralMultiplier);

// ==================================================================
// 2. CALCULATE VALUATION
// ==================================================================

const BASE_HOURLY_RATE = 250; // $250/hr
const ETH_PRICE = 2500; // $2500/ETH

// Sleep Multiplier: (Score / 80)
// 85 / 80 = 1.06x
const sleepMultiplier = sleepScore / 80;

// Streak Bonus: 1% per day, max 20%
const streakBonus = 1 + (Math.min(commitStreak, 20) / 100);

// Productive Value
let dailyValueUSD = (deepWorkHours * BASE_HOURLY_RATE) * sleepMultiplier * streakBonus;

// Add Social Value
dailyValueUSD += (socialScore / 1000); // $15 for viral reach

// Convert to Wei (1e18)
// Value / ETH_PRICE * 1e18
const weiValue = BigInt(Math.floor((dailyValueUSD / ETH_PRICE) * 1e18));

console.log(`Daily Value USD: $${dailyValueUSD.toFixed(2)}`);
console.log(`Wei Value: ${weiValue.toString()}`);

// ==================================================================
// 3. ENCODE RESPONSE
// Contract expects: (uint256, uint8, uint8, uint8, uint16, uint256)
// We must manually ABI encode this since ethers isn't available by default.
// ==================================================================

function to32ByteHex(val) {
    let hex = BigInt(val).toString(16); // Handle BigInt
    if (hex.startsWith("0x")) hex = hex.slice(2);
    // Add left padding
    return hex.padStart(64, "0");
}

const encoded =
    to32ByteHex(weiValue) +
    to32ByteHex(sleepScore) +
    to32ByteHex(restingHeartRate) +
    to32ByteHex(deepWorkHours) +
    to32ByteHex(commitStreak) +
    to32ByteHex(socialScore);

return Buffer.from(encoded, 'hex');
