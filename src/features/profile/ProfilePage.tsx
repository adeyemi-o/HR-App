import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { userService } from '@/services/userService';
import { Shield, User, Mail, Briefcase } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);

    // Password Change State
    const [pendingRequest, setPendingRequest] = useState<any>(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: ''
    });
    const [requestLoading, setRequestLoading] = useState(false);

    // Password Change State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        loadProfile();
        loadPendingRequest();
    }, []);

    const loadPendingRequest = async () => {
        try {
            const request = await userService.getPendingRequest();
            setPendingRequest(request);
        } catch (error) {
            console.error('Error loading pending request:', error);
        }
    };

    const loadProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(data);
                setFormData({
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    email: user.email || '',
                    phone_number: data.phone_number || ''
                });
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setRequestLoading(true);
        try {
            // Check if changes were made
            const hasChanges =
                formData.first_name !== (profile?.first_name || '') ||
                formData.last_name !== (profile?.last_name || '') ||
                formData.email !== (user?.email || '') ||
                formData.phone_number !== (profile?.phone_number || '');

            if (!hasChanges) {
                alert('No changes detected');
                return;
            }

            await userService.createProfileChangeRequest(formData);
            alert('Profile update request submitted for approval');
            loadPendingRequest();
        } catch (error: any) {
            console.error('Failed to submit request', error);
            alert(error.message || 'Failed to submit request');
        } finally {
            setRequestLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            alert("Passwords don't match");
            return;
        }

        setPasswordLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            alert('Password updated successfully');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Failed to update password', error);
            alert(error.message || 'Failed to update password');
        } finally {
            setPasswordLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-[#A2A1A8]">Loading profile...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-[#16151C] dark:text-white font-semibold text-xl">My Profile</h1>
                <p className="text-[#A2A1A8] font-light text-sm">Manage your personal information and security</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] p-6 space-y-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mb-4 overflow-hidden">
                                <Avatar className="h-full w-full">
                                    <AvatarImage src="https://github.com/shadcn.png" alt={profile?.first_name} />
                                    <AvatarFallback>{profile?.first_name?.[0]}{profile?.last_name?.[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                            <h2 className="text-xl font-semibold text-[#16151C] dark:text-white">
                                {profile?.first_name} {profile?.last_name}
                            </h2>
                            <p className="text-[#A2A1A8] font-light">{profile?.role === 'admin' ? 'Administrator' : 'Staff Member'}</p>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-[rgba(162,161,168,0.1)]">
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="text-[#A2A1A8]" size={18} />
                                <span className="text-[#16151C] dark:text-white">{user?.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Briefcase className="text-[#A2A1A8]" size={18} />
                                <span className="text-[#16151C] dark:text-white capitalize">{profile?.role}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <User className="text-[#A2A1A8]" size={18} />
                                <span className="text-[#16151C] dark:text-white">Member since {new Date(user?.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Forms Section */}
                <div className="md:col-span-2 space-y-6">
                    {/* Personal Information */}
                    <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <User className="text-[#7152F3]" size={24} />
                                <div>
                                    <h3 className="text-[#16151C] dark:text-white font-semibold">Personal Information</h3>
                                    <p className="text-sm text-[#A2A1A8] font-light">Update your personal details</p>
                                </div>
                            </div>
                            {pendingRequest && (
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                    Update Pending Approval
                                </span>
                            )}
                        </div>

                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">First Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        disabled={!!pendingRequest}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7152F3] bg-transparent text-[#16151C] dark:text-white disabled:opacity-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Last Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        disabled={!!pendingRequest}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7152F3] bg-transparent text-[#16151C] dark:text-white disabled:opacity-50"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        disabled={!!pendingRequest}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7152F3] bg-transparent text-[#16151C] dark:text-white disabled:opacity-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={formData.phone_number}
                                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                        disabled={!!pendingRequest}
                                        placeholder="+1 (555) 000-0000"
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7152F3] bg-transparent text-[#16151C] dark:text-white disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            {!pendingRequest && (
                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={requestLoading}
                                        className="px-6 py-2 bg-[#7152F3] text-white rounded-[10px] hover:bg-[rgba(113,82,243,0.9)] transition-colors font-light disabled:opacity-50"
                                    >
                                        {requestLoading ? 'Submitting...' : 'Request Changes'}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Security Settings */}
                    <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Shield className="text-[#7152F3]" size={24} />
                            <div>
                                <h3 className="text-[#16151C] dark:text-white font-semibold">Security Settings</h3>
                                <p className="text-sm text-[#A2A1A8] font-light">Update your password and security preferences</p>
                            </div>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">New Password</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7152F3] bg-transparent text-[#16151C] dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-700 dark:text-[#A2A1A8] mb-2">Confirm New Password</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-[rgba(162,161,168,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7152F3] bg-transparent text-[#16151C] dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    className="px-6 py-2 bg-[#7152F3] text-white rounded-[10px] hover:bg-[rgba(113,82,243,0.9)] transition-colors font-light disabled:opacity-50"
                                >
                                    {passwordLoading ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
