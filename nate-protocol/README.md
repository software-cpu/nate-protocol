# $NATE Protocol

**Decentralized Human Execution Protocol - A Growth Token with a Hard Value Floor**

## Quick Start (Today!)

### Prerequisites
- Node.js 18+ 
- MetaMask wallet with Sepolia ETH (get free from [faucet](https://sepoliafaucet.com))

### Step 1: Install Dependencies
```bash
cd nate-protocol
npm install
```

### Step 2: Compile Contract
```bash
npm run compile
```

### Step 3: Run Tests
```bash
npm test
```
You should see all 20+ tests pass ✅

### Step 4: Deploy Locally (Test Environment)
```bash
# Terminal 1: Start local blockchain
npm run node

# Terminal 2: Deploy
npm run deploy:local
```

### Step 5: Deploy to Sepolia Testnet
```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env with your values:
#    - SEPOLIA_RPC_URL (get from Alchemy)
#    - PRIVATE_KEY (from MetaMask)
#    - ETHERSCAN_API_KEY (optional, for verification)

# 3. Deploy
npm run deploy:sepolia
```

---

## Architecture

### Token Economics
- **Fixed Supply**: 10,000,000 NATE (deflationary via buybacks)
- **Distribution**: 50% Community / 30% Nate / 20% Reserve
- **No Inflation**: Cannot mint after deployment

### Revenue Flow
```
Revenue In → 20% Buyback & Burn
           → 30% Treasury (backing)
           → 50% Operator (income)
```

### Core Features

| Feature | Description |
|---------|-------------|
| **Opportunity Registry** | Log opportunities you won't take → Holders claim them |
| **Revenue Router** | Automatic splits: buyback/treasury/operator |
| **NAV Floor** | Human capital metrics establish minimum value |
| **Staking** | Lock tokens for governance weight (up to 2x multiplier) |
| **Dead Man's Switch** | If inactive 30 days → Council takes over |

---

## Contract Functions

### For Nate (Owner)
```solidity
logOpportunity(category, description, value)  // Share opportunities
updateLifeMetrics(time, skill, network, earnings)  // Update backing
executeBuyback(amount)  // Burn tokens from treasury
withdrawTreasury(to, amount, reason)  // Access treasury
releaseCommunityTokens(to, amount)  // Distribute community pool
```

### For Token Holders
```solidity
claimOpportunity(id)  // Claim an available opportunity
stake(amount)  // Lock tokens for voting power
unstake(amount)  // Withdraw staked tokens
```

### View Functions
```solidity
calculateNAV()  // Current net asset value per token
getTotalBacking()  // Treasury + Human Capital
getSystemStats()  // All stats in one call
getActiveOpportunities()  // List claimable opportunities
getVotingPower(user)  // User's governance weight
timeToCrisis()  // Seconds until Dead Man's Switch activates
```

---

## File Structure
```
nate-protocol/
├── contracts/
│   └── NateProtocol.sol      # Main contract
├── scripts/
│   ├── deploy.js             # Deployment script
│   └── interact.js           # Test interactions
├── test/
│   └── NateProtocol.test.js  # Full test suite
├── hardhat.config.js
├── package.json
└── .env.example
```

---

## Next Steps After Deployment

1. **Test Locally** → Run full test suite
2. **Deploy Sepolia** → Real testnet with fake ETH
3. **Update Frontend** → Swap contract address/ABI
4. **Community Beta** → Small group test
5. **Security Audit** → Before any real money
6. **Mainnet** → Only after audit

---

## Security Notes

⚠️ **Before Mainnet:**
- Get 2-3 professional audits
- Run Slither/Mythril analysis
- Bug bounty program
- Legal review for securities compliance

---

## License
MIT
