import React, { useState } from 'react';
import { useAIOfferLetter } from '@/hooks/useAI';
import { FileText, Copy, Check, Edit3, Send } from 'lucide-react';

interface OfferLetterDraftPanelProps {
    employeeDetails: any;
    onSend?: (content: string) => void;
}

export function OfferLetterDraftPanel({ employeeDetails, onSend }: OfferLetterDraftPanelProps) {
    const { generate, data, loading, error } = useAIOfferLetter();
    const [copied, setCopied] = useState(false);
    const [editableBody, setEditableBody] = useState('');

    const handleDraft = async () => {
        const result = await generate(employeeDetails);
        if (result) {
            setEditableBody(result.body);
        }
    };

    const handleCopy = () => {
        if (data) {
            navigator.clipboard.writeText(editableBody);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!data && !loading && !error) {
        return (
            <div className="p-6 border rounded-lg bg-white dark:bg-gray-800 text-center">
                <FileText className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">AI Offer Letter Drafter</h3>
                <p className="text-gray-500 mb-4 max-w-md mx-auto">
                    Generate a personalized offer letter for <strong>{employeeDetails.name}</strong> based on their position and terms.
                </p>
                <button
                    onClick={handleDraft}
                    className="px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                >
                    Draft Offer Letter
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-12 border rounded-lg bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                <p className="text-gray-500 animate-pulse">Drafting professional offer letter...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/10">
                <p className="text-sm text-red-600 dark:text-red-300">{error.message}</p>
                <button onClick={handleDraft} className="mt-2 text-sm font-medium text-red-700 underline">Try Again</button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-500" />
                    Draft Offer Letter
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                    {onSend && (
                        <button
                            onClick={() => onSend(editableBody)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                            <Send className="w-4 h-4" />
                            Send Offer
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                <div className="mb-4 pb-4 border-b dark:border-gray-700">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Subject</label>
                    <div className="text-gray-900 dark:text-white font-medium">{data?.subject}</div>
                </div>

                <div className="relative">
                    <textarea
                        value={editableBody}
                        onChange={(e) => setEditableBody(e.target.value)}
                        className="w-full h-96 p-4 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-md border-0 focus:ring-2 focus:ring-blue-500 resize-none font-serif leading-relaxed"
                    />
                    <div className="absolute top-2 right-2 text-gray-400 pointer-events-none">
                        <Edit3 className="w-4 h-4" />
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    {data?.key_terms.map((term, i) => (
                        <span key={i} className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-md dark:bg-blue-900/30 dark:text-blue-300">
                            {term}
                        </span>
                    ))}
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-400">
                        Tone: {data?.tone}
                    </span>
                </div>
            </div>
        </div>
    );
}
