import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import TaskMarketABI from './abi/TaskMarket.json'
import NateProtocolABI from './abi/NateProtocol.json'
import StabilityEngineABI from './abi/StabilityEngine.json'

// Components
import TaskCard from './components/TaskCard'
import BetModal from './components/BetModal'
import CreateTaskModal from './components/CreateTaskModal'
import StabilityPanel from './components/StabilityPanel'
import ActivityFeed from './components/ActivityFeed'
import VitalSigns from './components/VitalSigns'
import LandingPage from './components/LandingPage'
import BuyModal from './components/BuyModal'
import UnifiedDashboard from './components/UnifiedDashboard'
import MintBurnInterface from './components/MintBurnInterface'

// Configuration (Replace with actual addresses)
const CONTRACTS = {
  taskMarket: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  nateToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  stabilityEngine: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
}

function App() {
  const [account, setAccount] = useState(null)
  const [balance, setBalance] = useState("0")
  const [tasks, setTasks] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)

  // Web3 State
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [marketContract, setMarketContract] = useState(null)
  const [tokenContract, setTokenContract] = useState(null)
  const [engineContract, setEngineContract] = useState(null)

  // View State
  const [view, setView] = useState('landing') // 'landing', 'market', 'dashboard', or 'stability'

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false)
  const [betModal, setBetModal] = useState({ isOpen: false, task: null, betYes: true })

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setLoading(true)
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        setAccount(accounts[0])

        const _provider = new ethers.BrowserProvider(window.ethereum)
        const _signer = await _provider.getSigner()

        setProvider(_provider)
        setSigner(_signer)

        const _market = new ethers.Contract(CONTRACTS.taskMarket, TaskMarketABI.abi, _signer)
        const _token = new ethers.Contract(CONTRACTS.nateToken, NateProtocolABI.abi, _signer)
        const _engine = new ethers.Contract(CONTRACTS.stabilityEngine, StabilityEngineABI.abi, _signer)

        setMarketContract(_market)
        setTokenContract(_token)
        setEngineContract(_engine)

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
          status: Number(task.status),
          odds: Number(yesPercent)
        })
      }
      setTasks(loadedTasks)
    } catch (err) {
      console.error("Failed to load tasks", err)
      if (tasks.length === 0) setMockData()
    }
  }

  const setMockData = () => {
    setTasks([
      { id: 1, desc: "Ship Phase 4 Mainnet", horizon: "2 HOURS", yesPool: "500", noPool: "300", odds: 62.5, status: 0 },
      { id: 2, desc: "Deep Work > 6 Hours", horizon: "DAILY", yesPool: "1200", noPool: "400", odds: 75.0, status: 0 },
      { id: 3, desc: "Deploy ZK-Email Verifier", horizon: "DAILY", yesPool: "450", noPool: "250", odds: 64.3, status: 0 },
      { id: 4, desc: "Community Call #1", horizon: "DAILY", yesPool: "100", noPool: "50", odds: 66.7, status: 2, odds: 100 }
    ])

    setEvents([
      { text: "Account 0x...F0512 minted 1,000 $NATE", time: "2m ago", type: "mint", tag: "STABILITY" },
      { text: "New bet placed on 'Deep Work': 500 NATE (YES)", time: "5m ago", type: "bet", tag: "BET" },
      { text: "Market 'Community Call #1' resolved as YES", time: "15m ago", type: "system", tag: "MARKET" },
      { text: "Account 0x...A1B2C redeemed 200 $NATE for ETH", time: "45m ago", type: "redeem", tag: "STABILITY" },
      { text: "Nate Protocol v4.1 initialized", time: "1h ago", type: "system", tag: "SYSTEM" }
    ])
  }

  // --- Handlers ---

  const openBetModal = (task, betYes) => {
    setBetModal({ isOpen: true, task, betYes })
  }

  const handleCreateTask = async (desc, horizon, duration) => {
    if (!marketContract) return
    try {
      setLoading(true)
      const tx = await marketContract.createTask(desc, horizon, duration)
      await tx.wait()
      alert("Market Created Successfully!")
      setIsCreateModalOpen(false)
      loadTasks(marketContract)
    } catch (err) {
      console.error(err)
      alert("Creation Failed: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePlaceBet = async (amountStr) => {
    if (!marketContract || !tokenContract) return
    try {
      setLoading(true)
      const amount = ethers.parseEther(amountStr)
      const { task, betYes } = betModal

      // 1. Approve
      console.log("Approving...")
      const txApprove = await tokenContract.approve(CONTRACTS.taskMarket, amount)
      await txApprove.wait()

      // 2. Bet
      console.log("Betting...")
      const txBet = await marketContract.bet(task.id, betYes, amount)
      await txBet.wait()

      alert("Bet Placed Successfully!")
      setBetModal({ isOpen: false, task: null, betYes: true })
      loadTasks(marketContract)
    } catch (err) {
      console.error(err)
      alert("Bet Failed: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBuyNate = async (ethAmount) => {
    if (!engineContract) {
      await connectWallet();
    }

    // Once connected, attempt the purchase
    try {
      setLoading(true)
      // Note: purchase() function will be added to the contract in the next step.
      // For now, we simulate the call if it fails (using existing mint as fallback for demo)
      if (engineContract.purchase) {
        const tx = await engineContract.purchase({ value: ethers.parseEther(ethAmount) });
        await tx.wait();
      } else {
        // Fallback for demo before contract update
        const tx = await engineContract.mint(ethers.parseEther((Number(ethAmount) * 2500).toString()));
        await tx.wait();
      }
      alert("Purchase Successful!");
      setIsBuyModalOpen(false);
    } catch (err) {
      console.error(err)
      alert("Purchase Failed: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (view === 'landing') {
    return (
      <LandingPage
        onEnterMarket={() => setView('market')}
        onEnterDashboard={() => setView('dashboard')}
        onBuyNate={() => {
          setIsBuyModalOpen(true);
        }}
      />
    )
  }

  if (view === 'dashboard') {
    return (
      <UnifiedDashboard
        onBack={() => setView('market')}
        onViewChange={(v) => setView(v)}
      />
    )
  }

  if (view === 'stability') {
    return (
      <div className="min-h-screen bg-slate-950 pt-20">
        <MintBurnInterface
          walletAddress={account}
          isConnected={!!account}
          onBack={() => setView('market')}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-nate-dark text-white font-sans selection:bg-nate-blue selection:text-black">
      <div className="max-w-7xl mx-auto px-4 py-12 md:px-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-12 border-b border-nate-blue/30 pb-4">
          <div>
            <h1
              onClick={() => setView('landing')}
              className="text-4xl font-display font-bold bg-gradient-to-r from-nate-green to-nate-blue bg-clip-text text-transparent cursor-pointer"
            >
              NATE MARKET
            </h1>
            <p className="text-gray-400 font-body tracking-wider text-sm mt-1">
              PREDICT. VOTE. EARN.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setView('market')}
              className={`text-sm font-display font-bold px-4 py-2 rounded transition-all ${view === 'market' ? 'bg-nate-blue text-black' : 'text-gray-400 hover:text-white'}`}
            >
              MARKET
            </button>
            <button
              onClick={() => setView('dashboard')}
              className={`text-sm font-display font-bold px-4 py-2 rounded transition-all ${view === 'dashboard' ? 'bg-nate-blue text-black' : 'text-gray-400 hover:text-white'}`}
            >
              DASHBOARD
            </button>
            <button
              onClick={() => setView('stability')}
              className={`text-sm font-display font-bold px-4 py-2 rounded transition-all ${view === 'stability' ? 'bg-nate-blue text-black' : 'text-gray-400 hover:text-white'}`}
            >
              STABILITY
            </button>
          </div>

          <div className="flex gap-4 items-center">
            {account && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-nate-blue/10 border border-nate-blue text-nate-blue px-4 py-2 rounded hover:bg-nate-blue hover:text-black transition-all font-display font-bold text-sm"
              >
                + CREATE MARKET
              </button>
            )}

            {account ? (
              <div className="text-right border-l border-gray-700 pl-4">
                <p className="text-xs text-gray-500">YOUR BALANCE</p>
                <p className="text-xl font-display text-nate-green">{Number(balance).toFixed(2)} $NATE</p>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={loading}
                className="bg-nate-blue/10 text-nate-blue px-6 py-2 rounded hover:bg-nate-blue hover:text-black transition-all font-display font-bold border border-nate-blue"
              >
                {loading ? "CONNECTING..." : "CONNECT WALLET"}
              </button>
            )}
          </div>
        </header>

        {/* Vital Signs / Metrics Section */}
        {account && (
          <div className="mb-12">
            <VitalSigns />
          </div>
        )}

        {/* Stability Section */}
        {account && (
          <StabilityPanel
            engineContract={engineContract}
            account={account}
            balance={balance}
            onUpdate={() => {
              const _token = new ethers.Contract(CONTRACTS.nateToken, NateProtocolABI.abi, signer)
              _token.balanceOf(account).then(bal => setBalance(ethers.formatEther(bal)))
            }}
          />
        )}

        {/* Main Content Area */}
        <div className="flex flex-col xl:flex-row gap-8">
          {/* Market Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onBet={openBetModal}
                  connected={!!account}
                />
              ))}

              {tasks.length === 0 && !loading && (
                <div className="col-span-2 text-center text-gray-500 py-12">
                  No active markets. Create one!
                </div>
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="xl:w-80">
            <ActivityFeed events={events} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-600 text-xs text-mono">
          <p>⚠️ CONNECTS TO SEPOLIA TESTNET. DO NOT USE REAL FUNDS.</p>
        </div>

        {/* Modals */}
        <BetModal
          isOpen={betModal.isOpen}
          onClose={() => setBetModal({ ...betModal, isOpen: false })}
          task={betModal.task}
          betYes={betModal.betYes}
          onConfirm={handlePlaceBet}
          loading={loading}
        />

        <CreateTaskModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onConfirm={handleCreateTask}
          loading={loading}
        />

        <BuyModal
          isOpen={isBuyModalOpen}
          onClose={() => setIsBuyModalOpen(false)}
          onConfirm={handleBuyNate}
          loading={loading}
        />
      </div>
    </div>
  )
}

export default App
