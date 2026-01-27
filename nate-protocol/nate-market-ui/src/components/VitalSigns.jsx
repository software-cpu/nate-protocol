import React, { useState, useEffect } from 'react';

const VitalSigns = () => {
    const [vitals, setVitals] = useState({
        heartRate: 72,
        focusScore: 88,
        deepWorkHours: 5.4,
        productivityIndex: 92,
        neuralLoad: 42
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setVitals(v => ({
                ...v,
                heartRate: Math.floor(70 + Math.random() * 10),
                neuralLoad: Math.floor(40 + Math.random() * 15)
            }));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const Metric = ({ label, value, unit, color, icon }) => (
        <div className="bg-nate-card/30 border border-gray-800/40 rounded-lg p-4 flex flex-col justify-between hover:border-nate-blue/40 transition-all duration-300">
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">{label}</span>
                <span className={color}>{icon}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-xl font-display font-bold text-white">{value}</span>
                <span className="text-[10px] text-gray-600 font-mono">{unit}</span>
            </div>
            <div className="mt-3 h-1 w-full bg-gray-900 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-1000 ${color.replace('text-', 'bg-')}`}
                    style={{ width: `${value > 100 ? 100 : value}%` }}
                ></div>
            </div>
        </div>
    );

    return (
        <div className="bg-nate-card/60 border border-nate-blue/20 rounded-xl p-6 backdrop-blur-md shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <h3 className="text-sm font-display font-bold mb-6 text-nate-blue flex items-center gap-3">
                <div className="flex gap-1 items-center">
                    <div className="w-1 h-4 bg-nate-blue/40 rounded-full animate-pulse"></div>
                    <div className="w-1 h-6 bg-nate-blue rounded-full animate-pulse delay-75"></div>
                    <div className="w-1 h-3 bg-nate-blue/60 rounded-full animate-pulse delay-150"></div>
                </div>
                BIOLOGICAL VITAL SIGNS
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Metric
                    label="HEART RATE"
                    value={vitals.heartRate}
                    unit="BPM"
                    color="text-nate-red"
                    icon="❤️"
                />
                <Metric
                    label="FOCUS SCORE"
                    value={vitals.focusScore}
                    unit="%"
                    color="text-nate-blue"
                    icon="🧠"
                />
                <Metric
                    label="DEEP WORK"
                    value={vitals.deepWorkHours}
                    unit="HRS"
                    color="text-nate-green"
                    icon="⚡"
                />
                <Metric
                    label="PROD. INDEX"
                    value={vitals.productivityIndex}
                    unit="IDX"
                    color="text-nate-blue"
                    icon="📈"
                />
                <Metric
                    label="NEURAL LOAD"
                    value={vitals.neuralLoad}
                    unit="%"
                    color="text-purple-500"
                    icon="🌀"
                />
            </div>

            <div className="mt-6 pt-4 border-t border-gray-800/50 flex justify-between items-center text-[9px] font-mono text-gray-600">
                <div className="flex gap-4">
                    <span>LIVE STREAM ACTIVE</span>
                    <span className="text-nate-green">CONNECTION SECURE</span>
                </div>
                <span>SOURCE: QUANTIFIED-SELF-API v2.1</span>
            </div>
        </div>
    );
};

export default VitalSigns;
