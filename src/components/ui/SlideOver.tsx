import React from 'react';
import { X } from 'lucide-react';

interface SlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    width?: 'md' | 'lg' | 'xl';
}

export function SlideOver({ isOpen, onClose, title, children, width = 'lg' }: SlideOverProps) {
    if (!isOpen) return null;

    const widthClasses = {
        md: 'max-w-md',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 transition-opacity backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Slide Over Panel */}
            <div className={`fixed top-0 right-0 h-full ${widthClasses[width]} w-full bg-white dark:bg-card shadow-2xl z-50 overflow-y-auto border-l border-[rgba(162,161,168,0.1)]`}>
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-card border-b border-[rgba(162,161,168,0.1)] px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-[#16151C] dark:text-white font-semibold text-lg">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-[#A2A1A8] hover:text-[#16151C] dark:hover:text-white hover:bg-[rgba(162,161,168,0.05)] rounded-[8px] transition-colors"
                    >
                        <X size={20} strokeWidth={1.5} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </>
    );
}
