import { useEffect, useState } from 'react';
import { employeeService } from '@/services/employeeService';
import { wordpressService } from '@/services/wordpressService';
import type { Employee } from '@/types';
import type { CourseProgress } from '@/types/wordpress';
import { format } from 'date-fns';
import { Search, Mail, Phone, MapPin, Calendar, Building, MoreHorizontal, BookOpen } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SlideOver } from '@/components/ui/SlideOver';

export function EmployeeList() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI States
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
    const [loadingProgress, setLoadingProgress] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDept, setFilterDept] = useState('all');

    useEffect(() => {
        loadEmployees();
    }, []);

    useEffect(() => {
        if (selectedEmployee?.wp_user_id) {
            loadCourseProgress(selectedEmployee.wp_user_id);
        } else {
            setCourseProgress([]);
        }
    }, [selectedEmployee]);

    const loadEmployees = async () => {
        try {
            const data = await employeeService.getEmployees();
            setEmployees(data);
        } catch (err) {
            setError('Failed to load employees');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadCourseProgress = async (userId: number) => {
        setLoadingProgress(true);
        try {
            const progress = await wordpressService.getCourseProgress(userId);
            setCourseProgress(progress);
        } catch (err) {
            console.error('Failed to load course progress', err);
        } finally {
            setLoadingProgress(false);
        }
    };

    const filteredEmployees = employees.filter(employee => {
        const matchesStatus = filterStatus === 'all' || employee.status === filterStatus;
        const matchesSearch =
            `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.email.toLowerCase().includes(searchTerm.toLowerCase());
        // Note: Department filtering would go here if we had department data
        return matchesStatus && matchesSearch;
    });

    if (loading) return <div className="p-8 text-center text-[#A2A1A8]">Loading employees...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[#16151C] dark:text-white font-semibold text-xl">Employees</h1>
                    <p className="text-[#A2A1A8] font-light text-sm">Manage your team members and their roles</p>
                </div>
                <button className="px-4 py-2 bg-[#7152F3] text-white rounded-[10px] hover:bg-[rgba(113,82,243,0.9)] transition-colors font-light">
                    Add Employee
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
                                placeholder="Search employees..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-[rgba(162,161,168,0.1)] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#7152F3] text-[#16151C] dark:text-white bg-transparent font-light"
                            />
                        </div>
                    </div>

                    {/* Department Filter */}
                    <div>
                        <select
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                            className="w-full px-4 py-2 border border-[rgba(162,161,168,0.1)] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#7152F3] text-[#16151C] dark:text-white bg-transparent font-light"
                        >
                            <option value="all">All Departments</option>
                            <option value="Nursing">Nursing</option>
                            <option value="Care">Care</option>
                            <option value="Admin">Admin</option>
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
                            <option value="Active">Active</option>
                            <option value="Onboarding">Onboarding</option>
                            <option value="Suspended">Suspended</option>
                            <option value="Terminated">Terminated</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Employees Table */}
            <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[rgba(162,161,168,0.02)] border-b border-[rgba(162,161,168,0.1)]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs text-[#A2A1A8] uppercase tracking-wider font-light">
                                    Employee Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs text-[#A2A1A8] uppercase tracking-wider font-light">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs text-[#A2A1A8] uppercase tracking-wider font-light">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs text-[#A2A1A8] uppercase tracking-wider font-light">
                                    Start Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs text-[#A2A1A8] uppercase tracking-wider font-light">
                                    Department
                                </th>
                                <th className="px-6 py-3 text-left text-xs text-[#A2A1A8] uppercase tracking-wider font-light">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(162,161,168,0.05)]">
                            {filteredEmployees.map((employee) => (
                                <tr
                                    key={employee.id}
                                    className="hover:bg-[rgba(113,82,243,0.02)] transition-colors cursor-pointer"
                                    onClick={() => setSelectedEmployee(employee)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-[rgba(113,82,243,0.1)] flex items-center justify-center text-[#7152F3]">
                                                {employee.first_name[0]}{employee.last_name[0]}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[#16151C] dark:text-white font-light">
                                                    {employee.first_name} {employee.last_name}
                                                </span>
                                                <span className="text-xs text-[#A2A1A8]">{employee.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[#16151C] dark:text-white font-light">{employee.position}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={employee.status} size="sm" />
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[#16151C] dark:text-white font-light">
                                            {employee.start_date ? format(new Date(employee.start_date), 'MMM d, yyyy') : '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[#16151C] dark:text-white font-light">Nursing</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="text-[#A2A1A8] hover:text-[#7152F3] transition-colors">
                                            <MoreHorizontal size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredEmployees.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-[#A2A1A8] font-light">
                                        No employees found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Employee Detail Drawer */}
            <SlideOver
                isOpen={!!selectedEmployee}
                onClose={() => setSelectedEmployee(null)}
                title="Employee Profile"
                width="lg"
            >
                {selectedEmployee && (
                    <div className="space-y-8">
                        {/* Header Profile */}
                        <div className="flex items-center gap-4 pb-6 border-b border-[rgba(162,161,168,0.1)]">
                            <div className="h-20 w-20 rounded-full bg-[rgba(113,82,243,0.1)] flex items-center justify-center text-[#7152F3] text-2xl font-light">
                                {selectedEmployee.first_name[0]}{selectedEmployee.last_name[0]}
                            </div>
                            <div>
                                <h3 className="text-[#16151C] dark:text-white text-xl font-semibold">
                                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                                </h3>
                                <p className="text-[#A2A1A8] font-light">{selectedEmployee.position}</p>
                                <div className="mt-2">
                                    <StatusBadge status={selectedEmployee.status} size="sm" />
                                </div>
                            </div>
                        </div>

                        {/* Training Progress (New Section) */}
                        <div>
                            <h4 className="text-[#16151C] dark:text-white font-medium mb-4 flex items-center gap-2">
                                <BookOpen size={18} className="text-[#7152F3]" />
                                Training Progress
                            </h4>
                            {loadingProgress ? (
                                <div className="text-sm text-[#A2A1A8]">Loading progress...</div>
                            ) : courseProgress.length > 0 ? (
                                <div className="space-y-4">
                                    {courseProgress.map((course) => (
                                        <div key={course.course_id} className="p-4 bg-[rgba(162,161,168,0.02)] rounded-[10px] border border-[rgba(162,161,168,0.1)]">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[#16151C] dark:text-white font-medium text-sm">Course #{course.course_id}</span>
                                                <span className={`text-xs px-2 py-1 rounded-full ${course.status === 'completed'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    }`}>
                                                    {course.status === 'completed' ? 'Completed' : 'In Progress'}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                                                <div
                                                    className="bg-[#7152F3] h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${course.percentage}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between text-xs text-[#A2A1A8]">
                                                <span>{course.steps_completed} / {course.steps_total} steps</span>
                                                <span>{course.percentage}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 bg-[rgba(162,161,168,0.02)] rounded-[10px] border border-[rgba(162,161,168,0.1)] text-center">
                                    <p className="text-sm text-[#A2A1A8]">No training data available.</p>
                                    {!selectedEmployee.wp_user_id && (
                                        <p className="text-xs text-red-400 mt-1">Employee not synced to WordPress.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Contact Information */}
                        <div>
                            <h4 className="text-[#16151C] dark:text-white font-medium mb-4">Contact Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-[rgba(162,161,168,0.02)] rounded-[10px] border border-[rgba(162,161,168,0.1)]">
                                    <div className="flex items-center gap-3 text-[#A2A1A8] mb-1">
                                        <Mail size={16} />
                                        <span className="text-xs uppercase tracking-wider">Email</span>
                                    </div>
                                    <p className="text-[#16151C] dark:text-white font-light">{selectedEmployee.email}</p>
                                </div>
                                <div className="p-4 bg-[rgba(162,161,168,0.02)] rounded-[10px] border border-[rgba(162,161,168,0.1)]">
                                    <div className="flex items-center gap-3 text-[#A2A1A8] mb-1">
                                        <Phone size={16} />
                                        <span className="text-xs uppercase tracking-wider">Phone</span>
                                    </div>
                                    <p className="text-[#16151C] dark:text-white font-light">(555) 123-4567</p>
                                </div>
                            </div>
                        </div>

                        {/* Employment Details */}
                        <div>
                            <h4 className="text-[#16151C] dark:text-white font-medium mb-4">Employment Details</h4>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-[rgba(162,161,168,0.02)] rounded-[10px] border border-[rgba(162,161,168,0.1)]">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="text-[#A2A1A8]" size={20} />
                                        <div>
                                            <p className="text-xs text-[#A2A1A8] uppercase tracking-wider">Start Date</p>
                                            <p className="text-[#16151C] dark:text-white font-light">
                                                {selectedEmployee.start_date ? format(new Date(selectedEmployee.start_date), 'MMMM d, yyyy') : '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-[rgba(162,161,168,0.02)] rounded-[10px] border border-[rgba(162,161,168,0.1)]">
                                    <div className="flex items-center gap-3">
                                        <Building className="text-[#A2A1A8]" size={20} />
                                        <div>
                                            <p className="text-xs text-[#A2A1A8] uppercase tracking-wider">Department</p>
                                            <p className="text-[#16151C] dark:text-white font-light">Nursing</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-[rgba(162,161,168,0.02)] rounded-[10px] border border-[rgba(162,161,168,0.1)]">
                                    <div className="flex items-center gap-3">
                                        <MapPin className="text-[#A2A1A8]" size={20} />
                                        <div>
                                            <p className="text-xs text-[#A2A1A8] uppercase tracking-wider">Location</p>
                                            <p className="text-[#16151C] dark:text-white font-light">Main Branch</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t border-[rgba(162,161,168,0.1)]">
                            <button className="flex-1 px-4 py-2 bg-[#7152F3] text-white rounded-[10px] hover:bg-[rgba(113,82,243,0.9)] transition-colors font-light">
                                Edit Profile
                            </button>
                            <button className="flex-1 px-4 py-2 bg-white dark:bg-card border border-[rgba(162,161,168,0.2)] text-[#EF4444] rounded-[10px] hover:bg-[rgba(239,68,68,0.05)] transition-colors font-light">
                                Terminate Employment
                            </button>
                        </div>
                    </div>
                )}
            </SlideOver>
        </div>
    );
}
