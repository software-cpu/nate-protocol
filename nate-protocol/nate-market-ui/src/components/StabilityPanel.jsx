import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const StabilityPanel = ({ engineContract, account, balance, onUpdate }) => {
    const [stats, setStats] = useState({
        totalSupply: "0",
        totalValueUSD: "0",
        collateralRatio: "0",
        liquidEth: "0"
    });
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (engineContract) {
            loadStats();
            const interval = setInterval(loadStats, 10000);
            return () => clearInterval(interval);
        }
    }, [engineContract]);

    const loadStats = async () => {
        try {
            const data = await engineContract.getSystemStatus();
            setStats({
                totalSupply: ethers.formatEther(data.totalSupply),
                totalValueUSD: (Number(data.totalValueUSD) / 1e8).toFixed(2),
                collateralRatio: data.collateralRatio.toString(),
                liquidEth: ethers.formatEther(data.liquidEth)
            });
        } catch (err) {
            console.error("Failed to load engine stats", err);
        }
    };

    const handleMint = async () => {
        if (!engineContract || !amount) return;
        try {
            setLoading(true);
            const tx = await engineContract.mint(ethers.parseEther(amount));
            await tx.wait();
            setAmount('');
            onUpdate();
            loadStats();
        } catch (err) {
            console.error(err);
            alert("Minting failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeem = async () => {
        if (!engineContract || !amount) return;
        try {
            setLoading(true);
            const tx = await engineContract.redeem(ethers.parseEther(amount));
            await tx.wait();
            setAmount('');
            onUpdate();
            loadStats();
        } catch (err) {
            console.error(err);
            alert("Redemption failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* System Metrics */}
            <div className="lg:col-span-2 bg-nate-card/40 border border-nate-blue/20 rounded-xl p-8 backdrop-blur-md">
                <h3 className="text-xl font-display font-bold mb-6 text-nate-blue flex items-center gap-2">
                    <span className="w-2 h-2 bg-nate-blue rounded-full animate-pulse"></span>
                    SYSTEM STABILITY
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-xs text-gray-500 font-mono mb-1">COLLATERAL RATIO</p>
                        <p className={`text-2xl font-display font-bold ${Number(stats.collateralRatio) > 150 ? 'text-nate-green' : 'text-nate-red'}`}>
                            {stats.collateralRatio}%
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-mono mb-1">TOTAL BACKING</p>
                        <p className="text-2xl font-display font-bold text-white">${Number(stats.totalValueUSD).toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-mono mb-1">CIRCULATING</p>
                        <p className="text-2xl font-display font-bold text-white">{Number(stats.totalSupply).toLocaleString()} NATE</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-mono mb-1">RESERVE (ETH)</p>
                        <p className="text-2xl font-display font-bold text-white">{Number(stats.liquidEth).toFixed(2)} Ξ</p>
                    </div>
                </div>

                <div className="mt-8 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-nate-blue transition-all duration-1000"
                        style={{ width: `${Math.min(Number(stats.collateralRatio) / 3, 100)}%` }}
                    ></div>
                </div>
            </div>

            {/* Mint/Redeem Actions */}
            <div className="bg-nate-card/40 border border-nate-blue/20 rounded-xl p-8 backdrop-blur-md">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-display font-bold text-white">TREASURY</h3>
                    <span className="text-[10px] font-mono text-gray-500">0.5% FEE</span>
                </div>

                <div className="mb-6">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-black/40 border border-gray-800 rounded p-3 text-lg font-mono focus:border-nate-blue focus:outline-none text-white transition-all"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={handleMint}
                        disabled={loading || !amount}
                        className="bg-nate-blue/10 border border-nate-blue text-nate-blue py-3 rounded font-display font-bold hover:bg-nate-blue hover:text-black transition-all disabled:opacity-50"
                    >
                        {loading ? "..." : "MINT"}
                    </button>
                    <button
                        onClick={handleRedeem}
                        disabled={loading || !amount || Number(balance) < Number(amount)}
                        className="bg-white/5 border border-white/20 text-white py-3 rounded font-display font-bold hover:bg-white hover:text-black transition-all disabled:opacity-50"
                    >
                        {loading ? "..." : "REDEEM"}
                    </button>
                </div>

                <p className="text-[10px] text-gray-500 mt-4 text-center font-mono italic">
                    Minting requires Owner role. Redemption is open to all.
                </p>
            </div>
        </div>
    );
};

export default StabilityPanel;
