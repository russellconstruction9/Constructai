import React, { useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card, { CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import { PROJECTS, INITIAL_ESTIMATE } from '../constants';
import { CostCategory } from '../types';
import { NotebookPenIcon, WrenchIcon } from './Icons';

const ProjectDetail: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const project = PROJECTS.find(p => p.id === Number(projectId));

    const daysRemaining = useMemo(() => {
        if (!project || project.status === 'Completed') return 0;
        const endDate = new Date(project.endDate);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }, [project]);

    const financialData = useMemo(() => {
        // In a real app, you'd fetch the actual estimate for this project.
        // We'll use the demo estimate if the project ID matches.
        if (!project || project.id !== INITIAL_ESTIMATE.projectId) {
            return [];
        }

        const breakdown: Record<CostCategory, { estimated: number, actual: number }> = {
            'Labor': { estimated: 0, actual: 0 },
            'Material': { estimated: 0, actual: 0 },
            'Subcontractor': { estimated: 0, actual: 0 },
            'Equipment': { estimated: 0, actual: 0 },
            'Other': { estimated: 0, actual: 0 },
        };

        INITIAL_ESTIMATE.lineItems.forEach(item => {
            breakdown[item.category].estimated += item.total;
            breakdown[item.category].actual += item.actualCost || 0;
        });

        return (Object.keys(breakdown) as CostCategory[]).map(category => ({
            name: category,
            Estimated: breakdown[category].estimated,
            Actual: breakdown[category].actual,
        })).filter(d => d.Estimated > 0 || d.Actual > 0);

    }, [project]);


    if (!project) {
        return <Navigate to="/projects" replace />;
    }

    return (
        <div className="space-y-6">
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{project.client}</h1>
                    <p className="text-md text-slate-500 dark:text-slate-400">{project.address}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Link to="/estimate-builder">
                        <Button variant="secondary">
                            <NotebookPenIcon className="w-4 h-4 mr-2" /> View Estimate
                        </Button>
                    </Link>
                    <Link to="/job-costing">
                         <Button>
                             <WrenchIcon className="w-4 h-4 mr-2" /> Manage Job Costs
                        </Button>
                    </Link>
                </div>
            </div>

            {/* --- KPI CARDS --- */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader><CardTitle>Status</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{project.status}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{project.status === 'In Progress' ? `${daysRemaining} days remaining` : `Completed on ${project.endDate}`}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Budget vs. Actual</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-emerald-600">${project.actual.toLocaleString()}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">of ${project.budget.toLocaleString()} Budgeted</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Profit Margin</CardTitle></CardHeader>
                    <CardContent>
                         <p className={`text-2xl font-bold ${project.margin >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {project.margin.toFixed(1)}%
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                           {project.budget - project.actual >= 0 ? 'Profit' : 'Loss'}: ${(project.budget - project.actual).toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Project Timeline</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-lg font-semibold">{project.startDate}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">to {project.endDate}</p>
                    </CardContent>
                </Card>
            </div>
            
            {/* --- CHARTS & ACTIVITY --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle>Financial Breakdown</CardTitle></CardHeader>
                    <CardContent className="h-80">
                         {financialData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={financialData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100, 116, 139, 0.3)" />
                                    <XAxis dataKey="name" stroke="rgb(100 116 139)" />
                                    <YAxis stroke="rgb(100 116 139)" />
                                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} cursor={{fill: 'rgba(100, 116, 139, 0.1)'}} />
                                    <Legend />
                                    <Bar dataKey="Estimated" fill="#3b82f6" />
                                    <Bar dataKey="Actual" fill="#10b981" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500">
                                No financial data linked to this project.
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
                    <CardContent className="h-80 overflow-y-auto">
                        <ul className="space-y-4">
                            {project.activity.map((item, index) => (
                                <li key={index} className="flex space-x-3">
                                    <div className="flex-shrink-0">
                                        <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                                            {new Date(item.date).getDate()}
                                            <span className="absolute text-xs -top-1">{new Date(item.date).toLocaleString('default', { month: 'short' })}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-700 dark:text-slate-300">{item.description}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.date}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProjectDetail;