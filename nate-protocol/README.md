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

## 🗺️ Roadmap

### Phase 1: Foundation (Current)
- [x] deployed `LifeOracle` (Trusted Reporter)
- [x] deployed `StabilityEngine` (Human QE Logic)
- [x] Localhost Proof-of-Concept

### Phase 2: Decentralization (Next)
- [ ] **Chainlink Functions**: Upgrade Oracle to fetch data directly from API APIs (Decentralized Verification).
- [ ] **Sepolia Testnet**: Public beta testing.

### Phase 3: Mainnet & The Show
- [ ] Security Audit.
- [ ] "Reality Show" Launch Strategy.
- [ ] Genesis Mint.

---

## 📜 License
MIT
