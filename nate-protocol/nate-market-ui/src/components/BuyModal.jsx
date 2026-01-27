import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';

const BuyModal = ({ isOpen, onClose, onConfirm, loading }) => {
    const [amountEth, setAmountEth] = useState('0.1');

    // ETH Price Stub - Matches contract constant for consistency in UI
    const ETH_PRICE = 2500;
    const nateToReceive = (Number(amountEth) * ETH_PRICE).toFixed(2);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative bg-nate-card border border-nate-blue/30 rounded-[2rem] p-8 max-w-md w-full shadow-2xl shadow-nate-blue/10 overflow-hidden"
                >
                    {/* Decorative background glow */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-nate-blue/10 rounded-full blur-3xl"></div>

                    <h3 className="text-2xl font-display font-bold mb-2 text-white">GET $NATE</h3>
                    <p className="text-gray-400 font-body text-sm mb-8 italic">
                        1 $NATE is pegged to $1.00 USD. ETH is converted at the current protocol rate.
                    </p>

                    <div className="space-y-6 mb-8">
                        <div>
                            <label className="text-[10px] font-display font-bold text-nate-blue tracking-widest block mb-2">AMOUNT TO INVEST (ETH)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={amountEth}
                                    onChange={(e) => setAmountEth(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-2xl font-display text-white focus:border-nate-blue focus:outline-none transition-all"
                                    placeholder="0.00"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-display font-bold">ETH</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-center">
                            <div className="h-px bg-white/5 flex-1"></div>
                            <span className="px-4 text-gray-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                            </span>
                            <div className="h-px bg-white/5 flex-1"></div>
                        </div>

                        <div className="bg-nate-blue/5 border border-nate-blue/10 rounded-2xl p-6">
                            <label className="text-[10px] font-display font-bold text-nate-blue tracking-widest block mb-1 uppercase">ESTIMATED $NATE TO RECEIVE</label>
                            <p className="text-3xl font-display font-bold text-nate-green">
                                {Number(nateToReceive).toLocaleString()} <span className="text-sm opacity-50">$NATE</span>
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <button
                            onClick={() => onConfirm(amountEth)}
                            disabled={loading || !amountEth || Number(amountEth) <= 0}
                            className="bg-nate-blue text-black py-4 rounded-xl font-display font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 shadow-xl shadow-nate-blue/20"
                        >
                            {loading ? "PROCESSING..." : "CONFIRM PURCHASE"}
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-white transition-colors text-sm font-body tracking-widest uppercase"
                        >
                            CANCEL
                        </button>
                    </div>

                    <p className="mt-8 text-[10px] text-gray-600 text-center font-body uppercase tracking-[0.2em]">
                        95% of proceeds go to issuer wallet <br /> 5% retained for liquidity
                    </p>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default BuyModal;
