import { useState, useEffect } from 'react';
import { settingsService } from '@/services/settingsService';
import { supabase } from '@/lib/supabase';
import {
    Key,

    Settings as SettingsIcon,
    Save,
    Users,
    Eye,
    EyeOff,
    Plus,
    X
} from 'lucide-react';
import { userService, type UserProfile } from '@/services/userService';

type SettingsTab = 'Integrations' | 'System Settings' | 'Team';

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('Integrations');
    const [showApiKeys, setShowApiKeys] = useState(false);
    const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'Team') {
            loadUsers();
        } else {
            loadSettings();
        }
    }, [activeTab]);

    const loadSettings = async () => {
        try {
            const data = await settingsService.getSettings();
            setSettingsMap(data);
        } catch (error) {
            console.error('Failed to load settings', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            await settingsService.updateSettings(settingsMap);
            alert('Settings saved successfully');
        } catch (error) {
            console.error('Failed to save settings', error);
            alert('Failed to save settings');
        }
    };

    const updateSetting = (key: string, value: string) => {
        setSettingsMap(prev => ({ ...prev, [key]: value }));
    };


    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('invite-user', {
                body: { email: inviteEmail }
            });

            if (error) throw error;

            // Handle 200 OK errors from the function
            if (data && data.error) {
                throw new Error(JSON.stringify(data, null, 2));
            }

            alert('Invitation sent successfully!');
            setShowInviteModal(false);
            setInviteEmail('');
            // Refresh users list
            loadUsers();
        } catch (error: any) {
            console.error('Failed to invite user', error);
            // Alert the full error object for debugging
            alert(error.message || JSON.stringify(error, null, 2));
        } finally {
            setInviteLoading(false);
        }
    };

    // Admin Request Management & User Editing
    const [requests, setRequests] = useState<any[]>([]);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [editFormData, setEditFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        role: 'staff' as 'admin' | 'hr' | 'staff',
        password: ''
    });
    const [editLoading, setEditLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'Team') {
            loadRequests();
        }
    }, [activeTab]);

    const loadRequests = async () => {
        try {
            const data = await userService.getAllPendingRequests();
            setRequests(data);
        } catch (error) {
            console.error('Failed to load requests', error);
        }
    };

    const handleApprove = async (requestId: string) => {
        if (!confirm('Are you sure you want to approve this request?')) return;
        try {
            await userService.approveRequest(requestId);
            alert('Request approved');
            loadRequests();
            loadUsers();
        } catch (error) {
            console.error('Failed to approve request', error);
            alert('Failed to approve request');
        }
    };

    const handleReject = async (requestId: string) => {
        if (!confirm('Are you sure you want to reject this request?')) return;
        try {
            await userService.rejectRequest(requestId);
            alert('Request rejected');
            loadRequests();
        } catch (error) {
            console.error('Failed to reject request', error);
            alert('Failed to reject request');
        }
    };

    const handleEditClick = (user: UserProfile) => {
        setEditingUser(user);
        setEditFormData({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email,
            phone_number: user.phone_number || '',
            role: user.role,
            password: ''
        });
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setEditLoading(true);
        try {
            const updates: any = {
                first_name: editFormData.first_name,
                last_name: editFormData.last_name,
                email: editFormData.email,
                phone_number: editFormData.phone_number,
                role: editFormData.role
            };
            if (editFormData.password) {
                updates.password = editFormData.password;
            }

            await userService.adminUpdateUser(editingUser.id, updates);
            alert('User updated successfully');
            setEditingUser(null);
            loadUsers();
        } catch (error) {
            console.error('Failed to update user', error);
            alert('Failed to update user');
        } finally {
            setEditLoading(false);
        }
    };

    const tabs: { id: SettingsTab; label: string; icon: any }[] = [
        { id: 'Integrations', label: 'Integrations', icon: Key },
        { id: 'System Settings', label: 'System Settings', icon: SettingsIcon },
        { id: 'Team', label: 'Team Management', icon: Users },
    ];

    if (loading) return <div className="p-8 text-center text-[#A2A1A8]">Loading settings...</div>;

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
                                            value={settingsMap['airtable_base_id'] || ''}
                                            onChange={(e) => updateSetting('airtable_base_id', e.target.value)}
                                            placeholder="appXXXXXXXXXXXXXX"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">API Key</label>
                                        <div className="relative">
                                            <input
                                                type={showApiKeys ? 'text' : 'password'}
                                                value={settingsMap['airtable_api_key'] || ''}
                                                onChange={(e) => updateSetting('airtable_api_key', e.target.value)}
                                                placeholder="keyXXXXXXXXXXXXXX"
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
                                            value={settingsMap['airtable_table_name'] || ''}
                                            onChange={(e) => updateSetting('airtable_table_name', e.target.value)}
                                            placeholder="Applicants"
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
                                            value={settingsMap['wp_api_url'] || ''}
                                            onChange={(e) => updateSetting('wp_api_url', e.target.value)}
                                            placeholder="https://lms.prolifichomecare.com"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">REST API Username</label>
                                        <input
                                            type="text"
                                            value={settingsMap['wp_username'] || ''}
                                            onChange={(e) => updateSetting('wp_username', e.target.value)}
                                            placeholder="api_user"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Application Password</label>
                                        <input
                                            type={showApiKeys ? 'text' : 'password'}
                                            value={settingsMap['wp_app_password'] || ''}
                                            onChange={(e) => updateSetting('wp_app_password', e.target.value)}
                                            placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Caregiver Group ID</label>
                                            <input
                                                type="text"
                                                value={settingsMap['wp_group_caregiver'] || ''}
                                                onChange={(e) => updateSetting('wp_group_caregiver', e.target.value)}
                                                placeholder="123"
                                                className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Nurse Group ID</label>
                                            <input
                                                type="text"
                                                value={settingsMap['wp_group_nurse'] || ''}
                                                onChange={(e) => updateSetting('wp_group_nurse', e.target.value)}
                                                placeholder="124"
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
                                            value={settingsMap['webhook_offer_approved'] || ''}
                                            onChange={(e) => updateSetting('webhook_offer_approved', e.target.value)}
                                            placeholder="https://hooks.n8n.io/webhook/..."
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Employee Onboarded Webhook</label>
                                        <input
                                            value={settingsMap['webhook_employee_onboarded'] || ''}
                                            onChange={(e) => updateSetting('webhook_employee_onboarded', e.target.value)}
                                            placeholder="https://hooks.zapier.com/hooks/catch/..."
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-6 py-2 bg-[#7152F3] text-white rounded-[10px] hover:bg-[rgba(113,82,243,0.9)] transition-colors font-light"
                                >
                                    <Save size={18} strokeWidth={1.5} />
                                    Save Changes
                                </button>
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
                                            value={settingsMap['company_name'] || ''}
                                            onChange={(e) => updateSetting('company_name', e.target.value)}
                                            placeholder="Prolific Homecare LLC"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Company Logo URL</label>
                                        <input
                                            value={settingsMap['company_logo'] || ''}
                                            onChange={(e) => updateSetting('company_logo', e.target.value)}
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
                                            value={settingsMap['compliance_alert_days'] || ''}
                                            onChange={(e) => updateSetting('compliance_alert_days', e.target.value)}
                                            placeholder="30"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-[#16151C] dark:text-white"
                                        />
                                        <p className="text-xs text-slate-500 dark:text-[#A2A1A8] mt-1">
                                            System will alert when documents are within this many days of expiring
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    <Save size={18} />
                                    Save Settings
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Team Management Tab */}
                    {activeTab === 'Team' && (
                        <div className="space-y-6">
                            {/* Pending Requests Section */}
                            {requests.length > 0 && (
                                <div className="rounded-[20px] p-6 border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/20">
                                    <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-500 mb-4">Pending Profile Change Requests</h3>
                                    <div className="space-y-4">
                                        {requests.map((req) => (
                                            <div key={req.id} className="bg-white dark:bg-card p-4 rounded-lg border border-amber-100 dark:border-amber-900/20 flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium text-[#16151C] dark:text-white">
                                                        {req.profiles?.first_name} {req.profiles?.last_name} ({req.profiles?.email})
                                                    </div>
                                                    <div className="text-sm text-slate-500 dark:text-[#A2A1A8] mt-1">
                                                        Requested changes:
                                                        <ul className="list-disc list-inside mt-1 ml-2">
                                                            {Object.entries(req.changes).map(([key, value]) => (
                                                                <li key={key}>
                                                                    <span className="capitalize">{key.replace('_', ' ')}</span>: <span className="font-medium text-[#16151C] dark:text-white">{String(value)}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-2">
                                                        Requested on {new Date(req.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApprove(req.id)}
                                                        className="px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(req.id)}
                                                        className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="rounded-[20px] p-6 border border-gray-100 dark:border-[rgba(162,161,168,0.1)]">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-lg font-semibold text-[#16151C] dark:text-white">Team Members</h2>
                                        <p className="text-sm text-[#A2A1A8] font-light mt-1">Manage your team's access and roles</p>
                                    </div>
                                    <button
                                        onClick={() => setShowInviteModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#7152F3] text-white rounded-[10px] hover:bg-[rgba(113,82,243,0.9)] transition-colors font-light"
                                    >
                                        <Plus size={18} strokeWidth={1.5} />
                                        Invite Member
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-100 dark:border-[rgba(162,161,168,0.1)]">
                                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-[#A2A1A8]">Name</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-[#A2A1A8]">Email</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-[#A2A1A8]">Role</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-[#A2A1A8]">Joined</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500 dark:text-[#A2A1A8]">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user) => (
                                                <tr key={user.id} className="border-b border-gray-100 dark:border-[rgba(162,161,168,0.1)] last:border-0 hover:bg-gray-50 dark:hover:bg-[rgba(162,161,168,0.02)] transition-colors">
                                                    <td className="py-3 px-4 text-[#16151C] dark:text-white">
                                                        {user.first_name || '—'} {user.last_name || ''}
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-600 dark:text-[#A2A1A8]">{user.email}</td>
                                                    <td className="py-3 px-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin'
                                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                                            : user.role === 'hr'
                                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                                            }`}>
                                                            {user.role.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-600 dark:text-[#A2A1A8] text-sm">
                                                        {new Date(user.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button
                                                            onClick={() => handleEditClick(user)}
                                                            className="text-[#7152F3] hover:text-[#5b3fd1] font-medium text-sm"
                                                        >
                                                            Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {users.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="py-8 text-center text-[#A2A1A8]">
                                                        No team members found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Edit User Modal */}
                            {editingUser && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                    <div className="w-full max-w-lg bg-white dark:bg-[#16151C] rounded-[20px] p-6 shadow-xl border border-gray-100 dark:border-[rgba(162,161,168,0.1)] max-h-[90vh] overflow-y-auto">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-semibold text-[#16151C] dark:text-white">Edit User</h3>
                                            <button
                                                onClick={() => setEditingUser(null)}
                                                className="text-[#A2A1A8] hover:text-[#16151C] dark:hover:text-white transition-colors"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <form onSubmit={handleUpdateUser} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-[#16151C] dark:text-[#A2A1A8] mb-2">First Name</label>
                                                    <input
                                                        type="text"
                                                        value={editFormData.first_name}
                                                        onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                                                        className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg bg-transparent text-[#16151C] dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-[#16151C] dark:text-[#A2A1A8] mb-2">Last Name</label>
                                                    <input
                                                        type="text"
                                                        value={editFormData.last_name}
                                                        onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                                                        className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg bg-transparent text-[#16151C] dark:text-white"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-[#16151C] dark:text-[#A2A1A8] mb-2">Email</label>
                                                <input
                                                    type="email"
                                                    value={editFormData.email}
                                                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg bg-transparent text-[#16151C] dark:text-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-[#16151C] dark:text-[#A2A1A8] mb-2">Phone Number</label>
                                                <input
                                                    type="tel"
                                                    value={editFormData.phone_number}
                                                    onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg bg-transparent text-[#16151C] dark:text-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-[#16151C] dark:text-[#A2A1A8] mb-2">Role</label>
                                                <select
                                                    value={editFormData.role}
                                                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as 'admin' | 'hr' | 'staff' })}
                                                    className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg bg-transparent text-[#16151C] dark:text-white"
                                                >
                                                    <option value="staff">Staff</option>
                                                    <option value="hr">HR</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </div>

                                            <div className="pt-4 border-t border-gray-100 dark:border-[rgba(162,161,168,0.1)]">
                                                <h4 className="text-sm font-medium text-[#16151C] dark:text-white mb-3">Change Password (Optional)</h4>
                                                <input
                                                    type="password"
                                                    value={editFormData.password}
                                                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                                                    placeholder="Enter new password to reset"
                                                    className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg bg-transparent text-[#16151C] dark:text-white"
                                                />
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingUser(null)}
                                                    className="px-4 py-2 text-sm font-medium text-[#16151C] dark:text-white hover:bg-gray-100 dark:hover:bg-[rgba(162,161,168,0.1)] rounded-lg transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={editLoading}
                                                    className="px-4 py-2 text-sm font-medium text-white bg-[#7152F3] hover:bg-[rgba(113,82,243,0.9)] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {editLoading ? 'Saving...' : 'Save Changes'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Invite Modal */}
                    {showInviteModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <div className="w-full max-w-md bg-white dark:bg-[#16151C] rounded-[20px] p-6 shadow-xl border border-gray-100 dark:border-[rgba(162,161,168,0.1)]">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold text-[#16151C] dark:text-white">Invite Team Member</h3>
                                    <button
                                        onClick={() => setShowInviteModal(false)}
                                        className="text-[#A2A1A8] hover:text-[#16151C] dark:hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleInvite} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[#16151C] dark:text-[#A2A1A8] mb-2">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="colleague@company.com"
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7152F3] bg-transparent text-[#16151C] dark:text-white"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowInviteModal(false)}
                                            className="px-4 py-2 text-sm font-medium text-[#16151C] dark:text-white hover:bg-gray-100 dark:hover:bg-[rgba(162,161,168,0.1)] rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={inviteLoading}
                                            className="px-4 py-2 text-sm font-medium text-white bg-[#7152F3] hover:bg-[rgba(113,82,243,0.9)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {inviteLoading ? 'Sending...' : 'Send Invitation'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
