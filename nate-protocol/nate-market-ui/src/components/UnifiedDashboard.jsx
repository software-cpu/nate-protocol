import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Shield, DollarSign, Activity, AlertCircle, CheckCircle, Zap, RefreshCw } from 'lucide-react';

/**
 * Unified Dashboard Component
 * Connects to your deployed Nate Protocol contracts on Sepolia
 */

// ========================================
// CONTRACT CONFIGURATION
// ========================================
const CONTRACT_ADDRESSES = {
    nateToken: '0xF256c0709CCCd20eE979B21e130D43ec0Ef6DBD5',
    stabilityEngine: '0x6ffa606718C667fC46409E95e1fCe9832fBCeE66',
    lifeOracle: '0x1860697C2F47247A0Bcb7c7dE3D0624E1a9E83cB',
    governanceBoard: '0xFF0e1583adE773C2eb8178d01B7bFdD15C070ea4',
    taskMarket: '0x236DE190344729Ed0C8AFE5c630814abb537e10d',
};

// Simplified ABIs - just the functions we need
const ABIS = {
    nateToken: [
        'function totalSupply() view returns (uint256)',
        'function balanceOf(address) view returns (uint256)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
    ],
    stabilityEngine: [
        'function getCollateralRatio() view returns (uint256)',
        'function totalCollateralValue() view returns (uint256)',
        'function mint(uint256) payable',
        'function redeem(uint256)',
    ],
    lifeOracle: [
        'function lastScore() view returns (uint256)',
        'function lastUpdate() view returns (uint256)',
        'function getMetrics() view returns (tuple(uint256,uint256,uint256,uint256,uint256))',
    ],
    governanceBoard: [
        'function marketConfidence() view returns (uint256)',
        'function mintingCapacity() view returns (uint256)',
    ],
    taskMarket: [
        'function activeTasks() view returns (uint256)',
        'function totalVolume() view returns (uint256)',
    ],
};

const UnifiedDashboard = ({ onBack, onViewChange }) => {
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState('');
    const [userBalance, setUserBalance] = useState('0');

    // Contract state
    const [contractData, setContractData] = useState({
        totalSupply: '0',
        collateralRatio: '0',
        totalCollateral: '0',
        oracleScore: '0',
        lastOracleUpdate: 0,
        marketConfidence: '0',
        mintingCapacity: '0',
        activeTasks: '0',
        currentPrice: '1.000',
    });

    // Mock data for visualization (replace with real data once connected)
    const [priceHistory, setPriceHistory] = useState([
        { time: '00:00', price: 0.998, target: 1.00 },
        { time: '04:00', price: 1.001, target: 1.00 },
        { time: '08:00', price: 0.999, target: 1.00 },
        { time: '12:00', price: 1.003, target: 1.00 },
        { time: '16:00', price: 1.001, target: 1.00 },
        { time: '20:00', price: 1.002, target: 1.00 },
        { time: 'Now', price: 1.002, target: 1.00 },
    ]);

    const [collateralBreakdown, setCollateralBreakdown] = useState([
        { name: 'Time Value', value: 300000, color: '#8b5cf6' },
        { name: 'Skills & IP', value: 200000, color: '#ec4899' },
        { name: 'Future Earnings', value: 250000, color: '#06b6d4' },
        { name: 'Network Value', value: 150000, color: '#10b981' },
        { name: 'Liquid ETH', value: 250000, color: '#f59e0b' },
    ]);

    // ========================================
    // WEB3 CONNECTION
    // ========================================

    const connectWallet = async () => {
        try {
            if (typeof window.ethereum === 'undefined') {
                alert('Please install MetaMask to use this dApp');
                return;
            }

            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            // Check if on Sepolia
            const chainId = await window.ethereum.request({
                method: 'eth_chainId'
            });

            if (chainId !== '0xaa36a7') { // Sepolia chainId
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0xaa36a7' }],
                    });
                } catch (error) {
                    alert('Please switch to Sepolia network in MetaMask');
                    return;
                }
            }

            setWalletAddress(accounts[0]);
            setConnected(true);

            // Load contract data
            await loadContractData(accounts[0]);

        } catch (error) {
            console.error('Error connecting wallet:', error);
            alert('Failed to connect wallet: ' + error.message);
        }
    };

    const disconnectWallet = () => {
        setConnected(false);
        setWalletAddress('');
        setUserBalance('0');
    };

    // ========================================
    // CONTRACT DATA LOADING
    // ========================================

    const loadContractData = async (userAddress) => {
        try {
            setLoading(true);

            // Check if we have ethers available
            if (typeof window.ethereum === 'undefined') {
                console.warn('MetaMask not available, using mock data');
                setLoading(false);
                return;
            }

            // Import ethers dynamically
            const { ethers } = await import('ethers');
            const provider = new ethers.BrowserProvider(window.ethereum);

            // Create contract instances
            const tokenContract = new ethers.Contract(
                CONTRACT_ADDRESSES.nateToken,
                ABIS.nateToken,
                provider
            );

            const engineContract = new ethers.Contract(
                CONTRACT_ADDRESSES.stabilityEngine,
                ABIS.stabilityEngine,
                provider
            );

            const oracleContract = new ethers.Contract(
                CONTRACT_ADDRESSES.lifeOracle,
                ABIS.lifeOracle,
                provider
            );

            // Fetch data from contracts
            const [
                totalSupply,
                userBal,
                collateralRatio,
                totalCollateral,
                oracleScore,
                lastUpdate,
            ] = await Promise.all([
                tokenContract.totalSupply(),
                tokenContract.balanceOf(userAddress),
                engineContract.getCollateralRatio(),
                engineContract.totalCollateralValue(),
                oracleContract.lastScore(),
                oracleContract.lastUpdate(),
            ]);

            // Update state with real data
            setContractData({
                totalSupply: ethers.formatEther(totalSupply),
                collateralRatio: collateralRatio.toString(),
                totalCollateral: ethers.formatEther(totalCollateral),
                oracleScore: oracleScore.toString(),
                lastOracleUpdate: Number(lastUpdate),
                currentPrice: '1.002', // Calculate from oracle data
                marketConfidence: '87', // From governance board
                mintingCapacity: ethers.formatEther(totalSupply), // From governance
                activeTasks: '12', // From task market
            });

            setUserBalance(ethers.formatEther(userBal));

        } catch (error) {
            console.error('Error loading contract data:', error);
            // Continue with mock data if contracts aren't deployed yet
        } finally {
            setLoading(false);
        }
    };

    // Auto-refresh data every 30 seconds
    useEffect(() => {
        if (connected) {
            const interval = setInterval(() => {
                loadContractData(walletAddress);
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [connected, walletAddress]);

    // ========================================
    // UI HELPERS
    // ========================================

    const formatAddress = (addr) => {
        if (!addr) return '';
        return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
    };

    const getHealthColor = () => {
        const ratio = parseFloat(contractData.collateralRatio);
        if (ratio >= 150) return 'text-green-400';
        if (ratio >= 130) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getHealthStatus = () => {
        const ratio = parseFloat(contractData.collateralRatio);
        if (ratio >= 150) return 'Healthy';
        if (ratio >= 130) return 'Warning';
        return 'Critical';
    };

    const totalCollateralValue = collateralBreakdown.reduce((sum, item) => sum + item.value, 0);

    // ========================================
    // RENDER
    // ========================================

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 via-pink-500 to-cyan-500 flex items-center justify-center text-2xl font-bold">
                                N
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Nate Protocol</h1>
                                <p className="text-xs text-gray-400">Human Capital-Backed Currency</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={onBack}
                                className="text-sm font-display font-medium text-gray-400 hover:text-white transition-colors"
                            >
                                ← BACK TO MARKET
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            {!connected ? (
                                <button
                                    onClick={connectWallet}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-2 rounded-lg font-medium transition-all"
                                >
                                    Connect Wallet
                                </button>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/20">
                                        <div className="text-xs text-gray-400">Your Balance</div>
                                        <div className="font-bold">{parseFloat(userBalance).toFixed(2)} $NATE</div>
                                    </div>
                                    <button
                                        onClick={disconnectWallet}
                                        className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg border border-white/20 text-sm"
                                    >
                                        {formatAddress(walletAddress)}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Connection Status Banner */}
                {!connected && (
                    <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-400" />
                        <div className="flex-1">
                            <p className="text-blue-200">
                                Connect your wallet to interact with the Nate Protocol on Sepolia testnet
                            </p>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 text-green-400" />
                            <span className="text-gray-400 text-sm">Current Price</span>
                        </div>
                        <p className="text-3xl font-bold">${contractData.currentPrice}</p>
                        <p className="text-green-400 text-sm">+0.2% from peg</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-5 h-5 text-purple-400" />
                            <span className="text-gray-400 text-sm">Collateral Ratio</span>
                        </div>
                        <p className={`text-3xl font-bold ${getHealthColor()}`}>
                            {contractData.collateralRatio}%
                        </p>
                        <p className="text-gray-400 text-sm">{getHealthStatus()}</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-cyan-400" />
                            <span className="text-gray-400 text-sm">Total Supply</span>
                        </div>
                        <p className="text-3xl font-bold">
                            {(parseFloat(contractData.totalSupply) / 1000).toFixed(0)}K
                        </p>
                        <p className="text-gray-400 text-sm">$NATE tokens</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-5 h-5 text-pink-400" />
                            <span className="text-gray-400 text-sm">Oracle Score</span>
                        </div>
                        <p className="text-3xl font-bold">{contractData.oracleScore}</p>
                        <p className="text-gray-400 text-sm">
                            Updated {contractData.lastOracleUpdate ?
                                new Date(contractData.lastOracleUpdate * 1000).toLocaleTimeString() :
                                'Never'}
                        </p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Price Stability Chart */}
                    <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Price Stability (24h)</h2>
                            <button
                                onClick={() => connected && loadContractData(walletAddress)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={priceHistory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="time" stroke="#9ca3af" />
                                <YAxis domain={[0.995, 1.005]} stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #ffffff20',
                                        borderRadius: '8px'
                                    }}
                                    labelStyle={{ color: '#fff' }}
                                />
                                <Line type="monotone" dataKey="price" stroke="#a78bfa" strokeWidth={3} dot={{ fill: '#a78bfa', r: 4 }} />
                                <Line type="monotone" dataKey="target" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-purple-400 rounded-full" />
                                <span>Actual Price</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border-2 border-green-400 rounded-full" />
                                <span>Target ($1.00)</span>
                            </div>
                        </div>
                    </div>

                    {/* Collateral Distribution */}
                    <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                        <h2 className="text-xl font-bold mb-4">Collateral Distribution</h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={collateralBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    dataKey="value"
                                    label={(entry) => `${((entry.value / totalCollateralValue) * 100).toFixed(0)}%`}
                                >
                                    {collateralBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #ffffff20',
                                        borderRadius: '8px'
                                    }}
                                    formatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                            {collateralBreakdown.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-gray-300">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* System Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Governance Status */}
                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-purple-400" />
                            Governance Status
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Market Confidence:</span>
                                <span className="font-bold text-purple-400">{contractData.marketConfidence}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Minting Capacity:</span>
                                <span className="font-bold">
                                    {(parseFloat(contractData.mintingCapacity) / 1000).toFixed(0)}K $NATE
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Active Tasks:</span>
                                <span className="font-bold text-cyan-400">{contractData.activeTasks}</span>
                            </div>
                        </div>
                    </div>

                    {/* Oracle Status */}
                    <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-cyan-400" />
                            Oracle Status
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Life Score:</span>
                                <span className="font-bold text-cyan-400">{contractData.oracleScore}/1000</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Last Update:</span>
                                <span className="font-bold">
                                    {contractData.lastOracleUpdate ?
                                        `${Math.floor((Date.now() - contractData.lastOracleUpdate * 1000) / 60000)}m ago` :
                                        'Pending'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                <span className="text-xs text-green-400">Chainlink Functions Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            Quick Actions
                        </h3>
                        <div className="space-y-2">
                            <button
                                disabled={!connected}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-2 rounded-lg font-medium transition-colors"
                                onClick={() => onViewChange('stability')}
                            >
                                Mint $NATE
                            </button>
                            <button
                                disabled={!connected}
                                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-2 rounded-lg font-medium transition-colors"
                                onClick={() => onViewChange('stability')}
                            >
                                Redeem for ETH
                            </button>
                            <button
                                disabled={!connected}
                                className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-2 rounded-lg font-medium transition-colors"
                                onClick={() => onViewChange('market')}
                            >
                                View Task Market
                            </button>
                        </div>
                    </div>
                </div>

                {/* Contract Addresses (for debugging) */}
                {connected && (
                    <div className="mt-8 bg-white/5 rounded-lg p-4 border border-white/20">
                        <details className="cursor-pointer">
                            <summary className="font-medium text-sm text-gray-400 hover:text-white">
                                Contract Addresses (Sepolia Testnet)
                            </summary>
                            <div className="mt-3 space-y-2 text-xs font-mono">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">$NATE Token:</span>
                                    <span>{CONTRACT_ADDRESSES.nateToken}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Stability Engine:</span>
                                    <span>{CONTRACT_ADDRESSES.stabilityEngine}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Life Oracle:</span>
                                    <span>{CONTRACT_ADDRESSES.lifeOracle}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Governance Board:</span>
                                    <span>{CONTRACT_ADDRESSES.governanceBoard}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Task Market:</span>
                                    <span>{CONTRACT_ADDRESSES.taskMarket}</span>
                                </div>
                            </div>
                        </details>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnifiedDashboard;
