import React, { useState } from 'react';
import Card, { CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import { USERS } from '../constants';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { User, PermissionLevel, Permissions } from '../types';

const PERMISSION_MODULES: { key: keyof Permissions, name: string }[] = [
    { key: 'dashboard', name: 'Dashboard' },
    { key: 'projects', name: 'Projects' },
    { key: 'estimateBuilder', name: 'Estimate Builder' },
    { key: 'jobCosting', name: 'Job Costing' },
    { key: 'knowledgeBase', name: 'Knowledge Base' },
    { key: 'analytics', name: 'Analytics' },
];

const PermissionControl: React.FC<{
    permission: PermissionLevel;
    onChange: (level: PermissionLevel) => void;
}> = ({ permission, onChange }) => (
    <select 
        value={permission} 
        onChange={(e) => onChange(e.target.value as PermissionLevel)}
        className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
    >
        <option value="edit">Edit</option>
        <option value="view">View</option>
        <option value="none">None</option>
    </select>
);


const UserManagement: React.FC = () => {
    const { user } = useCurrentUser();
    const [users, setUsers] = useState<User[]>(USERS);
    const [hasChanges, setHasChanges] = useState(false);

    const handlePermissionChange = (userId: number, module: keyof Permissions, level: PermissionLevel) => {
        setUsers(currentUsers =>
            currentUsers.map(u => {
                if (u.id === userId) {
                    return {
                        ...u,
                        permissions: {
                            ...u.permissions,
                            [module]: level,
                        },
                    };
                }
                return u;
            })
        );
        setHasChanges(true);
    };

    const handleSaveChanges = () => {
        // In a real app, this would be an API call:
        // await api.users.updatePermissions(users);
        console.log("Saving updated user permissions:", users);
        setHasChanges(false);
        alert("User permissions have been saved!");
    };
    
    if (user?.role !== 'Admin') {
        return (
            <Card>
                <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
                <CardContent>
                    <p>You do not have permission to view this page. Please contact an administrator.</p>
                </CardContent>
            </Card>
        );
    }

    return (
         <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <CardTitle>User & Permission Management</CardTitle>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Control what employees can see and do within the app.</p>
                    </div>
                    {hasChanges && (
                        <Button onClick={handleSaveChanges}>Save Changes</Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {users.map((u) => (
                         <div key={u.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow border dark:border-slate-200 dark:border-slate-700">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{u.name}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{u.email}</p>
                                </div>
                                {/* FIX: Removed duplicate className attribute. */}
                                <div
                                    className={`mt-2 sm:mt-0 px-3 py-1 text-sm font-medium rounded-full ${u.role === 'Admin' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'}`}
                                >
                                    {u.role}
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t dark:border-slate-600">
                                <h4 className="text-sm font-semibold mb-3 text-slate-600 dark:text-slate-300">Module Permissions</h4>
                                {u.role === 'Admin' ? (
                                    <p className="text-sm text-slate-500 italic">Administrators have full edit access to all modules.</p>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {PERMISSION_MODULES.map(module => (
                                            <div key={module.key}>
                                                <label className="block mb-1 text-xs font-medium text-slate-700 dark:text-slate-400">{module.name}</label>
                                                <PermissionControl
                                                    permission={u.permissions[module.key]}
                                                    onChange={(level) => handlePermissionChange(u.id, module.key, level)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                         </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default UserManagement;