import React, { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { HomeIcon, FolderKanbanIcon, NotebookPenIcon, WrenchIcon, LibraryIcon, BarChart3Icon, UsersIcon, MenuIcon, XIcon, WandSparklesIcon } from './Icons';
import AIAssist from './AIAssist';
// FIX: Imported USERS constant to fix reference error in user switcher.
import { USER_ROLES, INITIAL_ESTIMATE, USERS } from '../constants';
import { Estimate, LineItem, PermissionLevel } from '../types';

// --- Estimate Context for sharing state between Builder and AI Agent ---
interface EstimateContextType {
  estimate: Estimate;
  setEstimate: React.Dispatch<React.SetStateAction<Estimate>>;
  addLineItem: (item: Omit<LineItem, 'id' | 'total'>) => void;
}

export const EstimateContext = createContext<EstimateContextType | null>(null);
export const useEstimate = () => useContext(EstimateContext);

const EstimateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [estimate, setEstimate] = useState<Estimate>(INITIAL_ESTIMATE);
    const location = useLocation();

    // Reset estimate state when navigating away from the builder
    useEffect(() => {
        if (location.pathname !== '/estimate-builder') {
            setEstimate(INITIAL_ESTIMATE);
        }
    }, [location.pathname]);
    
    const addLineItem = (item: Omit<LineItem, 'id' | 'total'>) => {
        setEstimate(prev => {
            const newItem: LineItem = {
                ...item,
                id: `li-${Date.now()}-${Math.random()}`,
                total: item.quantity * item.unitCost,
            };
            return { ...prev, lineItems: [...prev.lineItems, newItem] };
        });
    };

    return (
        <EstimateContext.Provider value={{ estimate, setEstimate, addLineItem }}>
            {children}
        </EstimateContext.Provider>
    );
};
// --- End Estimate Context ---

const navigationLinks = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, permissionKey: 'dashboard' },
  { name: 'Projects', href: '/projects', icon: FolderKanbanIcon, permissionKey: 'projects' },
  { name: 'Estimate Builder', href: '/estimate-builder', icon: NotebookPenIcon, permissionKey: 'estimateBuilder' },
  { name: 'Job Costing', href: '/job-costing', icon: WrenchIcon, permissionKey: 'jobCosting' },
  { name: 'Knowledge Base', href: '/knowledge-base', icon: LibraryIcon, permissionKey: 'knowledgeBase' },
  { name: 'Analytics', href: '/analytics', icon: BarChart3Icon, permissionKey: 'analytics' },
  { name: 'User Management', href: '/user-management', icon: UsersIcon, permissionKey: 'admin' }, // Special key for admin only
];

const Sidebar: React.FC<{ isOpen: boolean; closeSidebar: () => void }> = ({ isOpen, closeSidebar }) => {
  const { user } = useCurrentUser();
  
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-emerald-600 text-white'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
    }`;

  return (
    <aside className={`fixed inset-y-0 left-0 bg-white dark:bg-slate-800 z-30 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} border-r dark:border-slate-700`}>
        <div className="flex items-center justify-between h-16 px-4 border-b dark:border-slate-700">
            <div className="flex items-center text-emerald-600 dark:text-emerald-500">
                <WandSparklesIcon className="h-8 w-8" />
                <span className="ml-2 text-xl font-bold text-slate-800 dark:text-slate-200">ConstructAI</span>
            </div>
             <button onClick={closeSidebar} className="md:hidden text-slate-500 dark:text-slate-400">
                <XIcon className="h-6 w-6"/>
            </button>
        </div>
        <nav className="p-4 space-y-2">
            {user && navigationLinks
                .filter(link => {
                    if (link.permissionKey === 'admin') {
                        return user.role === 'Admin';
                    }
                    // The key must exist on the permissions object and not be 'none'
                    return user.permissions[link.permissionKey as keyof typeof user.permissions] !== 'none';
                })
                .map((item) => (
                <NavLink key={item.name} to={item.href} className={navLinkClass} end onClick={closeSidebar}>
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                </NavLink>
            ))}
        </nav>
    </aside>
  );
};

const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
    const { user, switchUser } = useCurrentUser();
    const location = useLocation();
    const pageTitle = navigationLinks.find(link => link.href === location.pathname)?.name || 'Dashboard';
    
    return (
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b dark:border-slate-700">
            <div className="flex items-center justify-between h-16 px-4 md:px-6">
                <div className="flex items-center">
                    <button onClick={onMenuClick} className="md:hidden mr-4 text-slate-600 dark:text-slate-300">
                        <MenuIcon className="h-6 w-6"/>
                    </button>
                    <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{pageTitle}</h1>
                </div>
                <div className="flex items-center space-x-4">
                     <select 
                        value={user?.id} 
                        onChange={(e) => switchUser(Number(e.target.value))} 
                        className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-1.5 text-sm text-slate-800 dark:text-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                        aria-label="Switch user"
                     >
                        {USER_ROLES.map(role => (
                            <optgroup key={role} label={role}>
                                {USERS.filter(u => u.role === role).map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>

                    <div className="flex items-center">
                        <div className="hidden sm:block text-right">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{user?.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{user?.role}</p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <EstimateProvider>
            <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
            <AIAssist />
        </EstimateProvider>
    </div>
  );
};

export default Layout;