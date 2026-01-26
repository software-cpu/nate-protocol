import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import TaskMarketABI from './abi/TaskMarket.json'
import NateProtocolABI from './abi/NateProtocol.json'

// Configuration (Replace with actual deployed addresses from deployment-sepolia.json)
const CONTRACTS = {
  taskMarket: "0x0000000000000000000000000000000000000000", // Update after deployment
  nateToken: "0x0000000000000000000000000000000000000000"  // Update after deployment
}

function App() {
  const [account, setAccount] = useState(null)
  const [balance, setBalance] = useState("0")
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)

  // Web3 State
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [marketContract, setMarketContract] = useState(null)
  const [tokenContract, setTokenContract] = useState(null)

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setLoading(true)
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        setAccount(accounts[0]) // User address (check if Deployer)

        const _provider = new ethers.BrowserProvider(window.ethereum)
        const _signer = await _provider.getSigner()

        setProvider(_provider)
        setSigner(_signer)

        // Init Contracts
        const _market = new ethers.Contract(CONTRACTS.taskMarket, TaskMarketABI.abi, _signer)
        const _token = new ethers.Contract(CONTRACTS.nateToken, NateProtocolABI.abi, _signer)

        setMarketContract(_market)
        setTokenContract(_token)

        // Load Data
        const bal = await _token.balanceOf(accounts[0])
        setBalance(ethers.formatEther(bal))

        await loadTasks(_market)
      } catch (err) {
        console.error("Connection failed", err)
        alert("Connection failed: " + err.message)
      } finally {
        setLoading(false)
      }
    } else {
      alert("Please install Metamask!")
    }
  }

  const loadTasks = async (market) => {
    try {
      const count = await market.taskCount()
      const loadedTasks = []

      for (let i = 1; i <= count; i++) {
        const task = await market.tasks(i)
        const [yesPercent, noPercent] = await market.getOdds(i)

        loadedTasks.push({
          id: Number(task.id),
          desc: task.description,
          horizon: ["2 HOURS", "DAILY", "SEASONAL"][Number(task.horizon)],
          yesPool: ethers.formatEther(task.yesPool),
          noPool: ethers.formatEther(task.noPool),
          status: Number(task.status), // 0=OPEN
          odds: Number(yesPercent)
        })
      }
      setTasks(loadedTasks)
    } catch (err) {
      console.error("Failed to load tasks", err)
      // Fallback for demo if contract is empty/wrong address
      if (tasks.length === 0) setMockData()
    }
  }

  const setMockData = () => {
    setTasks([
      { id: 1, desc: "Ship Phase 4 Mainnet", horizon: "2 HOURS", yesPool: "500", noPool: "300", odds: 62.5, status: 0 },
      { id: 2, desc: "Deep Work > 6 Hours", horizon: "DAILY", yesPool: "1200", noPool: "400", odds: 75.0, status: 0 }
    ])
  }

  const handleBet = async (taskId, supportYes) => {
    if (!marketContract || !tokenContract) return

    const amountStr = prompt("Enter bet amount (NATE):", "10")
    if (!amountStr) return

    try {
      setLoading(true)
      const amount = ethers.parseEther(amountStr)

      // 1. Approve
      console.log("Approving...")
      const txApprove = await tokenContract.approve(CONTRACTS.taskMarket, amount)
      await txApprove.wait()

      // 2. Bet
      console.log("Betting...")
      const txBet = await marketContract.bet(taskId, supportYes, amount)
      await txBet.wait()

      alert("Bet Placed Successfully! 🚀")
      window.location.reload()
    } catch (err) {
      console.error(err)
      alert("Bet Failed: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-nate-dark text-white p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-12 border-b border-nate-blue/30 pb-4">
        <div>
          <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-nate-green to-nate-blue bg-clip-text text-transparent">
            NATE MARKET
          </h1>
          <p className="text-gray-400 font-body tracking-wider text-sm mt-1">
            PREDICT. VOTE. EARN.
          </p>
        </div>
        <div className="flex gap-4 items-center">
          {account ? (
            <div className="text-right">
              <p className="text-xs text-gray-500">YOUR BALANCE</p>
              <p className="text-xl font-display text-nate-green">{Number(balance).toFixed(2)} $NATE</p>
              <p className="text-xs text-gray-600 font-mono">{account.slice(0, 6)}...{account.slice(-4)}</p>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={loading}
              className="bg-nate-blue/10 border border-nate-blue text-nate-blue px-6 py-2 rounded-sm hover:bg-nate-blue hover:text-black transition-all font-display font-bold"
            >
              {loading ? "CONNECTING..." : "CONNECT WALLET"}
            </button>
          )}
        </div>
      </header>

      {/* Market Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tasks.map((task) => (
          <div key={task.id} className="bg-nate-card border border-gray-800 rounded-lg p-6 relative overflow-hidden group hover:border-nate-blue/50 transition-all">
            {/* Horizon Badge */}
            <div className={`absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded ${task.status === 0 ? 'bg-gray-800 text-gray-400' : 'bg-nate-green text-black'
              }`}>
              {task.status === 0 ? task.horizon : 'RESOLVED'}
            </div>

            <h3 className="text-xl font-display font-bold mb-6 pr-12 min-h-[60px]">
              {task.desc}
            </h3>

            {/* Odds Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-nate-green font-bold">YES {task.odds}%</span>
                <span className="text-nate-red font-bold">NO {100 - task.odds}%</span>
              </div>
              <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-nate-green shadow-[0_0_10px_#00ff41]"
                  style={{ width: `${task.odds}%` }}
                ></div>
              </div>
            </div>

            {/* Pools */}
            <div className="flex justify-between text-xs text-gray-500 mb-6 font-mono">
              <span>YES: {Number(task.yesPool).toLocaleString()}</span>
              <span>NO: {Number(task.noPool).toLocaleString()}</span>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleBet(task.id, true)}
                disabled={task.status !== 0 || !account}
                className="bg-nate-green/10 border border-nate-green text-nate-green py-3 rounded hover:bg-nate-green hover:text-black font-display font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                BET YES
              </button>
              <button
                onClick={() => handleBet(task.id, false)}
                disabled={task.status !== 0 || !account}
                className="bg-nate-red/10 border border-nate-red text-nate-red py-3 rounded hover:bg-nate-red hover:text-black font-display font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                BET NO
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer warning */}
      <div className="mt-12 text-center text-gray-600 text-xs text-mono">
        <p>⚠️ CONNECTS TO SEPOLIA TESTNET. DO NOT USE REAL FUNDS.</p>
        <p>CONTRACT: {CONTRACTS.taskMarket}</p>
      </div>
    </div>
  )
}

export default App
