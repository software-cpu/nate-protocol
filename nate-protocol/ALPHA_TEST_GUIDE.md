# 🧪 Nate Protocol Alpha Test Guide

Alpha testing is about breaking the system in a controlled environment before real users touch it. Follow these phases to verify the end-to-end flow.

## Phase 1: Local Sandbox Testing
Run the system on a local Hardhat node to verify logic without spending real ETH or waiting for block times.

### 1. Start a Local Node
Open a terminal in the root directory:
```bash
npx hardhat node
```

### 2. Deploy & Simulate
In a second terminal, run the full system simulation:
```bash
npx hardhat run scripts/demo_local.js --network localhost
```
**What to look for:**
- Does the `StabilityEngine` correctly calculate the Collateral Ratio?
- Does the `TaskMarket` create a task and accept bets?
- **Fee Check**: After resolution, do the winners receive slightly less than the total pool (due to the 2% rake)?

---

## Phase 2: Frontend & UX Testing
Verify that the UI talks to the contracts correctly.

### 1. Launch the UI
```bash
cd nate-market-ui
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

### 2. The "Multi-Account" Test
To test the prediction market properly, you need at least two participants.
1. **Account A (Owner)**: Create a task "Alpha Test Task".
2. **Account B (User)**: Connect to the UI and bet 100 NATE on **YES**.
3. **Account C (User)**: Connect and bet 100 NATE on **NO**.
4. **Account A (Owner)**: Resolve the task as **YES**.
5. **Account B (User)**: Check the card. Does it say RESOLVED? Can you claim your Reward?

**Expected Result**: Account B should receive ~196 NATE (their 100 + Account C's 100 - 2% fee).

---

## Phase 3: Monetization Stress Test
Verify you can actually "make money."

1. **Check Contract Fees**:
   - Use `npx hardhat console --network localhost`
   - Attach to the TaskMarket contract.
   - Run: `await market.accumulatedFees()`
   - Is it non-zero?

2. **Withdrawal Flow**:
   - Call `withdrawFees(your_address)` from the owner account.
   - Verify your NATE balance actually increases.

---

## Phase 4: Edge Case Verification (The "Destruction" Phase)
Try to perform actions that should fail:
- [ ] Try to bet on a resolved task. (Should revert)
- [ ] Try to claim a reward you didn't win. (Should revert)
- [ ] Try to mint NATE when the oracle value is $0. (Should revert)
- [ ] Try to withdraw fees using a non-owner account. (Should revert)

## Alpha Test Checklist
- [ ] Contracts deploy without errors.
- [ ] UI displays correct odds during betting.
- [ ] 2% Rake is correctly deducted from winnings.
- [ ] 0.5% Mint/Redeem fees are captured in StabilityEngine.
- [ ] Owner can successfully withdraw all 3 types of revenue (Betting NATE, Mint NATE, Redeem ETH).
