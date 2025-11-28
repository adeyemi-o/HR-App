import React from 'react';

interface ProgressBarProps {
    progress: number;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
    color?: 'blue' | 'green' | 'purple' | 'teal';
}

export function ProgressBar({
    progress,
    showLabel = true,
    size = 'md',
    color = 'blue'
}: ProgressBarProps) {
    const heightClasses = {
        sm: 'h-1.5',
        md: 'h-2',
        lg: 'h-3',
    };

    const colorClasses = {
        blue: 'bg-[#3B82F6]',
        green: 'bg-[#22C55E]',
        purple: 'bg-[#7152F3]',
        teal: 'bg-[#14B8A6]',
    };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-1">
                {showLabel && (
                    <span className="text-sm text-[#A2A1A8] font-light">{progress}%</span>
                )}
            </div>
            <div className={`w-full bg-[rgba(162,161,168,0.1)] rounded-full ${heightClasses[size]} overflow-hidden`}>
                <div
                    className={`${heightClasses[size]} rounded-full ${colorClasses[color]} transition-all duration-300`}
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
            </div>
        </div>
    );
}
