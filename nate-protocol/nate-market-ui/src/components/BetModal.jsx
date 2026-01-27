import React, { useState, useEffect } from 'react';

const BetModal = ({ isOpen, onClose, task, betYes, onConfirm, loading }) => {
  const [amount, setAmount] = useState('');
  const [returnEstimate, setReturnEstimate] = useState(0);

  useEffect(() => {
    if (!task || !amount) {
      setReturnEstimate(0);
      return;
    }

    // Simple naive estimate: (MyBet / PoolForSide) * TotalPool
    // Note: This is an approximation. Real AMM logic is complex.
    // For Parimutuel: NewShare = Amount / (CurrentPool + Amount) * (TotalPool + Amount)
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    const currentSidePool = betYes ? parseFloat(task.yesPool) : parseFloat(task.noPool);
    const otherSidePool = betYes ? parseFloat(task.noPool) : parseFloat(task.yesPool);

    // Total Pool after my bet
    const totalPool = currentSidePool + otherSidePool + val;

    // My Share of the winning side
    const myShare = val / (currentSidePool + val);

    // Estimated Payout (before fees)
    const rawPayout = myShare * totalPool;

    // Apply 2% Protocol Rake
    const feeRate = 0.02;
    const finalPayout = rawPayout * (1 - feeRate);

    setReturnEstimate(finalPayout.toFixed(2));

  }, [amount, task, betYes]);

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-nate-dark/40 backdrop-blur-md flex items-center justify-center z-50 transition-all duration-300">
      <div className="bg-nate-card/90 border border-nate-blue/40 rounded-xl p-8 w-full max-w-md shadow-[0_0_80px_rgba(0,243,255,0.15)] relative backdrop-blur-xl scale-in-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-2xl font-display font-bold mb-2">
          Betting <span className={betYes ? "text-nate-green" : "text-nate-red"}>{betYes ? "YES" : "NO"}</span>
        </h2>
        <p className="text-gray-400 text-sm mb-6">{task.desc}</p>

        <div className="mb-6">
          <label className="block text-xs font-mono text-gray-500 mb-2">AMOUNT ($NATE)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-black/50 border border-gray-700 rounded p-3 text-xl font-mono focus:border-nate-blue focus:outline-none text-white"
            placeholder="0.00"
            autoFocus
          />
        </div>

        {amount && (
          <div className="bg-gray-800/50 rounded p-4 mb-6 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">Potential Payout:</span>
              <span className="font-bold text-white">{returnEstimate} $NATE</span>
            </div>
            <div className="flex justify-between mb-1 text-[10px] italic">
              <span className="text-gray-500">Includes 2% protocol fee rake</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">ROI:</span>
              <span className="font-bold text-nate-green">
                {amount > 0 ? (((returnEstimate - amount) / amount) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>
        )}

        <button
          onClick={() => onConfirm(amount)}
          disabled={loading || !amount || parseFloat(amount) <= 0}
          className={`w-full py-4 rounded font-display font-bold text-lg transition-all ${betYes
            ? 'bg-nate-green text-black hover:bg-white'
            : 'bg-nate-red text-black hover:bg-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? "PROCESSING..." : `CONFIRM BET ${betYes ? "YES" : "NO"}`}
        </button>
      </div>
    </div>
  );
};

export default BetModal;
