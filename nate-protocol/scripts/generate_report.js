const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("--- Nate Protocol Financial Report Generator ---\n");

    const deploymentPath = path.join(__dirname, "../deployment-localhost.json");
    if (!fs.existsSync(deploymentPath)) {
        console.error("No deployment-localhost.json found. Please deploy first.");
        return;
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const addresses = deployment.contracts;

    // Contracts
    const StabilityEngine = await ethers.getContractAt("StabilityEngine", addresses.StabilityEngine);
    const TaskMarket = await ethers.getContractAt("TaskMarket", addresses.TaskMarket);
    const NateToken = await ethers.getContractAt("NateProtocol", addresses.NateProtocol);
    const LifeOracle = await ethers.getContractAt("LifeOracleV2", addresses.LifeOracleV2);

    // 1. Token Metrics
    const totalSupply = await NateToken.totalSupply();
    const formattedSupply = ethers.formatEther(totalSupply);

    // 2. System Status
    const status = await StabilityEngine.getSystemStatus();
    const totalValueUSD = Number(status.totalValueUSD) / 1e8; // Assuming 8 decimals for USD
    const liquidEth = ethers.formatEther(status.liquidEth);
    const collateralRatio = status.collateralRatio.toString();

    // 3. Human Capital
    const humanCapital = totalValueUSD - (Number(liquidEth) * 2500); // Rough estimate using fixed price

    // 4. Revenue & Fees
    const ethFees = await StabilityEngine.accumulatedEthFees();
    const nateFees = await TaskMarket.accumulatedFees();

    // 5. Owner Proceeds (Calculated from events would be better, but we can't easily do that here without more logic)
    // For now, let's just report the tracked fees.

    console.log(`[ TOKEN METRICS ]`);
    console.log(`Total Supply:       ${Number(formattedSupply).toLocaleString()} $NATE`);
    console.log(`Collateral Ratio:   ${collateralRatio}%`);
    console.log(`Target CR:          150%`);
    console.log(``);

    console.log(`[ TREASURY & BACKING ]`);
    console.log(`Total Backing:      $${totalValueUSD.toLocaleString()} USD`);
    console.log(`Liquid ETH:         ${Number(liquidEth).toFixed(4)} ETH`);
    console.log(`Human Capital:      $${humanCapital.toLocaleString()} USD`);
    console.log(``);

    console.log(`[ PROTOCOL REVENUE ]`);
    console.log(`ETH Fees:           ${ethers.formatEther(ethFees)} ETH`);
    console.log(`$NATE Fees:         ${ethers.formatEther(nateFees)} $NATE`);
    console.log(``);

    console.log("--------------------------------------------");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
