import React, { useState, useEffect, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Assembly, CostCategory, LineItem } from '../types';
import { TrashIcon, PlusIcon, WandSparklesIcon } from './Icons';
import { getAIAssemblyItems, ApiKeyError } from '../services/geminiService';
import { useApiKey } from '../hooks/useApiKey';
import ApiKeyModal from './ApiKeyModal';

interface LaborCalculatorState {
    workers: number;
    days: number;
    hoursPerDay: number;
    rate: number;
}

const AssemblyBuilderModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (assembly: Assembly) => void;
    assemblyToEdit: Assembly | null;
    canEdit: boolean;
}> = ({ isOpen, onClose, onSave, assemblyToEdit, canEdit }) => {
    const [name, setName] = useState('');
    const [items, setItems] = useState<Omit<LineItem, 'id' | 'total'>[]>([]);
    const [laborCalculators, setLaborCalculators] = useState<Record<number, LaborCalculatorState>>({});
    const [isGeneratingItems, setIsGeneratingItems] = useState(false);
    const { isKeySelected, resetKeyState } = useApiKey();
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
    
    useEffect(() => {
        if (isOpen) {
            if (assemblyToEdit) {
                setName(assemblyToEdit.name);
                setItems(assemblyToEdit.items);
                const initialCalcs: Record<number, LaborCalculatorState> = {};
                assemblyToEdit.items.forEach((item, index) => {
                    if (item.category === 'Labor') {
                        initialCalcs[index] = { workers: 1, days: Math.ceil(item.quantity / 8), hoursPerDay: 8, rate: item.unitCost };
                    }
                });
                setLaborCalculators(initialCalcs);
            } else {
                setName('');
                setItems([]);
                setLaborCalculators({});
            }
        }
    }, [isOpen, assemblyToEdit]);

    const handleItemChange = (index: number, field: keyof Omit<LineItem, 'id' | 'total'>, value: any) => {
        if (!canEdit) return;
        const newItems = [...items];
        (newItems[index] as any)[field] = value;

        if (field === 'category') {
            if (value === 'Labor') {
                if (!laborCalculators[index]) {
                    setLaborCalculators(prev => ({
                        ...prev,
                        [index]: { workers: 1, days: 1, hoursPerDay: 8, rate: 50 }
                    }));
                }
            }
        }
        
        setItems(newItems);
    };

    const handleAddItem = () => {
        if (!canEdit) return;
        setItems([...items, { description: '', category: 'Material', quantity: 1, unit: 'ea', unitCost: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        if (!canEdit) return;
        setItems(items.filter((_, i) => i !== index));
        setLaborCalculators(prev => {
            const newCalcs = {...prev};
            delete newCalcs[index];
            return newCalcs;
        })
    };

    const handleLaborCalcChange = (index: number, field: keyof LaborCalculatorState, value: number) => {
        if (!canEdit) return;
        const calcState = laborCalculators[index] || { workers: 1, days: 1, hoursPerDay: 8, rate: 50 };
        const newCalcState = { ...calcState, [field]: isNaN(value) ? 0 : value };
        setLaborCalculators(prev => ({ ...prev, [index]: newCalcState }));

        const { workers, days, hoursPerDay, rate } = newCalcState;
        const totalHours = workers * days * hoursPerDay;
        
        const newItems = [...items];
        newItems[index].quantity = totalHours;
        newItems[index].unit = 'hours';
        newItems[index].unitCost = rate;
        setItems(newItems);
    };

    const handleGenerateItems = async () => {
        if (!canEdit) return;
        if (!name.trim()) {
            alert("Please provide an assembly name first.");
            return;
        }
        if (!isKeySelected) {
            setIsApiKeyModalOpen(true);
            return;
        }

        setIsGeneratingItems(true);
        try {
            const generatedItems = await getAIAssemblyItems(name);
            setItems(generatedItems);
            
            const newLaborCalcs: Record<number, LaborCalculatorState> = {};
            generatedItems.forEach((item, index) => {
                if (item.category === 'Labor') {
                    newLaborCalcs[index] = {
                        workers: 1,
                        days: Math.ceil(item.quantity / 8) || 1,
                        hoursPerDay: 8,
                        rate: item.unitCost || 50,
                    };
                }
            });
            setLaborCalculators(newLaborCalcs);

        } catch (error) {
            console.error("AI Item Generation Error:", error);
            if (error instanceof ApiKeyError) {
                resetKeyState();
                alert(error.message);
            } else if (error instanceof Error) {
                alert(error.message);
            }
        } finally {
            setIsGeneratingItems(false);
        }
    };

    const totalCost = useMemo(() => {
        return items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);
    }, [items]);

    const handleSave = () => {
        if (!canEdit) return;
        if (!name.trim()) {
            alert('Please enter an assembly name.');
            return;
        }
        const newAssembly: Assembly = {
            id: assemblyToEdit?.id || `ASM-${Date.now()}`,
            name,
            items,
            averageCost: totalCost,
            variance: assemblyToEdit?.variance || 0,
            lastUsed: new Date().toISOString().split('T')[0],
        };
        onSave(newAssembly);
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={assemblyToEdit ? 'Edit Assembly' : 'Create New Assembly'}>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="assemblyName" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Assembly Name</label>
                        <input
                            type="text"
                            id="assemblyName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                            placeholder="e.g., Standard Kitchen Cabinetry"
                            disabled={!canEdit}
                        />
                    </div>
                    <div>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2 gap-2">
                             <h4 className="text-md font-semibold">Line Items</h4>
                             {items.length === 0 && (
                                <Button variant="secondary" onClick={handleGenerateItems} disabled={!canEdit || isGeneratingItems}>
                                    <WandSparklesIcon className="h-4 w-4 mr-2"/>
                                    {isGeneratingItems ? 'Generating...' : 'Generate with AI'}
                                </Button>
                             )}
                        </div>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                            {items.length === 0 && !isGeneratingItems && (
                                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                    <p>Add a line item manually or use AI to generate them based on the assembly name.</p>
                                </div>
                            )}
                            {items.map((item, index) => (
                                <div key={index} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border dark:border-slate-700">
                                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                                        <div className="flex-grow space-y-2">
                                            <input type="text" placeholder="Description" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} className="w-full bg-white dark:bg-slate-800 p-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm" disabled={!canEdit} />
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                <select value={item.category} onChange={(e) => handleItemChange(index, 'category', e.target.value as CostCategory)} className="w-full bg-white dark:bg-slate-800 p-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm" disabled={!canEdit}>
                                                    <option>Material</option><option>Labor</option><option>Subcontractor</option><option>Equipment</option><option>Other</option>
                                                </select>
                                                <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-800 p-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm disabled:bg-slate-100 dark:disabled:bg-slate-700" disabled={!canEdit || item.category === 'Labor'} />
                                                <input type="text" placeholder="Unit" value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} className="w-full bg-white dark:bg-slate-800 p-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm" disabled={!canEdit} />
                                                <input type="number" placeholder="Unit Cost" value={item.unitCost} onChange={(e) => handleItemChange(index, 'unitCost', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-800 p-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm disabled:bg-slate-100 dark:disabled:bg-slate-700" disabled={!canEdit || item.category === 'Labor'}/>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end md:flex-col gap-2 mt-2 md:mt-0">
                                            <p className="font-semibold text-sm text-right flex-grow md:flex-grow-0">${(item.quantity * item.unitCost).toFixed(2)}</p>
                                            <Button variant="ghost" size="sm" className="!p-2 text-red-500" onClick={() => handleRemoveItem(index)} disabled={!canEdit}><TrashIcon className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                    {item.category === 'Labor' && (
                                        <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-md border border-emerald-200 dark:border-emerald-800/50">
                                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center"><WandSparklesIcon className="h-4 w-4 mr-1"/> Labor Calculator</p>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                                <label className="flex flex-col"><span className="text-xs text-slate-500">Workers</span><input type="number" value={laborCalculators[index]?.workers || ''} onChange={(e) => handleLaborCalcChange(index, 'workers', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-600 rounded-md" disabled={!canEdit} /></label>
                                                <label className="flex flex-col"><span className="text-xs text-slate-500">Days</span><input type="number" value={laborCalculators[index]?.days || ''} onChange={(e) => handleLaborCalcChange(index, 'days', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-600 rounded-md" disabled={!canEdit} /></label>
                                                <label className="flex flex-col"><span className="text-xs text-slate-500">Hrs/Day</span><input type="number" value={laborCalculators[index]?.hoursPerDay || ''} onChange={(e) => handleLaborCalcChange(index, 'hoursPerDay', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-600 rounded-md" disabled={!canEdit} /></label>
                                                <label className="flex flex-col"><span className="text-xs text-slate-500">Rate/Hr ($)</span><input type="number" value={laborCalculators[index]?.rate || ''} onChange={(e) => handleLaborCalcChange(index, 'rate', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-600 rounded-md" disabled={!canEdit} /></label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <Button variant="secondary" onClick={handleAddItem} className="mt-2" disabled={!canEdit}><PlusIcon className="h-4 w-4 mr-1"/> Add Line Item</Button>
                    </div>
                    <div className="border-t dark:border-slate-600 pt-4 mt-4 flex justify-between items-center">
                        <h3 className="text-lg font-bold">Total Cost:</h3>
                        <p className="text-2xl font-bold text-emerald-600">${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                </div>
                <div className="flex justify-end pt-6">
                    <Button type="button" variant="secondary" onClick={onClose} className="mr-2">Cancel</Button>
                    <Button type="button" onClick={handleSave} disabled={!canEdit}>Save Assembly</Button>
                </div>
            </Modal>
            <ApiKeyModal isOpen={isApiKeyModalOpen} onClose={() => setIsApiKeyModalOpen(false)} />
        </>
    );
};

export default AssemblyBuilderModal;
