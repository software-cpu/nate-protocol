// Chainlink Functions source - calculates human capital value
// Returns ABI-encoded: (uint256,uint8,uint8,uint8,uint16,uint256,uint256)

const sleepScore = 85;
const restingHeartRate = 52;
const deepWorkHours = 6;
const commitStreak = 14;
const socialScore = 18000;
const futureEarnings = 5000;

const ETH_PRICE = 2500;
const dailyValueUSD = (deepWorkHours * 250) * (sleepScore / 80) * (1 + Math.min(commitStreak, 20) / 100) + socialScore / 1000;
const weiValue = BigInt(Math.floor((dailyValueUSD / ETH_PRICE) * 1e18));
const futureWei = BigInt(Math.floor((futureEarnings / ETH_PRICE) * 1e18));

function pad(v) { let h = BigInt(v).toString(16); return h.padStart(64, '0'); }

return Buffer.from(
    pad(weiValue) + pad(sleepScore) + pad(restingHeartRate) + pad(deepWorkHours) +
    pad(commitStreak) + pad(socialScore) + pad(futureWei), 'hex'
);
