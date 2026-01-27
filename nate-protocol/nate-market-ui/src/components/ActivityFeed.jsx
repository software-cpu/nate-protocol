import React from 'react';

const ActivityFeed = ({ events }) => {
    return (
        <div className="bg-nate-card/30 border border-gray-800/40 rounded-xl p-6 backdrop-blur-sm h-full">
            <h3 className="text-sm font-display font-bold mb-4 text-gray-400 uppercase tracking-widest">
                Recent Activity
            </h3>
            <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 scrollbar-none">
                {events.map((event, i) => (
                    <div key={i} className="flex gap-4 items-start border-l-2 border-nate-blue/10 pl-4 py-1">
                        <div className="flex-1">
                            <p className="text-sm text-gray-200">{event.text}</p>
                            <p className="text-[10px] text-gray-600 font-mono mt-1">{event.time}</p>
                        </div>
                        {event.tag && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${event.type === 'bet' ? 'border-nate-green/30 text-nate-green' :
                                    event.type === 'mint' ? 'border-nate-blue/30 text-nate-blue' :
                                        'border-gray-700 text-gray-500'
                                }`}>
                                {event.tag}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActivityFeed;
