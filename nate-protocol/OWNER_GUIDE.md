# 👑 Protocol Owner's Guide (Nate's Manual)

As the owner of the Nate Protocol, you control the lifecycle of the markets and the collection of protocol revenue.

## 1. Creating Markets
You are the only one who can create new prediction markets (unless you delegate this via governance).
- **Use the UI**: Click **+ CREATE MARKET**.
- **Description**: Be specific (e.g., "Deploy v2 by Friday").
- **Horizon**: Choose from 2hr, Daily, or Seasonal.
- **Duration**: Setting the duration locks the betting window.

## 2. Resolving Markets
Once a task is complete, the Oracle (or you) must resolve the market.
- **True**: Nate achieved the goal. YES bettors win.
- **False**: Nate did not achieve the goal. NO bettors win.
- **Fee Collection**: Upon resolution, the 2% rake is automatically set aside.

## 3. Managing Fees
The protocol generates revenue in both $NATE and ETH.

### Withdrawing Rake (NATE)
Betting fees accumulate in the `TaskMarket` contract.
- Call `withdrawFees(address _to)` on the `TaskMarket` contract.
- This will transfer the accumulated NATE protocol fees to your wallet.

### Withdrawing Stability Fees (ETH & NATE)
Minting and Redemption fees accumulate in the `StabilityEngine`.
- **ETH Fees**: Call `withdrawEthFees(address _to)`. These come from redemptions.
- **NATE Fees**: Call `withdrawNateFees(address _to)`. These come from mints.

## 4. Adjusting Fee Rates
If you want to change the monetization strategy:
- **Betting Rake**: Call `setProtocolFee(uint256 _bps)` on `TaskMarket`. (200 = 2%).
- **Stability Fees**: Call `setFees(uint256 _mintFeeBps, uint256 _redeemFeeBps)` on `StabilityEngine`. (50 = 0.5%).

> [!IMPORTANT]
> Keep fee rates competitive. If fees are too high, users will move to other prediction markets or avoid minting.

## 5. Security & Maintenance
- Ensure your MultiSig (if deployed) is the owner of all contracts.
- Regularly monitor the Collateral Ratio via `getSystemStatus()` to ensure protocol stability.
