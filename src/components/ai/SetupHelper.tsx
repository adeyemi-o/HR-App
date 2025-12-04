import React, { useState } from 'react';
import { useAISetupHelper } from '@/hooks/useAI';
import { HelpCircle, Settings, ArrowRight, Lightbulb } from 'lucide-react';

export function SetupHelper() {
    const { generate, data, loading, error } = useAISetupHelper();
    const [query, setQuery] = useState('');

    const handleAsk = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            generate(query);
        }
    };

    return (
        <div className="p-6 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="w-6 h-6 text-teal-500" />
                <h3 className="text-lg font-semibold">System Setup Assistant</h3>
            </div>

            <form onSubmit={handleAsk} className="relative mb-6">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask how to configure settings (e.g., 'How do I set up Brevo?')"
                    className="w-full pl-4 pr-12 py-3 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                />
                <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                        <ArrowRight className="w-4 h-4" />
                    )}
                </button>
            </form>

            {error && (
                <div className="p-4 mb-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/10 text-sm text-red-600 dark:text-red-300">
                    {error.message}
                </div>
            )}

            {data && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg shrink-0">
                            <Lightbulb className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {data.advice}
                        </div>
                    </div>

                    {data.config_suggestions.length > 0 && (
                        <div>
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                <Settings className="w-4 h-4" />
                                Suggested Configurations
                            </h4>
                            <div className="space-y-3">
                                {data.config_suggestions.map((suggestion, i) => (
                                    <div key={i} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:border-teal-300 transition-colors">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-mono text-xs font-medium text-gray-500 uppercase">Setting Key</span>
                                            <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded dark:bg-teal-900/30 dark:text-teal-300">
                                                Suggested Value
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mb-2">
                                            <code className="text-sm font-semibold text-gray-900 dark:text-white">{suggestion.setting_key}</code>
                                            <code className="text-sm text-gray-700 dark:text-gray-300">{suggestion.suggested_value}</code>
                                        </div>
                                        <p className="text-xs text-gray-500 border-t pt-2 mt-2 dark:border-gray-700">
                                            {suggestion.reason}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
