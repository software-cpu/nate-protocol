import React from 'react';
import { motion } from 'framer-motion';

const LandingPage = ({ onEnterMarket, onEnterDashboard, onBuyNate }) => {
    return (
        <div className="min-h-screen bg-nate-dark text-white selection:bg-nate-blue selection:text-black relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-nate-blue/10 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-nate-green/5 rounded-full blur-[120px] animate-pulse-slow"></div>
            </div>

            {/* Navigation */}
            <nav className="relative z-20 flex justify-between items-center px-8 py-6 max-w-7xl mx-auto border-b border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-nate-blue to-nate-green rounded-lg shadow-lg shadow-nate-blue/20"></div>
                    <span className="font-display font-bold text-xl tracking-tighter">NATE PROTOCOL</span>
                </div>
                <div className="flex gap-8 items-center">
                    <button
                        onClick={onEnterMarket}
                        className="text-sm font-body font-medium hover:text-nate-blue transition-colors cursor-pointer"
                    >
                        MARKET
                    </button>
                    <button
                        onClick={onEnterDashboard}
                        className="text-sm font-body font-medium hover:text-nate-blue transition-colors cursor-pointer"
                    >
                        DASHBOARD
                    </button>
                    <button
                        onClick={onBuyNate}
                        className="bg-nate-blue/10 border border-nate-blue text-nate-blue px-6 py-2 rounded font-display font-bold text-sm hover:bg-nate-blue hover:text-black transition-all"
                    >
                        GET $NATE
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 pt-32 pb-20 px-4 max-w-7xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="text-sm font-display font-bold text-nate-blue tracking-[0.3em] uppercase mb-4">
                        The New Asset Class
                    </h2>
                    <h1 className="text-6xl md:text-8xl font-display font-bold mb-8 leading-tight">
                        INVEST IN <br />
                        <span className="bg-gradient-to-r from-nate-blue via-white to-nate-green bg-clip-text text-transparent">
                            HUMAN POTENTIAL
                        </span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 font-body font-light leading-relaxed">
                        Nate Protocol tokenizes productivity, health, and skill metrics into a verifiable currency
                        backed by 150% real-world and on-chain capital.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6 justify-center">
                        <button
                            onClick={onBuyNate}
                            className="bg-white text-black px-10 py-4 rounded-full font-display font-bold hover:bg-nate-blue hover:scale-105 transition-all shadow-xl shadow-white/5"
                        >
                            BUY $NATE NOW
                        </button>
                        <button
                            onClick={onEnterMarket}
                            className="bg-nate-card/40 border border-white/10 text-white px-10 py-4 rounded-full font-display font-bold hover:bg-white/5 transition-all backdrop-blur-md"
                        >
                            VIEW LIVE MARKET
                        </button>
                    </div>
                </motion.div>
            </section>

            {/* Metrics Preview */}
            <section className="relative z-10 py-20 px-8 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { label: "HUMAN VALUATION", value: "$420,690", sub: "Based on GitHub & Bio metrics" },
                        { label: "LIQUID TREASURY", value: "42.5 ETH", sub: "Locked in Stability Engine" },
                        { label: "COLLATERAL RATIO", value: "182%", sub: "Healthy Stability Margin" }
                    ].map((m, i) => (
                        <div key={i} className="bg-nate-card/20 border border-white/5 p-8 rounded-3xl backdrop-blur-xl">
                            <p className="text-xs font-display font-bold text-nate-blue mb-4 tracking-widest">{m.label}</p>
                            <p className="text-4xl font-display font-bold mb-2">{m.value}</p>
                            <p className="text-sm text-gray-500 font-body">{m.sub}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it Works */}
            <section className="relative z-10 py-32 px-8 max-w-7xl mx-auto overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div>
                        <h2 className="text-4xl font-display font-bold mb-8">VERIFIABLE PERFORMANCE. <br /> VERIFIABLE STABILITY.</h2>
                        <div className="space-y-8">
                            <div className="flex gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-nate-blue/10 flex items-center justify-center shrink-0 border border-nate-blue/20">
                                    <span className="text-nate-blue font-bold">01</span>
                                </div>
                                <div>
                                    <h4 className="font-display font-bold mb-2">Metrics Aggregation</h4>
                                    <p className="text-gray-400 font-body">Chainlink Functions fetch productivity and health data directly from verified APIs (GitHub, HealthKit, Stripe).</p>
                                </div>
                            </div>
                            <div className="flex gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-nate-green/10 flex items-center justify-center shrink-0 border border-nate-green/20">
                                    <span className="text-nate-green font-bold">02</span>
                                </div>
                                <div>
                                    <h4 className="font-display font-bold mb-2">Algorithmic Minting</h4>
                                    <p className="text-gray-400 font-body">New $NATE is minted only when the measured Human Valuation exceeds the supply by 150%.</p>
                                </div>
                            </div>
                            <div className="flex gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                                    <span className="text-white font-bold">03</span>
                                </div>
                                <div>
                                    <h4 className="font-display font-bold mb-2">Universal Redemption</h4>
                                    <p className="text-gray-400 font-body">$NATE is redeemable 24/7 for ETH from the protocol treasury at the $1.00 USD peg.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="aspect-square rounded-[3rem] bg-gradient-to-tr from-nate-blue/20 to-nate-green/20 border border-white/10 p-12 flex items-center justify-center overflow-hidden">
                            <div className="w-64 h-64 rounded-full bg-white/5 animate-pulse-glow flex items-center justify-center text-4xl font-display font-bold">
                                $NATE
                            </div>
                            {/* Decorative particles */}
                            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-nate-blue rounded-full animate-ping"></div>
                            <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-nate-green rounded-full animate-ping delay-700"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Roadmap / Call to Action */}
            <section className="relative z-10 py-32 px-8 max-w-4xl mx-auto text-center">
                <div className="bg-gradient-to-b from-nate-blue/10 to-transparent border border-nate-blue/20 rounded-[4rem] p-20 backdrop-blur-3xl">
                    <h2 className="text-4xl font-display font-bold mb-6">READY TO INVEST?</h2>
                    <p className="text-gray-400 mb-10 font-body text-lg">
                        Phase 4 Mainnet Launch is approaching. Secure your position in the human capital market today.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={onBuyNate}
                            className="bg-nate-blue text-black px-12 py-4 rounded-full font-display font-bold hover:scale-105 transition-all"
                        >
                            GET $NATE
                        </button>
                        <a href="https://twitter.com" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors">
                            <span>JOIN THE DISCORD</span>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01a10.198 10.198 0 0 0 .372.292a.077.077 0 0 1-.008.128a12.723 12.723 0 0 1-1.873.892a.076.076 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.086 2.157 2.419c0 1.334-.947 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.086 2.157 2.419c0 1.334-.946 2.419-2.157 2.419z" /></svg>
                        </a>
                    </div>
                </div>
            </section>

            <footer className="py-12 border-t border-white/5 text-center text-gray-600 font-body text-sm">
                <p>&copy; 2026 NATE PROTOCOL. ALL RIGHTS RESERVED.</p>
                <p className="mt-2 text-xs opacity-50 uppercase tracking-widest">Powered by human capital & Chainlink</p>
            </footer>
        </div>
    );
};

export default LandingPage;
