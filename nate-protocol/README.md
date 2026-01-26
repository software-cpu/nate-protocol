# The Nate Protocol: The Living Stablecoin

> **"This isn't just DeFi—it's a statement about the future of work, self-sovereignty, and human value."**

The **Nate Protocol** ($NATE) is the world's first **Living Stablecoin**. Unlike traditional currencies backed by debt or fiat, $NATE is backed by **Human Capital**—the proven, verifiable productive capacity of a real person.

It introduces **Human Quantitative Easing**: As Nate's value (skills, time, network, earnings) grows, the protocol mints new currency, creating a perpetually expanding economy that rewards its participants.

---

## 🎪 The Reality Show Strategy
We are documenting the entire journey from concept to mainnet launch. This is an open experiment in **human tokenization**.
- **Follow the Build**: Watch the "Living Stablecoin" series.
- **Participate**: Holders don't just speculate; they govern, claim opportunities, and work directly with the issuer.

---

## 🏛️ Architecture

The system consists of three core components working in harmony:

### 1. LifeOracle (The Data Source)
Tracks the real-world metrics that back the currency via **Chainlink Functions**.
- **Bio-Data**: Sleep Score (0-100) & Resting Heart Rate (Health = Wealth).
- **Productivity**: Deep Work Hours & GitHub Commit Streaks (Consistency Multipliers).
- **Virality**: Social Impact Score (Viral reach directly verified via API).
- **Future Earnings**: Projected contracts and revenue.

### 2. Stability Engine (The Central Bank)
Manages the peg and minting logic.
- **Human QE**: When Life Value > Supply * 150%, the engine mints new $NATE.
- **Asset Backing**: Maintains a hybrid reserve of **Liquid Assets (ETH)** and **Human Assets**.
- **Redemption**: Users can always burn $NATE for $1.00 worth of ETH (if liquid reserves permit), enforcing a hard value floor.

### 3. $NATE Token (The Currency)
- **Governance**: Stake to vote on opportunities and protocol parameters.
- **Access**: Use $NATE to claim "Opportunities" (gigs/bounties posted by Nate).
- **Payment**: The preferred medium of exchange for Nate's services.

### 4. ZkLifeOracle (Phase 3: Privacy)
- **Zero-Knowledge Proofs**: Nate can prove productivity (e.g., "I worked 6 hours") without revealing client names or project details.
- **Replay Protection**: Each proof can only be used once via nullifier tracking.

### 5. GovernanceBoard (Phase 6: PID Control Theory)
- **PID Controller**: Uses **Proportional-Integral-Derivative** logic to stabilize trust.
- **Market Signals**: Reads confidence from `TaskMarket` and continuously adjusts minting capacity.
    - *Proportional*: "Market hates this -> Cut Salary."
    - *Integral*: "Consistency over time -> Salary Bonus."
    - *Derivative*: "Crash Detection -> Emergency Stop."

### 6. TaskMarket (Phase 5: Prediction)
- **Polymarket for Decisions**: Holders bet on Nate's daily output.
- **Truth Machine**: Investors predict "Will Nate check in code today?" and winners take the pool.

---

## 🚀 Quick Start (Local Demo)

Want to see the economy in action? Run the full simulation on your machine.

### Prerequisites
- Node.js 18+

### Run the Demo
```bash
# 1. Install dependencies
npm install

# 2. Run the Localhost Simulation
npx hardhat run scripts/demo_local.js
```

**What happens in the demo?**
1.  **Deployment**: Contracts are deployed to a local blockchain.
2.  **Human QE**: Nate updates his stats -> System mints 1,000 $NATE.
3.  **Economy**: Tokens are distributed and staked.
4.  **Work**: A community member claims a job ("Build Frontend").
5.  **Bank Run**: A user redeems $NATE for ETH, proving the peg works.

---

## 🌅 Morning Dashboard

Nate runs this every morning to see his value and tasks:

```bash
npm run morning
```

**Output includes:**
- 📊 Current $NATE price and market cap
- 🧬 Quantified Self metrics (Sleep, Deep Work, GitHub Streak, Social Impact)
- ✅ Today's tasks ranked by value impact
- 💸 Mint eligibility (how much $NATE can be minted)
- 📈 End-of-day projection

---

## 🗺️ Roadmap

### Phase 1: Foundation (Current)
- [x] deployed `LifeOracle` (Trusted Reporter)
- [x] deployed `StabilityEngine` (Human QE Logic)
- [x] Localhost Proof-of-Concept

### Phase 2: Decentralization
- [x] **Chainlink Functions**: `LifeOracleV2.sol` fetches Bio-Data via decentralized oracle.
- [~] **Sepolia Testnet**: Awaiting funds for deployment.

### Phase 3: The Autonomous Self (Current)
- [x] **ZK-Privacy**: `ZkLifeOracle.sol` verifies Groth16 proofs for secret work.
- [x] **AI Governance**: `GovernanceBoard.sol` controls minting with AI oversight.
- [x] **Morning Dashboard**: `npm run morning` for daily briefing.
- [~] **Demo Script**: `demo_autonomous.js` (partial integration).

### Phase 4: Mainnet & The Show
- [x] **Live Overlay**: `overlay/` for streaming bio-metrics.
- [x] **Launch Strategy**: Deployment & Liquidity plan ready.

### Phase 5: The Market-Driven Human
- [x] **Task Market**: `TaskMarket.sol` for investor voting.
- [ ] **Frontend**: `nate-market-ui` (Beta).

### Phase 6: Stability (2026 Vision)
- [x] **PID Governance**: Differential equations control supply expansion.

---

## 📜 License
MIT
