# Contributing into Nate Protocol

Thank you for your interest in contributing to the first human-backed asset protocol. We value technical excellence, clear communication, and professional conduct.

## Development Setup

### Prerequisites
- Node.js v18+
- Hardhat (`npm install --save-dev hardhat`)

### Initial Setup
```bash
git clone https://github.com/software-cpu/nate-protocol.git
cd nate-protocol/nate-protocol
npm install
```

### Running the Local Simulation
We have a robust simulation script that emulates the entire economy (Oracle -> Engine -> Governance).
```bash
npx hardhat run scripts/demo_local.js
```

### Running Tests
All PRs must pass the full test suite.
```bash
npx hardhat test
```

## Frontend Development
The frontend is located in `nate-market-ui/`.
```bash
cd nate-market-ui
npm install
npm run dev
```

## Code Standards
- **Solidity**: Follow standard Style Guide. Use NatSpec for all public functions.
- **JavaScript**: Use `ethers.js` v6. Async/await patterns preferred.
- **Professionalism**: Code comments should be technical and precise. Avoid humor, profanity, or filler text.

## Pull Request Process
1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.

## Architecture
Please read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system dynamics before contributing core logic changes.
