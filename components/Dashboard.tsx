import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import Card, { CardContent, CardHeader, CardTitle } from './ui/Card';
import { PROJECTS } from '../constants';

const summaryData = {
    activeProjects: PROJECTS.filter(p => p.status === 'In Progress').length,
    totalEstimated: PROJECTS.reduce((sum, p) => sum + p.budget, 0),
    totalActual: PROJECTS.reduce((sum, p) => sum + p.actual, 0),
    openChangeOrders: 3,
};

const costBreakdownData = [
  { name: 'Labor', value: 40000 },
  { name: 'Materials', value: 65000 },
  { name: 'Subcontractors', value: 15000 },
  { name: 'Equipment', value: 5000 },
];
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const costOverrunsData = [
  { name: 'Framing', overrun: 2500 },
  { name: 'Plumbing', overrun: -500 },
  { name: 'Electrical', overrun: 1200 },
  { name: 'Drywall', overrun: 800 },
  { name: 'Painting', overrun: -200 },
];


const Dashboard: React.FC = () => {
    const profitMargin = ((summaryData.totalEstimated - summaryData.totalActual) / summaryData.totalEstimated) * 100;

    return (
        <div className="space-y-6">
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader><CardTitle>Active Projects</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold">{summaryData.activeProjects}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Estimated vs Actual</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-emerald-600">${summaryData.totalActual.toLocaleString()}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">of ${summaryData.totalEstimated.toLocaleString()} Budgeted</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Overall Profit Margin</CardTitle></CardHeader>
                    <CardContent>
                        <p className={`text-3xl font-bold ${profitMargin > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {profitMargin.toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Open Change Orders</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold">{summaryData.openChangeOrders}</p></CardContent>
                </Card>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Cost Breakdown</CardTitle></CardHeader>
                    <CardContent className="h-80">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={costBreakdownData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {costBreakdownData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`}/>
                                <Legend/>
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Top Cost Overruns</CardTitle></CardHeader>
                     <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={costOverrunsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100, 116, 139, 0.3)" />
                                <XAxis dataKey="name" stroke="rgb(100 116 139)" />
                                <YAxis stroke="rgb(100 116 139)" />
                                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} cursor={{fill: 'rgba(100, 116, 139, 0.1)'}} />
                                <Legend />
                                <Bar dataKey="overrun" name="Overrun Amount" fill="#ef4444" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader><CardTitle>Project Profitability Over Time</CardTitle></CardHeader>
                <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={PROJECTS.filter(p => p.status === 'Completed')} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100, 116, 139, 0.3)"/>
                            <XAxis dataKey="client" stroke="rgb(100 116 139)" angle={-15} textAnchor="end" height={50}/>
                            <YAxis stroke="rgb(100 116 139)" unit="%"/>
                            <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                            <Legend />
                            <Line type="monotone" dataKey="margin" name="Profit Margin" stroke="#10b981" strokeWidth={2} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};

export default Dashboard;