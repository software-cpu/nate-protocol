# 💰 Investor Information

## Quick Summary

**Nate Protocol** ($NATE) is the world's first **Human-Backed Stablecoin**. Instead of being backed by USD or crypto, $NATE is backed by verifiable human productivity.

---

## What Makes This Different

| Feature | Traditional Stablecoins | Nate Protocol |
|---------|------------------------|---------------|
| Backing | Fiat/Crypto | Human Capital |
| Supply Control | Central Authority | PID Controller (Math) |
| Governance | Token Voting | Prediction Markets |
| Transparency | Audits | Real-time Oracle |

---

## Technical Innovation

### 1. PID Controller Governance
We use **differential equations** (same math as SpaceX rockets) to control mint approval:
```
u(t) = Kp*error + Ki*∫error + Kd*d(error)/dt
```

### 2. Prediction Market Integration
Investors **vote with capital** on what the issuer (Nate) should do. Market confidence directly affects token supply.

### 3. Zero-Knowledge Privacy
Prove productivity without revealing client details. "I worked 6 hours" → verifiable, but *what* you worked on stays secret.

---

## Status

| Component | Status |
|-----------|--------|
| Smart Contracts (6) | ✅ Complete |
| Unit Tests (13) | ✅ Passing |
| Frontend (React) | ✅ Live |
| Oracle (Chainlink) | ✅ Integrated |
| Deployment Scripts | ✅ Ready |
| Documentation | ✅ Complete |

**Blocked On**: ~0.1 ETH for Sepolia testnet deployment

---

## The Ask

**Seeking**: 0.1 ETH (testnet gas)

**Use of Funds**:
- Sepolia deployment + testing
- Chainlink Functions subscription
- Initial liquidity seeding

**In Return**:
- Early access to prediction market
- Governance participation
- First-mover advantage

---

## Quick Start (See It Working)

```bash
# Clone
git clone https://github.com/software-cpu/nate-protocol.git
cd nate-protocol/nate-protocol

# Install
npm install

# Run Tests
npm test                                    # 13 passing

# Run Full Demo
npx hardhat run scripts/demo_local.js       # See economy in action

# Morning Dashboard
npm run morning                             # Daily briefing

# Frontend
cd nate-market-ui && npm install && npm run dev
# Open http://localhost:5173
```

---

## Key Files for Review

- [`contracts/GovernanceBoard.sol`](./nate-protocol/contracts/GovernanceBoard.sol) — PID Controller
- [`contracts/TaskMarket.sol`](./nate-protocol/contracts/TaskMarket.sol) — Prediction Market
- [`contracts/StabilityEngine.sol`](./nate-protocol/contracts/StabilityEngine.sol) — Central Bank
- [`scripts/deploy_system.js`](./nate-protocol/scripts/deploy_system.js) — Full Deployment

---

## Contact

Open an issue or reach out directly. This is **building in public**.

---

*"What if you could invest in a person instead of a company?"*
