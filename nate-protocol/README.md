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

## License
MIT
