import React from 'react';
import { ethers } from 'ethers';

const TaskCard = ({ task, onBet, connected }) => {
    return (
        <div className="bg-nate-card/60 border border-gray-800/50 rounded-xl p-8 relative overflow-hidden group hover:border-nate-blue/60 transition-all duration-500 backdrop-blur-sm shadow-lg hover:shadow-nate-blue/5">
            {/* Horizon Badge */}
            <div className={`absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded ${task.status === 0 ? 'bg-gray-800 text-gray-400' : 'bg-nate-green text-black'
                }`}>
                {task.status === 0 ? task.horizon : 'RESOLVED'}
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
                </div>
            </div>

            {/* Pools */}
            <div className="flex justify-between text-xs text-gray-500 mb-6 font-mono">
                <span>YES: {Number(task.yesPool).toLocaleString()}</span>
                <span>NO: {Number(task.noPool).toLocaleString()}</span>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => onBet(task, true)}
                    disabled={task.status !== 0 || !connected}
                    className="bg-nate-green/10 border border-nate-green text-nate-green py-3 rounded hover:bg-nate-green hover:text-black font-display font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    BET YES
                </button>
                <button
                    onClick={() => onBet(task, false)}
                    disabled={task.status !== 0 || !connected}
                    className="bg-nate-red/10 border border-nate-red text-nate-red py-3 rounded hover:bg-nate-red hover:text-black font-display font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    BET NO
                </button>
            </div>
        </div>
    );
};

export default TaskCard;
