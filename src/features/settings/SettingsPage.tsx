import React, { useState } from 'react';
import {
    Key,
    FileText,
    Users,
    Settings as SettingsIcon,
    Save,
    Plus,
    Edit,
    Trash2,
    Eye,
    EyeOff
} from 'lucide-react';
import { mockOfferTemplates, mockHRTeam } from '../../data/mockData';

type SettingsTab = 'Integrations' | 'Offer Templates' | 'HR Team' | 'System Settings';

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('Integrations');
    const [showApiKeys, setShowApiKeys] = useState(false);

    const tabs: { id: SettingsTab; label: string; icon: any }[] = [
        { id: 'Integrations', label: 'Integrations', icon: Key },
        { id: 'Offer Templates', label: 'Offer Templates', icon: FileText },
        { id: 'HR Team', label: 'HR Team', icon: Users },
        { id: 'System Settings', label: 'System Settings', icon: SettingsIcon },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-[#16151C] dark:text-white font-semibold text-xl">Settings</h1>
                <p className="text-[#A2A1A8] font-light text-sm">Configure system settings and integrations</p>
            </div>

            {/* Settings Layout */}
            <div className="flex gap-6">
                {/* Sidebar Tabs */}
                <div className="w-64 bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] p-4">
                    <nav className="space-y-2">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-[10px] transition-colors font-light ${activeTab === tab.id
                                            ? 'bg-[rgba(113,82,243,0.05)] text-[#7152F3] font-semibold'
                                            : 'text-[#16151C] dark:text-[#A2A1A8] hover:bg-[rgba(162,161,168,0.05)] hover:text-[#16151C] dark:hover:text-white'
                                        }`}
                                >
                                    <Icon size={18} strokeWidth={activeTab === tab.id ? 2 : 1.5} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)]">
                    {/* Integrations Tab */}
                    {activeTab === 'Integrations' && (
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-[#16151C] dark:text-white font-semibold mb-4">API Integrations</h3>
                                <p className="text-sm text-[#A2A1A8] font-light mb-6">
                                    Configure external service connections for automated data sync
                                </p>
                            </div>

                            {/* Airtable */}
                            <div className="p-6 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="text-slate-900 dark:text-white">Airtable</h4>
                                        <p className="text-sm text-slate-500 dark:text-[#A2A1A8]">Applicant data sync</p>
                                    </div>
                                    <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                                        Connected
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Base ID</label>
                                        <input
                                            type="text"
                                            defaultValue="appXXXXXXXXXXXXXX"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">API Key</label>
                                        <div className="relative">
                                            <input
                                                type={showApiKeys ? 'text' : 'password'}
                                                defaultValue="keyXXXXXXXXXXXXXX"
                                                className="w-full px-4 py-2 pr-10 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                            />
                                            <button
                                                onClick={() => setShowApiKeys(!showApiKeys)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                {showApiKeys ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Table Name</label>
                                        <input
                                            type="text"
                                            defaultValue="Applicants"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* WordPress */}
                            <div className="p-6 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="text-slate-900 dark:text-white">WordPress / LearnDash</h4>
                                        <p className="text-sm text-slate-500 dark:text-[#A2A1A8]">Employee onboarding & LMS</p>
                                    </div>
                                    <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                                        Connected
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">WordPress URL</label>
                                        <input
                                            type="text"
                                            defaultValue="https://lms.prolifichomecare.com"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">REST API Username</label>
                                        <input
                                            type="text"
                                            defaultValue="api_user"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Application Password</label>
                                        <input
                                            type={showApiKeys ? 'text' : 'password'}
                                            defaultValue="xxxx xxxx xxxx xxxx xxxx xxxx"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Caregiver Group ID</label>
                                            <input
                                                type="text"
                                                defaultValue="123"
                                                className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Nurse Group ID</label>
                                            <input
                                                type="text"
                                                defaultValue="124"
                                                className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Automation Webhooks */}
                            <div className="p-6 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="text-slate-900 dark:text-white">Automation Webhooks</h4>
                                        <p className="text-sm text-slate-500 dark:text-[#A2A1A8]">n8n / Zapier integrations</p>
                                    </div>
                                    <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                        Optional
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Offer Approved Webhook</label>
                                        <input
                                            type="text"
                                            placeholder="https://hooks.n8n.io/webhook/..."
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Employee Onboarded Webhook</label>
                                        <input
                                            type="text"
                                            placeholder="https://hooks.zapier.com/hooks/catch/..."
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button className="flex items-center gap-2 px-6 py-2 bg-[#7152F3] text-white rounded-[10px] hover:bg-[rgba(113,82,243,0.9)] transition-colors font-light">
                                    <Save size={18} strokeWidth={1.5} />
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Offer Templates Tab */}
                    {activeTab === 'Offer Templates' && (
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-slate-900 dark:text-white">Offer Letter Templates</h3>
                                    <p className="text-sm text-slate-600 dark:text-[#A2A1A8] mt-1">
                                        Manage templates for offer letters
                                    </p>
                                </div>
                                <button className="flex items-center gap-2 px-4 py-2 bg-[#7152F3] text-white rounded-[10px] hover:bg-[rgba(113,82,243,0.9)] transition-colors font-light">
                                    <Plus size={18} strokeWidth={1.5} />
                                    New Template
                                </button>
                            </div>

                            <div className="space-y-4">
                                {mockOfferTemplates.map((template) => (
                                    <div key={template.id} className="p-6 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg hover:border-blue-200 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="text-slate-900 dark:text-white mb-2">{template.name}</h4>
                                                <p className="text-sm text-slate-500 dark:text-[#A2A1A8] mb-3">
                                                    Last updated: {template.lastUpdated}
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {template.variables.map((variable) => (
                                                        <span
                                                            key={variable}
                                                            className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded text-sm font-mono"
                                                        >
                                                            {variable}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 ml-4">
                                                <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                                    <Edit size={18} />
                                                </button>
                                                <button className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-6 border border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800 rounded-lg">
                                <h5 className="text-slate-900 dark:text-white mb-2">Available Variables</h5>
                                <p className="text-sm text-slate-600 dark:text-[#A2A1A8] mb-3">
                                    Use these variables in your templates. They will be automatically replaced with actual data.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {['{{name}}', '{{position}}', '{{start_date}}', '{{rate}}', '{{license_type}}', '{{department}}'].map((variable) => (
                                        <span
                                            key={variable}
                                            className="px-3 py-1 bg-white dark:bg-card border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded text-sm font-mono"
                                        >
                                            {variable}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HR Team Tab */}
                    {activeTab === 'HR Team' && (
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-slate-900 dark:text-white">HR Team Members</h3>
                                    <p className="text-sm text-slate-600 dark:text-[#A2A1A8] mt-1">
                                        Manage HR staff and permissions
                                    </p>
                                </div>
                                <button className="flex items-center gap-2 px-4 py-2 bg-[#7152F3] text-white rounded-[10px] hover:bg-[rgba(113,82,243,0.9)] transition-colors font-light">
                                    <Plus size={18} strokeWidth={1.5} />
                                    Add Team Member
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-[rgba(162,161,168,0.1)]">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-[#A2A1A8] uppercase tracking-wider">
                                                Name
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-[#A2A1A8] uppercase tracking-wider">
                                                Email
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-[#A2A1A8] uppercase tracking-wider">
                                                Role
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-[#A2A1A8] uppercase tracking-wider">
                                                Last Active
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-[#A2A1A8] uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-[rgba(162,161,168,0.1)]">
                                        {mockHRTeam.map((member) => (
                                            <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="text-slate-900 dark:text-white">{member.name}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-slate-700 dark:text-[#A2A1A8]">{member.email}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-sm ${member.role === 'Admin'
                                                            ? 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
                                                            : 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                                                        }`}>
                                                        {member.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-slate-600 dark:text-[#A2A1A8]">{member.lastActive}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">Edit</button>
                                                        <button className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">Remove</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* System Settings Tab */}
                    {activeTab === 'System Settings' && (
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-slate-900 dark:text-white mb-4">System Configuration</h3>
                                <p className="text-sm text-slate-600 dark:text-[#A2A1A8] mb-6">
                                    Configure company branding and system defaults
                                </p>
                            </div>

                            {/* Company Branding */}
                            <div className="p-6 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg">
                                <h4 className="text-slate-900 dark:text-white mb-4">Company Branding</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Company Name</label>
                                        <input
                                            type="text"
                                            defaultValue="Prolific Homecare LLC"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Company Logo URL</label>
                                        <input
                                            type="text"
                                            placeholder="https://..."
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Document Requirements */}
                            <div className="p-6 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg">
                                <h4 className="text-slate-900 dark:text-white mb-4">Document Requirements</h4>
                                <div className="space-y-3">
                                    {[
                                        'Application Form',
                                        'I-9 Form',
                                        'Background Check',
                                        'Emergency Contact',
                                        'License/Certifications',
                                        'Vaccination Records',
                                        'CPR Card',
                                        'TB Test',
                                    ].map((doc) => (
                                        <label key={doc} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                            <input
                                                type="checkbox"
                                                defaultChecked
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <span className="text-slate-700 dark:text-[#A2A1A8]">{doc}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Compliance Rules */}
                            <div className="p-6 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg">
                                <h4 className="text-slate-900 dark:text-white mb-4">Compliance Rules</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">
                                            Alert Days Before Document Expiration
                                        </label>
                                        <input
                                            type="number"
                                            defaultValue="30"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                        <p className="text-xs text-slate-500 dark:text-[#A2A1A8] mt-1">
                                            System will alert when documents are within this many days of expiring
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                                    <Save size={18} />
                                    Save Settings
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
