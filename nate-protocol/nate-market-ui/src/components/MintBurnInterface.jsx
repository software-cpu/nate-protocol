import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ArrowRight, AlertCircle, CheckCircle, Loader, Info, TrendingUp, DollarSign } from 'lucide-react';

/**
 * Mint/Burn Interface Component
 * Connects to your StabilityEngine contract for minting and redeeming $NATE
 */

// ========================================
// CONTRACT CONFIGURATION
// ========================================
const CONTRACT_ADDRESSES = {
    nateToken: '0xF256c0709CCCd20eE979B21e130D43ec0Ef6DBD5',
    stabilityEngine: '0x6ffa606718C667fC46409E95e1fCe9832fBCeE66',
};

// Contract ABIs - only the functions we need
const STABILITY_ENGINE_ABI = [
    'function mint(uint256 _amount) payable',
    'function redeem(uint256 _amount)',
    'function getCollateralRatio() view returns (uint256)',
    'function calculateRequiredCollateral(uint256 _mintAmount) view returns (uint256)',
    'function totalCollateralValue() view returns (uint256)',
];

const NATE_TOKEN_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
];

const MintBurnInterface = ({ walletAddress, isConnected, onBack }) => {
    // ========================================
    // STATE MANAGEMENT
    // ========================================
    const [activeTab, setActiveTab] = useState('mint');
    const [mintAmount, setMintAmount] = useState('');
    const [burnAmount, setBurnAmount] = useState('');

    // User balances
    const [ethBalance, setEthBalance] = useState('0');
    const [nateBalance, setNateBalance] = useState('0');
    const [allowance, setAllowance] = useState('0');

    // Transaction state
    const [txStatus, setTxStatus] = useState({ type: '', message: '', hash: '' });
    const [isProcessing, setIsProcessing] = useState(false);

    // Contract data
    const [collateralRatio, setCollateralRatio] = useState('0');
    const [requiredCollateral, setRequiredCollateral] = useState('0');

    // ETH price (could fetch from oracle, hardcoded for now)
    const [ethPrice] = useState(2500); // Updated to match our oracle's $2500 per ETH

    // ========================================
    // WEB3 HELPERS
    // ========================================

    const getProvider = async () => {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask not installed');
        }
        const { ethers } = await import('ethers');
        return new ethers.BrowserProvider(window.ethereum);
    };

    const getContracts = async () => {
        const { ethers } = await import('ethers');
        const provider = await getProvider();
        const signer = await provider.getSigner();

        const engineContract = new ethers.Contract(
            CONTRACT_ADDRESSES.stabilityEngine,
            STABILITY_ENGINE_ABI,
            signer
        );

        const tokenContract = new ethers.Contract(
            CONTRACT_ADDRESSES.nateToken,
            NATE_TOKEN_ABI,
            signer
        );

        return { engineContract, tokenContract, ethers };
    };

    // ========================================
    // DATA LOADING
    // ========================================

    const loadUserData = async () => {
        if (!isConnected || !walletAddress) return;

        try {
            const { tokenContract, engineContract, ethers } = await getContracts();
            const provider = await getProvider();

            // Get ETH balance
            const ethBal = await provider.getBalance(walletAddress);
            setEthBalance(ethers.formatEther(ethBal));

            // Get $NATE balance
            const nateBal = await tokenContract.balanceOf(walletAddress);
            setNateBalance(ethers.formatEther(nateBal));

            // Get allowance
            const allow = await tokenContract.allowance(
                walletAddress,
                CONTRACT_ADDRESSES.stabilityEngine
            );
            setAllowance(ethers.formatEther(allow));

            // Get collateral ratio
            const ratio = await engineContract.getCollateralRatio();
            setCollateralRatio(ratio.toString());

        } catch (error) {
            console.error('Error loading user data:', error);
        }
    };

    // Calculate required collateral when mint amount changes
    useEffect(() => {
        const calculateCollateral = async () => {
            if (!mintAmount || parseFloat(mintAmount) <= 0) {
                setRequiredCollateral('0');
                return;
            }

            try {
                const { engineContract, ethers } = await getContracts();
                const amountWei = ethers.parseEther(mintAmount);
                const required = await engineContract.calculateRequiredCollateral(amountWei);
                setRequiredCollateral(ethers.formatEther(required));
            } catch (error) {
                // If contract doesn't have this function, calculate manually (150%)
                const manual = (parseFloat(mintAmount) * 1.5 / ethPrice).toFixed(6);
                setRequiredCollateral(manual);
            }
        };

        if (isConnected) {
            calculateCollateral();
        }
    }, [mintAmount, isConnected, ethPrice]);

    // Auto-refresh data
    useEffect(() => {
        if (isConnected) {
            loadUserData();
            const interval = setInterval(loadUserData, 30000);
            return () => clearInterval(interval);
        }
    }, [isConnected, walletAddress]);

    // ========================================
    // TRANSACTION HANDLERS
    // ========================================

    const handleMint = async () => {
        if (!mintAmount || parseFloat(mintAmount) <= 0) {
            setTxStatus({
                type: 'error',
                message: 'Please enter a valid amount',
                hash: ''
            });
            return;
        }

        if (parseFloat(requiredCollateral) > parseFloat(ethBalance)) {
            setTxStatus({
                type: 'error',
                message: 'Insufficient ETH balance',
                hash: ''
            });
            return;
        }

        setIsProcessing(true);
        setTxStatus({
            type: 'pending',
            message: 'Preparing transaction...',
            hash: ''
        });

        try {
            const { engineContract, ethers } = await getContracts();

            // Convert amounts to Wei
            const mintAmountWei = ethers.parseEther(mintAmount);
            const collateralWei = ethers.parseEther(requiredCollateral);

            setTxStatus({
                type: 'pending',
                message: 'Waiting for transaction confirmation...',
                hash: ''
            });

            // Send mint transaction
            const tx = await engineContract.mint(mintAmountWei, {
                value: collateralWei,
                gasLimit: 500000n // Explicit gas limit
            });

            setTxStatus({
                type: 'pending',
                message: 'Transaction submitted! Waiting for confirmation...',
                hash: tx.hash
            });

            // Wait for confirmation
            const receipt = await tx.wait();

            setTxStatus({
                type: 'success',
                message: `Successfully minted ${mintAmount} $NATE!`,
                hash: receipt.hash
            });

            // Clear form and refresh data
            setMintAmount('');
            await loadUserData();

            // Clear success message after 5 seconds
            setTimeout(() => {
                setTxStatus({ type: '', message: '', hash: '' });
            }, 5000);

        } catch (error) {
            console.error('Mint error:', error);

            let errorMessage = 'Transaction failed';
            if (error.code === 'ACTION_REJECTED') {
                errorMessage = 'Transaction rejected by user';
            } else if (error.message.includes('insufficient funds')) {
                errorMessage = 'Insufficient ETH for gas fees';
            } else if (error.reason) {
                errorMessage = error.reason;
            }

            setTxStatus({
                type: 'error',
                message: errorMessage,
                hash: ''
            });

            setTimeout(() => {
                setTxStatus({ type: '', message: '', hash: '' });
            }, 5000);

        } finally {
            setIsProcessing(false);
        }
    };

    const handleApprove = async () => {
        setIsProcessing(true);
        setTxStatus({
            type: 'pending',
            message: 'Approving $NATE for burning...',
            hash: ''
        });

        try {
            const { tokenContract, ethers } = await getContracts();

            // Approve maximum amount for convenience
            const maxApproval = ethers.MaxUint256;

            const tx = await tokenContract.approve(
                CONTRACT_ADDRESSES.stabilityEngine,
                maxApproval
            );

            setTxStatus({
                type: 'pending',
                message: 'Waiting for approval confirmation...',
                hash: tx.hash
            });

            await tx.wait();

            setTxStatus({
                type: 'success',
                message: 'Approval successful! You can now burn $NATE.',
                hash: ''
            });

            // Refresh allowance
            await loadUserData();

            setTimeout(() => {
                setTxStatus({ type: '', message: '', hash: '' });
            }, 3000);

        } catch (error) {
            console.error('Approval error:', error);
            setTxStatus({
                type: 'error',
                message: error.reason || 'Approval failed',
                hash: ''
            });

            setTimeout(() => {
                setTxStatus({ type: '', message: '', hash: '' });
            }, 5000);

        } finally {
            setIsProcessing(false);
        }
    };

    const handleBurn = async () => {
        if (!burnAmount || parseFloat(burnAmount) <= 0) {
            setTxStatus({
                type: 'error',
                message: 'Please enter a valid amount',
                hash: ''
            });
            return;
        }

        if (parseFloat(burnAmount) > parseFloat(nateBalance)) {
            setTxStatus({
                type: 'error',
                message: 'Insufficient $NATE balance',
                hash: ''
            });
            return;
        }

        // Check if approval is needed
        if (parseFloat(allowance) < parseFloat(burnAmount)) {
            setTxStatus({
                type: 'error',
                message: 'Please approve $NATE spending first',
                hash: ''
            });
            return;
        }

        setIsProcessing(true);
        setTxStatus({
            type: 'pending',
            message: 'Preparing redemption...',
            hash: ''
        });

        try {
            const { engineContract, ethers } = await getContracts();

            const burnAmountWei = ethers.parseEther(burnAmount);

            setTxStatus({
                type: 'pending',
                message: 'Waiting for transaction confirmation...',
                hash: ''
            });

            const tx = await engineContract.redeem(burnAmountWei, {
                gasLimit: 500000n
            });

            setTxStatus({
                type: 'pending',
                message: 'Transaction submitted! Waiting for confirmation...',
                hash: tx.hash
            });

            const receipt = await tx.wait();

            setTxStatus({
                type: 'success',
                message: `Successfully redeemed ${burnAmount} $NATE for ETH!`,
                hash: receipt.hash
            });

            // Clear form and refresh data
            setBurnAmount('');
            await loadUserData();

            setTimeout(() => {
                setTxStatus({ type: '', message: '', hash: '' });
            }, 5000);

        } catch (error) {
            console.error('Burn error:', error);

            let errorMessage = 'Redemption failed';
            if (error.code === 'ACTION_REJECTED') {
                errorMessage = 'Transaction rejected by user';
            } else if (error.reason) {
                errorMessage = error.reason;
            }

            setTxStatus({
                type: 'error',
                message: errorMessage,
                hash: ''
            });

            setTimeout(() => {
                setTxStatus({ type: '', message: '', hash: '' });
            }, 5000);

        } finally {
            setIsProcessing(false);
        }
    };

    // ========================================
    // UI HELPERS
    // ========================================

    const getStatusColor = () => {
        switch (txStatus.type) {
            case 'success': return 'bg-green-500/20 border-green-500/50 text-green-200';
            case 'error': return 'bg-red-500/20 border-red-500/50 text-red-200';
            case 'pending': return 'bg-blue-500/20 border-blue-500/50 text-blue-200';
            default: return '';
        }
    };

    const getStatusIcon = () => {
        switch (txStatus.type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-red-400" />;
            case 'pending': return <Loader className="w-5 h-5 text-blue-400 animate-spin" />;
            default: return null;
        }
    };

    const etherscanLink = (hash) => {
        return `https://sepolia.etherscan.io/tx/${hash}`;
    };

    // ========================================
    // RENDER
    // ========================================

    return (
        <div className="w-full max-w-4xl mx-auto p-8 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                <div>
                    <h2 className="text-2xl font-bold font-display text-white">Stability Engine</h2>
                    <p className="text-gray-400 text-sm">Mint or burn $NATE to manage your position</p>
                </div>
                {onBack && (
                    <button
                        onClick={onBack}
                        className="text-sm font-display font-medium text-gray-400 hover:text-white transition-colors"
                    >
                        ← BACK
                    </button>
                )}
            </div>

            {/* Transaction Status Banner */}
            {txStatus.message && (
                <div className={`rounded-lg p-4 mb-6 flex items-start gap-3 border ${getStatusColor()}`}>
                    {getStatusIcon()}
                    <div className="flex-1">
                        <p className="text-sm">{txStatus.message}</p>
                        {txStatus.hash && (
                            <a
                                href={etherscanLink(txStatus.hash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs underline mt-2 inline-block hover:opacity-80"
                            >
                                View on Etherscan →
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* User Balance Summary */}
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-6 mb-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Your Position</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                        <div className="text-xs text-gray-500 mb-1">ETH Balance</div>
                        <div className="text-xl font-bold text-white">{parseFloat(ethBalance).toFixed(4)} ETH</div>
                        <div className="text-xs text-gray-500">${(parseFloat(ethBalance) * ethPrice).toFixed(2)} USD</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 mb-1">$NATE Balance</div>
                        <div className="text-xl font-bold text-nate-green">{parseFloat(nateBalance).toFixed(2)} $NATE</div>
                        <div className="text-xs text-gray-500">${parseFloat(nateBalance).toFixed(2)} USD</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 mb-1">Current Ratio</div>
                        <div className={`text-xl font-bold ${parseFloat(collateralRatio) >= 150 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {collateralRatio}%
                        </div>
                        <div className="text-xs text-gray-500">150% Required</div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-8 bg-black/20 p-1 rounded-xl">
                <button
                    onClick={() => setActiveTab('mint')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-display font-bold transition-all ${activeTab === 'mint'
                            ? 'bg-green-600/20 text-green-400 border border-green-600/30 shadow-lg shadow-green-600/5'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <Unlock className="w-4 h-4" />
                    MINT $NATE
                </button>
                <button
                    onClick={() => setActiveTab('burn')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-display font-bold transition-all ${activeTab === 'burn'
                            ? 'bg-red-600/20 text-red-400 border border-red-600/30 shadow-lg shadow-red-600/5'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <Lock className="w-4 h-4" />
                    REDEEM ETH
                </button>
            </div>

            {/* Mint Tab */}
            {activeTab === 'mint' && (
                <div className="space-y-6">
                    <div className="flex items-start gap-4 bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-200/80 leading-relaxed">
                            <p className="font-bold text-blue-400 mb-1 uppercase tracking-tighter">Stability Protocol</p>
                            <p>To preserve price stability, new $NATE tokens require 150% ETH collateralization. Your ETH is held in the non-custodial Stability Engine treasury.</p>
                        </div>
                    </div>

                    {/* Mint Amount Input */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                            Amount to Mint (USD)
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <DollarSign className="w-5 h-5 text-gray-500 group-focus-within:text-green-400 transition-colors" />
                            </div>
                            <input
                                type="number"
                                value={mintAmount}
                                onChange={(e) => setMintAmount(e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                disabled={!isConnected || isProcessing}
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-20 py-5 text-white text-2xl font-display font-bold placeholder-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-green-400/20 focus:border-green-400/40 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold bg-white/5 border border-white/10 px-3 py-1 rounded-md text-gray-400">
                                $NATE
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {[100, 500, 1000].map((val) => (
                                <button
                                    key={val}
                                    onClick={() => setMintAmount(val.toString())}
                                    disabled={!isConnected || isProcessing}
                                    className="bg-white/5 border border-white/10 text-xs font-bold px-4 py-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30"
                                >
                                    +${val}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Transaction Summary */}
                    <div className="bg-black/20 rounded-xl p-6 border border-white/5 space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Mint Amount:</span>
                            <span className="font-display font-bold">${parseFloat(mintAmount || 0).toLocaleString()} NATE</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Required ETH (150%):</span>
                            <span className="text-lg font-display font-bold text-green-400">{parseFloat(requiredCollateral).toFixed(6)} ETH</span>
                        </div>
                        <div className="border-t border-white/5 pt-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Price Impact:</span>
                                <span className="text-green-400 font-bold">0.00%</span>
                            </div>
                        </div>
                    </div>

                    {/* Mint Button */}
                    <button
                        onClick={handleMint}
                        disabled={!isConnected || isProcessing || !mintAmount || parseFloat(mintAmount) <= 0}
                        className="w-full relative group overflow-hidden bg-white text-black font-display font-black text-lg py-5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-white/5 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                    >
                        <div className="relative z-10 flex items-center justify-center gap-3">
                            {isProcessing ? (
                                <>
                                    <Loader className="w-6 h-6 animate-spin" />
                                    PROCESSING TRANSACTION...
                                </>
                            ) : (
                                <>
                                    <Unlock className="w-5 h-5" />
                                    MINT $NATE TOKENS
                                </>
                            )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-white to-nate-blue opacity-0 group-hover:opacity-10 transition-opacity" />
                    </button>
                </div>
            )}

            {/* Burn/Redeem Tab */}
            {activeTab === 'burn' && (
                <div className="space-y-6">
                    <div className="flex items-start gap-4 bg-orange-500/5 border border-orange-500/10 rounded-xl p-4">
                        <Info className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-orange-200/80 leading-relaxed">
                            <p className="font-bold text-orange-400 mb-1 uppercase tracking-tighter">Exit Liquidity</p>
                            <p>Burning $NATE destroys the token and releases your pro-rata share of the ETH treasury. Redemptions are permanent and instant.</p>
                        </div>
                    </div>

                    {/* Approval Check */}
                    {parseFloat(allowance) < parseFloat(burnAmount || 0) && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5 border-dashed">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex gap-3">
                                    <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
                                    <p className="text-xs text-yellow-200 font-medium">
                                        Protocol permission required. You must authorize the Stability Engine to burn your tokens.
                                    </p>
                                </div>
                                <button
                                    onClick={handleApprove}
                                    disabled={isProcessing}
                                    className="bg-yellow-500 text-black px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-yellow-400 transition-colors disabled:opacity-50"
                                >
                                    {isProcessing ? 'APPROVING...' : 'AUTHORIZE BURN'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Burn Amount Input */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                            Amount to Redeem ($NATE)
                        </label>
                        <div className="relative group">
                            <input
                                type="number"
                                value={burnAmount}
                                onChange={(e) => setBurnAmount(e.target.value)}
                                placeholder="0.00"
                                min="0"
                                max={nateBalance}
                                step="0.01"
                                disabled={!isConnected || isProcessing}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-5 text-white text-2xl font-display font-bold placeholder-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400/40 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold bg-white/5 border border-white/10 px-3 py-1 rounded-md text-gray-400">
                                $NATE
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {['25%', '50%', '75%', 'MAX'].map((label) => (
                                <button
                                    key={label}
                                    onClick={() => {
                                        const multi = label === 'MAX' ? 1 : parseInt(label) / 100;
                                        setBurnAmount((parseFloat(nateBalance) * multi).toFixed(2));
                                    }}
                                    disabled={!isConnected || isProcessing || parseFloat(nateBalance) === 0}
                                    className="bg-white/5 border border-white/10 text-xs font-bold px-4 py-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Redemption Summary */}
                    <div className="bg-black/20 rounded-xl p-6 border border-white/5 space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Tokens to Burn:</span>
                            <span className="font-display font-bold">{parseFloat(burnAmount || 0).toLocaleString()} $NATE</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">ETH to Receive:</span>
                            <span className="text-lg font-display font-bold text-red-400">
                                {((parseFloat(burnAmount || 0) * 1.5) / ethPrice).toFixed(6)} ETH
                            </span>
                        </div>
                        <div className="border-t border-white/5 pt-4">
                            <div className="flex items-center justify-between text-sm text-gray-500">
                                <span>Fee (0%):</span>
                                <span className="text-white">$0.00</span>
                            </div>
                        </div>
                    </div>

                    {/* Burn Button */}
                    <button
                        onClick={handleBurn}
                        disabled={!isConnected || isProcessing || !burnAmount || parseFloat(burnAmount) <= 0 || parseFloat(burnAmount) > parseFloat(nateBalance)}
                        className="w-full relative group overflow-hidden bg-red-600 text-white font-display font-black text-lg py-5 rounded-xl transition-all hover:bg-red-500 hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-red-600/10 disabled:opacity-50 disabled:bg-gray-800 disabled:scale-100 disabled:cursor-not-allowed"
                    >
                        <div className="relative z-10 flex items-center justify-center gap-3">
                            {isProcessing ? (
                                <>
                                    <Loader className="w-6 h-6 animate-spin" />
                                    CONFIRMING BURN...
                                </>
                            ) : (
                                <>
                                    <Lock className="w-5 h-5" />
                                    REDEEM AS ETH
                                </>
                            )}
                        </div>
                    </button>
                </div>
            )}

            {/* Footer Info */}
            <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-gray-500 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    Audited by Nate Board
                </div>
                <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" />
                    Network: Sepolia Testnet
                </div>
            </div>
        </div>
    );
};

export default MintBurnInterface;
