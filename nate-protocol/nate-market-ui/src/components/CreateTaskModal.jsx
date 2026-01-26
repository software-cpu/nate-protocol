import React, { useState } from 'react';

const CreateTaskModal = ({ isOpen, onClose, onConfirm, loading }) => {
    const [desc, setDesc] = useState('');
    const [horizon, setHorizon] = useState('0'); // 0=IMMEDIATE
    const [duration, setDuration] = useState('2'); // Default 2 hours

    if (!isOpen) return null;

    const handleSubmit = () => {
        // Convert duration to seconds based on horizon type logic or just raw hours
        const seconds = parseFloat(duration) * 3600;
        onConfirm(desc, parseInt(horizon), seconds);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-nate-card border border-nate-blue/30 rounded-lg p-8 w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white"
                >
                    ✕
                </button>

                <h2 className="text-2xl font-display font-bold mb-6 text-nate-blue">Create Prediction Market</h2>

                <div className="space-y-4 mb-8">
                    <div>
                        <label className="block text-xs font-mono text-gray-500 mb-2">DESCRIPTION</label>
                        <input
                            type="text"
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            className="w-full bg-black/50 border border-gray-700 rounded p-3 focus:border-nate-blue focus:outline-none text-white"
                            placeholder="e.g. Will Nate run 5 miles today?"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-mono text-gray-500 mb-2">HORIZON TYPE</label>
                            <select
                                value={horizon}
                                onChange={(e) => setHorizon(e.target.value)}
                                className="w-full bg-black/50 border border-gray-700 rounded p-3 focus:border-nate-blue focus:outline-none text-white"
                            >
                                <option value="0">IMMEDIATE</option>
                                <option value="1">DAILY</option>
                                <option value="2">SEASONAL</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-gray-500 mb-2">DURATION (HOURS)</label>
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="w-full bg-black/50 border border-gray-700 rounded p-3 focus:border-nate-blue focus:outline-none text-white"
                            />
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading || !desc}
                    className="w-full bg-nate-blue text-black py-4 rounded font-display font-bold text-lg hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "CREATING..." : "CREATE MARKET"}
                </button>
            </div>
        </div>
    );
};

export default CreateTaskModal;
