import { useState, useEffect } from 'react'

function App() {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      desc: "Ship Phase 4 Mainnet",
      horizon: "2 HOURS",
      yesPool: 500,
      noPool: 300,
      odds: 62.5
    },
    {
      id: 2,
      desc: "Deep Work > 6 Hours Today",
      horizon: "DAILY",
      yesPool: 1200,
      noPool: 400,
      odds: 75.0
    },
    {
      id: 3,
      desc: "Hit 100k Market Cap by Q1",
      horizon: "SEASONAL",
      yesPool: 5000,
      noPool: 4500,
      odds: 52.6
    }
  ])

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
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-500">YOUR BALANCE</p>
            <p className="text-xl font-display text-nate-green">1,000 $NATE</p>
          </div>
          <button className="bg-nate-blue/10 border border-nate-blue text-nate-blue px-6 py-2 rounded-sm hover:bg-nate-blue hover:text-black transition-all">
            CONNECT WALLET
          </button>
        </div>
      </header>

      {/* Market Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tasks.map((task) => (
          <div key={task.id} className="bg-nate-card border border-gray-800 rounded-lg p-6 relative overflow-hidden group hover:border-nate-blue/50 transition-all">
            {/* Horizon Badge */}
            <div className="absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded bg-gray-800 text-gray-400">
              {task.horizon}
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
                <div
                  className="h-full bg-nate-red"
                  style={{ width: `${100 - task.odds}%` }}
                ></div>
              </div>
            </div>

            {/* Pools */}
            <div className="flex justify-between text-xs text-gray-500 mb-6 font-mono">
              <span>POOL: {task.yesPool.toLocaleString()} NATE</span>
              <span>POOL: {task.noPool.toLocaleString()} NATE</span>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button className="bg-nate-green/10 border border-nate-green text-nate-green py-3 rounded hover:bg-nate-green hover:text-black font-display font-bold transition-all">
                BET YES
              </button>
              <button className="bg-nate-red/10 border border-nate-red text-nate-red py-3 rounded hover:bg-nate-red hover:text-black font-display font-bold transition-all">
                BET NO
              </button>
            </div>
          </div>
        ))}

        {/* Create New Card */}
        <div className="border border-dashed border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center text-gray-500 hover:border-gray-600 hover:text-gray-300 cursor-pointer transition-all min-h-[300px]">
          <span className="text-4xl mb-2">+</span>
          <span className="font-display tracking-widest">PROPOSE TASK</span>
        </div>
      </div>
    </div>
  )
}

export default App
