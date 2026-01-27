# Nate Protocol

Nate Protocol ($NATE) is a decentralized asset protocol backed by human capital metrics. It utilizes on-chain oracles to tokenize productive output, creating a currency backed by verifiable performance data rather than purely speculative assets.

## Architecture

The system consists of modular components designed for stability and governance:

### 1. LifeOracle
Aggregates verifiable off-chain data (productivity, health, social metrics) and commits them on-chain via Chainlink Functions. This data forms the "Human Capital" backing of the protocol.

### 2. Stability Engine
Manages the minting and redemption of $NATE tokens.
- **Collateralization**: Ensures the total supply of $NATE is backed by at least 150% value (Liquid Assets + Human Capital Valuation).
- **Minting**: Authorized when collateral ratios permit (System Value > Supply * 1.5).
- **Redemption**: $NATE can be redeemed for ETH from the treasury liquid reserves.

### 3. GovernanceBoard
Implements an algorithmic governance layer using PID Control Theory.
- **Adaptive Control**: Adjusts minting capacity based on market confidence signals.
- **Feedback Loop**: Uses prediction market data to dampen or accelerate token emission, ensuring supply matches real-world demand and trust.

### 4. TaskMarket
A prediction market interface where participants signal confidence in the issuer's execution capability. This data feeds into the GovernanceBoard.

## Quick Start

### Prerequisites
- Node.js 18+
- Hardhat

### Installation

```bash
git clone https://github.com/software-cpu/nate-protocol.git
cd nate-protocol/nate-protocol
npm install
```

### Local Simulation

Run the full system simulation locally to see the interaction between the Oracle, Stability Engine, and Governance modules.

```bash
npx hardhat run scripts/demo_local.js
```

### Testing

```bash
npm test
```

## Contributing
We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions and [ARCHITECTURE.md](./ARCHITECTURE.md) for a deep dive into the system design.

## Roadmap

### Phase 1: Foundation (Complete)
- [x] Oracle & Stability Engine
- [x] Local Simulation
- [x] Codebase Cleanup

### Phase 2: User Experience (Current)
- [x] Betting UI (React + Tailwind)
- [ ] Task Creation UI Polish
- [ ] Wallet Integration Tests

### Phase 3: Decentralization
- [ ] Sepolia Testnet Deployment
- [ ] Chainlink Functions Integration
- [ ] Auditor Review

## Testnet Deployment (Sepolia)
This guide walks you through deploying the Nate Protocol to the Sepolia Ethereum testnet.

### 1. Prerequisites (Faucets & Wallet)
Before deploying, you need a wallet with Sepolia ETH to pay for gas fees.

1.  **Metamask Setup**:
    - Create a **new account** in MetaMask just for development (e.g., "Sepolia Dev").
    - Enable "Show test networks" in MetaMask settings.
    - Switch to the "Sepolia" network.

2.  **Get Test ETH**:
    - [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) (0.05 ETH/day, simplest)
    - [Chainlink Faucet](https://faucets.chain.link/sepolia) (0.5 ETH + LINK)
    - [PoW Faucet](https://sepolia-faucet.pk910.de/) (Mine your own test ETH)

### 2. Configuration
Create a `.env` file in the root directory (copy from `.env.example`) and fill in your secrets:

```bash
cp .env.example .env
```

Edit `.env`:
```ini
# Your 64-char private key from MetaMask (without 0x)
SEPOLIA_PRIVATE_KEY=abcdef12345...

# RPC URL (use Alchemy/Infura or the public public one)
SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Etherscan API Key (for automatic verification)
ETHERSCAN_API_KEY=your_key_here
```

### 3. Deploy
Run the system deployment script targeting the Sepolia network:

```bash
npm run deploy:sepolia
```

**Output**:
- The script will deploy the Oracle, Token, Stability Engine, Governance Board, and Task Market.
- It will verify permissions and link contracts together.
- A `deployment-sepolia.json` file will be created with all the contract addresses.

### 4. Chainlink Oracle Setup
After deploying, you must connect your `LifeOracleV2` to Chainlink Functions to enable data fetching.

**Step 1: Create Subscription**
1.  Go to [Chainlink Functions Manager](https://functions.chain.link/sepolia).
2.  Connect your wallet (`Sepolia` network).
3.  Click **Create Subscription** and fund it with at least **3 LINK**.
4.  Add your `LifeOracleV2` address as a **Consumer**.
5.  Note your **Subscription ID**.

**Step 2: Update Contract**
Update the script `scripts/setup_chainlink.js` with your Subscription ID:
```javascript
const EXISTING_SUB_ID = 1234n; // Your ID here
```
Then run:
```bash
npx hardhat run scripts/setup_chainlink.js --network sepolia
```

**Step 3: Upload Source Code**
To upload the JavaScript logic that the Oracle executes:
```bash
npx hardhat run scripts/update_oracle.js --network sepolia
```
*Note: This uploads the code from `scripts/source/calculate_score_min.js`.*

### 4. Verification
To verify your contract source code on Etherscan (e.g., for `NateProtocol` token):

```bash
npx hardhat verify --network sepolia <TOKEN_ADDRESS> <DEPLOYER_ADDRESS>
```
*Note: Refer to `scripts/deploy_system.js` to see the constructor arguments used for each contract.*

## License
MIT
