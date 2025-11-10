import React from 'react';
import { useState, useMemo, useEffect } from 'react';
import Card, { CardContent, CardHeader, CardTitle } from './ui/Card';
import { PROJECTS, INITIAL_ESTIMATE } from '../constants';
import { LineItem } from '../types';
import { useCurrentUser } from '../hooks/useCurrentUser';

const JobCosting: React.FC = () => {
    const [selectedProjectName, setSelectedProjectName] = useState(PROJECTS[1].client);
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const { user } = useCurrentUser();
    const canEdit = user?.permissions.jobCosting === 'edit';

    useEffect(() => {
        if (selectedProjectName === INITIAL_ESTIMATE.projectName) {
            const itemsWithActuals = INITIAL_ESTIMATE.lineItems.map(item => ({
                ...item,
                actualCost: item.actualCost ?? 0,
            }));
            setLineItems(itemsWithActuals);
        } else {
            setLineItems([]);
        }
    }, [selectedProjectName]);

    const handleActualCostChange = (itemId: string, cost: number) => {
        if (!canEdit) return;
        setLineItems(prevItems =>
            prevItems.map(item =>
                item.id === itemId ? { ...item, actualCost: isNaN(cost) ? 0 : cost } : item
            )
        );
    };

    const { totalEstimated, totalActual, totalVariance } = useMemo(() => {
        const estimated = lineItems.reduce((acc, item) => acc + item.total, 0);
        const actual = lineItems.reduce((acc, item) => acc + (item.actualCost || 0), 0);
        return {
            totalEstimated: estimated,
            totalActual: actual,
            totalVariance: estimated - actual,
        };
    }, [lineItems]);
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                         <div>
                            <CardTitle>Job Costing: Estimate vs. Actuals</CardTitle>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track real-time costs against your original estimate.</p>
                        </div>
                        <div className="flex items-center space-x-2">
                             <label htmlFor="project-select" className="text-sm font-medium">Project:</label>
                             <select 
                                id="project-select"
                                className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                value={selectedProjectName}
                                onChange={(e) => setSelectedProjectName(e.target.value)}
                            >
                                {PROJECTS.map(p => <option key={p.id}>{p.client}</option>)}
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto hidden md:block">
                        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Description</th>
                                    <th scope="col" className="px-6 py-3">Category</th>
                                    <th scope="col" className="px-6 py-3 text-right">Estimated Total</th>
                                    <th scope="col" className="px-6 py-3 text-center w-48">Actual Cost</th>
                                    <th scope="col" className="px-6 py-3 text-right">Variance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lineItems.map((item) => {
                                    const variance = item.total - (item.actualCost || 0);
                                    return (
                                        <tr key={item.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{item.description}</td>
                                            <td className="px-6 py-4">{item.category}</td>
                                            <td className="px-6 py-4 text-right">${item.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                            <td className="px-6 py-2">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                                    <input
                                                        type="number"
                                                        value={item.actualCost || ''}
                                                        onChange={(e) => handleActualCostChange(item.id, parseFloat(e.target.value))}
                                                        className="w-full bg-slate-100 dark:bg-slate-700 p-2 pl-6 border border-slate-300 dark:border-slate-600 rounded-md text-right focus:ring-2 focus:ring-emerald-500"
                                                        placeholder="0.00"
                                                        disabled={!canEdit}
                                                    />
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-medium ${variance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {variance < 0 && '-'}${Math.abs(variance).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="space-y-4 md:hidden">
                        {lineItems.map((item) => {
                            const variance = item.total - (item.actualCost || 0);
                            return (
                                <div key={item.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow border dark:border-slate-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{item.description}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.category}</p>
                                        </div>
                                         <p className={`text-right font-medium ${variance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {variance >= 0 ? 'Under' : 'Over'}<br/>
                                            <span>{Math.abs(variance).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t dark:border-slate-700 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-500">Estimated Cost</label>
                                            <p className="font-medium">${item.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                        </div>
                                         <div>
                                            <label className="text-xs text-slate-500">Actual Cost</label>
                                             <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                                <input
                                                    type="number"
                                                    value={item.actualCost || ''}
                                                    onChange={(e) => handleActualCostChange(item.id, parseFloat(e.target.value))}
                                                    className="w-full bg-slate-100 dark:bg-slate-700 p-2 pl-6 border border-slate-300 dark:border-slate-600 rounded-md text-right focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="0.00"
                                                    disabled={!canEdit}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {lineItems.length === 0 && (
                        <div className="text-center py-10 text-slate-500">
                            <p>No estimate found for this project.</p>
                            <p className="text-sm">Select 'Jefferson Kitchen Remodel' to see a demo.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                <Card>
                    <CardHeader><CardTitle>Total Estimated</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-slate-700 dark:text-slate-300">
                            {totalEstimated.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Total Actual</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                           {totalActual.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Total Variance</CardTitle></CardHeader>
                    <CardContent>
                        <p className={`text-3xl font-bold ${totalVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                           {totalVariance < 0 && '-'}${Math.abs(totalVariance).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </p>
                         <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {totalVariance >= 0 ? 'Under Budget' : 'Over Budget'}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default JobCosting;
