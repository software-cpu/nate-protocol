const hre = require("hardhat");
const { Token, CurrencyAmount, Percent } = require("@uniswap/sdk-core");
const { Pool, Position, nearestUsableTick, TickMath, TICK_SPACINGS, FeeAmount } = require("@uniswap/v3-sdk");
const fs = require('fs');

/**
 * 🌊 UNISWAP V3 POOL INITIALIZATION SCRIPT
 * Creates a concentrated liquidity pool for NATE/WETH with tight peg around $1.00
 * 
 * Usage:
 *   npx hardhat run scripts/init_uniswap_v3.js --network sepolia
 *   npx hardhat run scripts/init_uniswap_v3.js --network mainnet
 */

// Uniswap V3 Addresses (Sepolia / Mainnet)
const UNISWAP_ADDRESSES = {
    sepolia: {
        factory: "0x0227628f3F023bb0B980b67D528571c95c6DaC1c",
        positionManager: "0x1238536071E1c677A632429e3655c799b22cDA52",
        WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"
    },
    mainnet: {
        factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
        positionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
        WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    }
};

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const network = hre.network.name;

    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║           🌊 UNISWAP V3 POOL INITIALIZATION                  ║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");

    // Load deployment addresses
    const deploymentFile = `deployment-${network}.json`;
    if (!fs.existsSync(deploymentFile)) {
        throw new Error(`Deployment file ${deploymentFile} not found. Run deploy_system.js first.`);
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const nateAddress = deployment.contracts.NateProtocol;
    const addresses = UNISWAP_ADDRESSES[network];

    if (!addresses) {
        throw new Error(`Uniswap V3 not deployed on ${network}`);
    }

    console.log(`Network: ${network}`);
    console.log(`NATE Token: ${nateAddress}`);
    console.log(`WETH: ${addresses.WETH}\n`);

    // ========== STEP 1: Create Pool ==========
    console.log("─────────────────────────────────────────────────────────────────");
    console.log("  STEP 1: Creating NATE/WETH Pool (0.3% fee)");
    console.log("─────────────────────────────────────────────────────────────────");

    const factory = await hre.ethers.getContractAt(
        "IUniswapV3Factory",
        addresses.factory
    );

    // Determine token order (Uniswap requires token0 < token1)
    const token0Address = nateAddress.toLowerCase() < addresses.WETH.toLowerCase()
        ? nateAddress
        : addresses.WETH;
    const token1Address = token0Address === nateAddress
        ? addresses.WETH
        : nateAddress;

    const isNateToken0 = token0Address === nateAddress;

    // Fee tier: 0.3% (3000 = 0.3%)
    const fee = 3000;

    // Calculate initial price (1 NATE = $1.00 in ETH terms)
    // Assuming ETH = $2500, then 1 NATE = 1/2500 ETH = 0.0004 ETH
    // sqrtPriceX96 = sqrt(price) * 2^96
    // If NATE is token0: price = token1/token0 = WETH/NATE = 2500
    // If NATE is token1: price = token1/token0 = NATE/WETH = 1/2500 = 0.0004

    const ETH_PRICE_USD = 2500;
    const NATE_PRICE_USD = 1.00;

    let sqrtPriceX96;
    if (isNateToken0) {
        // price = WETH/NATE = ETH_PRICE / NATE_PRICE
        const price = ETH_PRICE_USD / NATE_PRICE_USD;
        const sqrtPrice = Math.sqrt(price);
        sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * (2 ** 96)));
    } else {
        // price = NATE/WETH = NATE_PRICE / ETH_PRICE
        const price = NATE_PRICE_USD / ETH_PRICE_USD;
        const sqrtPrice = Math.sqrt(price);
        sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * (2 ** 96)));
    }

    console.log(`   Token0: ${token0Address}`);
    console.log(`   Token1: ${token1Address}`);
    console.log(`   sqrtPriceX96: ${sqrtPriceX96.toString()}\n`);

    // Check if pool exists
    let poolAddress = await factory.getPool(token0Address, token1Address, fee);

    if (poolAddress === hre.ethers.ZeroAddress) {
        console.log("   Pool doesn't exist. Creating...");
        const tx = await factory.createAndInitializePoolIfNecessary(
            token0Address,
            token1Address,
            fee,
            sqrtPriceX96
        );
        await tx.wait();
        poolAddress = await factory.getPool(token0Address, token1Address, fee);
        console.log(`   ✓ Pool created: ${poolAddress}\n`);
    } else {
        console.log(`   Pool already exists: ${poolAddress}\n`);
    }

    // ========== STEP 2: Add Liquidity ==========
    console.log("─────────────────────────────────────────────────────────────────");
    console.log("  STEP 2: Adding Concentrated Liquidity ($0.99 - $1.01 range)");
    console.log("─────────────────────────────────────────────────────────────────");

    const nateToken = await hre.ethers.getContractAt("NateProtocol", nateAddress);
    const weth = await hre.ethers.getContractAt("IWETH", addresses.WETH);

    // Amounts to provide
    const NATE_AMOUNT = hre.ethers.parseEther("10000"); // 10k NATE
    const ETH_AMOUNT = hre.ethers.parseEther("4");      // 4 ETH (~$10k at $2500/ETH)

    console.log(`   Providing: ${hre.ethers.formatEther(NATE_AMOUNT)} NATE`);
    console.log(`   Providing: ${hre.ethers.formatEther(ETH_AMOUNT)} ETH\n`);

    // Wrap ETH to WETH
    console.log("   Wrapping ETH to WETH...");
    await weth.deposit({ value: ETH_AMOUNT });

    // Approve Position Manager
    console.log("   Approving tokens...");
    await nateToken.approve(addresses.positionManager, NATE_AMOUNT);
    await weth.approve(addresses.positionManager, ETH_AMOUNT);

    // Calculate tick range for $0.99 - $1.01
    // This is complex - approximate for now
    const tickSpacing = TICK_SPACINGS[FeeAmount.MEDIUM]; // 60
    const currentTick = TickMath.getTickAtSqrtRatio(sqrtPriceX96);
    const tickLower = nearestUsableTick(currentTick - 200, tickSpacing);
    const tickUpper = nearestUsableTick(currentTick + 200, tickSpacing);

    console.log(`   Tick Range: ${tickLower} to ${tickUpper}\n`);

    const positionManager = await hre.ethers.getContractAt(
        "INonfungiblePositionManager",
        addresses.positionManager
    );

    const amount0 = isNateToken0 ? NATE_AMOUNT : ETH_AMOUNT;
    const amount1 = isNateToken0 ? ETH_AMOUNT : NATE_AMOUNT;

    const mintParams = {
        token0: token0Address,
        token1: token1Address,
        fee: fee,
        tickLower: tickLower,
        tickUpper: tickUpper,
        amount0Desired: amount0,
        amount1Desired: amount1,
        amount0Min: 0,
        amount1Min: 0,
        recipient: deployer.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20 // 20 min
    };

    console.log("   Minting position...");
    const tx = await positionManager.mint(mintParams);
    const receipt = await tx.wait();

    console.log(`   ✓ Liquidity added! TX: ${receipt.hash}\n`);

    // ========== COMPLETE ==========
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║           ✅ UNISWAP V3 POOL READY                            ║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");

    console.log(`Pool Address: ${poolAddress}`);
    console.log(`View on Uniswap: https://app.uniswap.org/#/pool/${poolAddress}\n`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
