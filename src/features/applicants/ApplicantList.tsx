import { useEffect, useState } from 'react';
import { applicantService } from '@/services/applicantService';
import type { Applicant } from '@/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { Search, Mail, Phone, FileText } from 'lucide-react';
import { SlideOver } from '@/components/ui/SlideOver';

export function ApplicantList() {
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI States
    const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterRole, setFilterRole] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadApplicants();
    }, []);

    const loadApplicants = async () => {
        try {
            const data = await applicantService.getApplicants();
            setApplicants(data);
        } catch (err) {
            setError('Failed to load applicants');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredApplicants = applicants.filter(applicant => {
        const matchesStatus = filterStatus === 'all' || applicant.status === filterStatus;
        const matchesRole = filterRole === 'all' || applicant.position_applied === filterRole;
        const fullName = `${applicant.first_name} ${applicant.last_name}`.toLowerCase();
        const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
            applicant.email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesRole && matchesSearch;
    });

    if (loading) return <div className="p-8 text-center text-[#A2A1A8]">Loading applicants...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[#16151C] dark:text-white font-semibold text-xl">Applicants</h1>
                    <p className="text-[#A2A1A8] font-light text-sm">Manage pre-hire applicants from Airtable</p>
                </div>
                <button className="px-4 py-2 bg-[#7152F3] text-white rounded-[10px] hover:bg-[rgba(113,82,243,0.9)] transition-colors font-light">
                    Sync from Airtable
                </button>
            </div>

            {/* Filters & Search */}
            <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A2A1A8]" size={18} strokeWidth={1.5} />
                            <input
                                type="text"
                                placeholder="Search applicants..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-[rgba(162,161,168,0.1)] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#7152F3] text-[#16151C] dark:text-white bg-transparent font-light"
                            />
                        </div>
                    </div>

                    {/* Role Filter */}
                    <div>
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="w-full px-4 py-2 border border-[rgba(162,161,168,0.1)] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#7152F3] text-[#16151C] dark:text-white bg-transparent font-light"
                        >
                            <option value="all">All Roles</option>
                            <option value="Caregiver">Caregiver</option>
                            <option value="Nurse">Nurse</option>
                            <option value="CNA">CNA</option>
                            <option value="HHA">HHA</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-4 py-2 border border-[rgba(162,161,168,0.1)] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#7152F3] text-[#16151C] dark:text-white bg-transparent font-light"
                        >
                            <option value="all">All Statuses</option>
                            <option value="New">New</option>
                            <option value="Screening">Screening</option>
                            <option value="Interview">Interview</option>
                            <option value="Offer">Offer</option>
                            <option value="Hired">Hired</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Applicants Table */}
            <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[rgba(162,161,168,0.02)] border-b border-[rgba(162,161,168,0.1)]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs text-[#A2A1A8] uppercase tracking-wider font-light">
                                    Applicant Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs text-[#A2A1A8] uppercase tracking-wider font-light">
                                    Position
                                </th>
                                <th className="px-6 py-3 text-left text-xs text-[#A2A1A8] uppercase tracking-wider font-light">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs text-[#A2A1A8] uppercase tracking-wider font-light">
                                    Date Applied
                                </th>
                                <th className="px-6 py-3 text-left text-xs text-[#A2A1A8] uppercase tracking-wider font-light">
                                    Source
                                </th>
                                <th className="px-6 py-3 text-left text-xs text-[#A2A1A8] uppercase tracking-wider font-light">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(162,161,168,0.05)]">
                            {filteredApplicants.map((applicant) => (
                                <tr
                                    key={applicant.id}
                                    className="hover:bg-[rgba(113,82,243,0.02)] transition-colors cursor-pointer"
                                    onClick={() => setSelectedApplicant(applicant)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[#16151C] dark:text-white font-light">
                                                {applicant.first_name} {applicant.last_name}
                                            </span>
                                            <span className="text-xs text-[#A2A1A8]">{applicant.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[#16151C] dark:text-white font-light">{applicant.position_applied}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={applicant.status} size="sm" />
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[#16151C] dark:text-white font-light">
                                            {format(new Date(applicant.created_at), 'MMM d, yyyy')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[#16151C] dark:text-white font-light">JotForm</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedApplicant(applicant);
                                            }}
                                            className="text-[#7152F3] hover:text-[rgba(113,82,243,0.8)] font-light"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredApplicants.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-[#A2A1A8] font-light">
                                        No applicants found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Applicant Detail Drawer */}
            <SlideOver
                isOpen={!!selectedApplicant}
                onClose={() => setSelectedApplicant(null)}
                title="Applicant Details"
                width="lg"
            >
                {selectedApplicant && (
                    <div className="space-y-6">
                        {/* Contact Info */}
                        <div>
                            <h3 className="text-[#16151C] dark:text-white text-lg font-semibold mb-4">
                                {selectedApplicant.first_name} {selectedApplicant.last_name}
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-[#A2A1A8]">
                                    <Mail size={18} />
                                    <span className="text-[#16151C] dark:text-white font-light">{selectedApplicant.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[#A2A1A8]">
                                    <Phone size={18} />
                                    <span className="text-[#16151C] dark:text-white font-light">{selectedApplicant.phone}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[#A2A1A8]">
                                    <FileText size={18} />
                                    <span className="text-[#16151C] dark:text-white font-light">{selectedApplicant.position_applied}</span>
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <h4 className="text-[#16151C] dark:text-white font-medium mb-2">Current Status</h4>
                            <StatusBadge status={selectedApplicant.status} />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t border-[rgba(162,161,168,0.1)]">
                            <button className="flex-1 px-4 py-2 bg-[#22C55E] text-white rounded-[10px] hover:bg-[rgba(34,197,94,0.9)] transition-colors font-light">
                                Accept
                            </button>
                            <button className="flex-1 px-4 py-2 bg-[#EF4444] text-white rounded-[10px] hover:bg-[rgba(239,68,68,0.9)] transition-colors font-light">
                                Reject
                            </button>
                            <button className="flex-1 px-4 py-2 bg-[#7152F3] text-white rounded-[10px] hover:bg-[rgba(113,82,243,0.9)] transition-colors font-light">
                                Advance Status
                            </button>
                        </div>
                    </div>
                )}
            </SlideOver>
        </div>
    );
}
