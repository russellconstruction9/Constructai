import React, { useState, useMemo, useRef } from 'react';
import Card, { CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import AssemblyBuilderModal from './AssemblyBuilderModal';
import { ASSEMBLIES } from '../constants';
import { Assembly, CostCategory } from '../types';
import { PencilIcon, TrashIcon, UploadIcon, DownloadIcon } from './Icons';
import { useCurrentUser } from '../hooks/useCurrentUser';

// --- CSV UTILS ---
function escapeCsvCell(cell: any): string {
    const cellStr = String(cell ?? '');
    if (/[",\n]/.test(cellStr)) {
        return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
}

function jsonToCsv(jsonData: Record<string, any>[]): string {
    if (!jsonData || jsonData.length === 0) return '';
    const headers = Object.keys(jsonData[0]);
    const headerRow = headers.map(escapeCsvCell).join(',');
    const dataRows = jsonData.map(row => 
        headers.map(header => escapeCsvCell(row[header])).join(',')
    );
    return [headerRow, ...dataRows].join('\n');
}

function csvToJson(csvData: string): Record<string, any>[] {
    const lines = csvData.trim().split(/\r\n|\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const jsonData = [];
    const regex = /("([^"]|"")*"|[^,]*)(,|$)/g;
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const values = [];
        let match;
        regex.lastIndex = 0;
        while ((match = regex.exec(lines[i])) && match[0] !== '') {
            let value = match[1] || '';
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1).replace(/""/g, '"');
            }
            values.push(value.trim());
            if (match[0].slice(-1) !== ',') break;
        }
        const obj: Record<string, any> = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = values[j] || '';
        }
        jsonData.push(obj);
    }
    return jsonData;
}
// --- END CSV UTILS ---


const KnowledgeBase: React.FC = () => {
    const [assemblies, setAssemblies] = useState<Assembly[]>(ASSEMBLIES);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAssembly, setEditingAssembly] = useState<Assembly | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { user } = useCurrentUser();
    const canEdit = user?.permissions.knowledgeBase === 'edit';

    const handleNewAssembly = () => {
        if (!canEdit) return;
        setEditingAssembly(null);
        setIsModalOpen(true);
    };

    const handleEditAssembly = (assembly: Assembly) => {
        if (!canEdit) return;
        setEditingAssembly(assembly);
        setIsModalOpen(true);
    };

    const handleDeleteAssembly = (id: string) => {
        if (!canEdit) return;
        if (window.confirm('Are you sure you want to delete this assembly?')) {
            setAssemblies(prev => prev.filter(a => a.id !== id));
        }
    };

    const handleSaveAssembly = (assembly: Assembly) => {
        if (!canEdit) return;
        if (editingAssembly) {
            setAssemblies(prev => prev.map(a => a.id === assembly.id ? assembly : a));
        } else {
            setAssemblies(prev => [...prev, assembly]);
        }
        setIsModalOpen(false);
        setEditingAssembly(null);
    };
    
    const filteredAssemblies = useMemo(() => {
        return assemblies.filter(assembly => 
            assembly.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            assembly.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [assemblies, searchTerm]);

    const handleExport = () => {
        const exportData = assemblies.flatMap(assembly =>
            assembly.items.length > 0 ? assembly.items.map(item => ({
                assemblyId: assembly.id,
                assemblyName: assembly.name,
                itemDescription: item.description,
                itemCategory: item.category,
                itemQuantity: item.quantity,
                itemUnit: item.unit,
                itemUnitCost: item.unitCost,
            })) : [{
                assemblyId: assembly.id,
                assemblyName: assembly.name,
                itemDescription: '', itemCategory: '', itemQuantity: '', itemUnit: '', itemUnitCost: '',
            }]
        );
        if (exportData.length === 0) {
            alert("No data to export.");
            return;
        }
        const csvString = jsonToCsv(exportData);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "constructai_assemblies_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportClick = () => {
        if (!canEdit) return;
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !canEdit) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            try {
                const importedData = csvToJson(text);
                const newAssembliesMap = new Map<string, Assembly>();
                for (const row of importedData) {
                    const { assemblyId, assemblyName, itemDescription, itemCategory, itemQuantity, itemUnit, itemUnitCost } = row;
                    if (!assemblyId || !assemblyName) continue;
                    
                    const lineItem = {
                        description: itemDescription,
                        category: itemCategory as CostCategory,
                        quantity: parseFloat(itemQuantity),
                        unit: itemUnit,
                        unitCost: parseFloat(itemUnitCost),
                    };

                    if (newAssembliesMap.has(assemblyId)) {
                        if(lineItem.description) newAssembliesMap.get(assemblyId)!.items.push(lineItem);
                    } else {
                        newAssembliesMap.set(assemblyId, {
                            id: assemblyId,
                            name: assemblyName,
                            averageCost: 0,
                            variance: 0,
                            lastUsed: new Date().toISOString().split('T')[0],
                            items: lineItem.description ? [lineItem] : [],
                        });
                    }
                }
                const newAssemblies = Array.from(newAssembliesMap.values());
                newAssemblies.forEach(asm => {
                    asm.averageCost = asm.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
                });
                setAssemblies(prev => {
                    const existingIds = new Set(prev.map(a => a.id));
                    const uniqueNew = newAssemblies.filter(a => !existingIds.has(a.id));
                    return [...prev, ...uniqueNew];
                });
                alert(`${newAssemblies.length} assemblies processed successfully!`);
            } catch (error) {
                console.error("Error importing CSV:", error);
                alert("Failed to import CSV. Please check the file format and console for errors.");
            }
            if (event.target) event.target.value = '';
        };
        reader.readAsText(file);
    };


    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                         <div>
                            <CardTitle>Knowledge Base</CardTitle>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage reusable cost assemblies.</p>
                        </div>
                        <div className="flex items-center flex-wrap gap-2">
                           <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".csv" />
                           <Button onClick={handleImportClick} variant="secondary" disabled={!canEdit}>
                               <UploadIcon className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Import</span>
                           </Button>
                           <Button onClick={handleExport} variant="secondary">
                               <DownloadIcon className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Export</span>
                           </Button>
                           <Button onClick={handleNewAssembly} disabled={!canEdit}>+ New Assembly</Button>
                       </div>
                    </div>
                    <div className="mt-4">
                        <input
                            type="search"
                            placeholder="Search for 'kitchen remodel' or 'ASM-001'..."
                            className="w-full max-w-lg p-2.5 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto hidden md:block">
                        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Assembly Name</th>
                                    <th scope="col" className="px-6 py-3 text-right">Avg. Cost</th>
                                    <th scope="col" className="px-6 py-3 text-right">Historical Variance</th>
                                    <th scope="col" className="px-6 py-3">Last Used</th>
                                    <th scope="col" className="px-6 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAssemblies.map((assembly) => (
                                    <tr key={assembly.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{assembly.name}</td>
                                        <td className="px-6 py-4 text-right">${assembly.averageCost.toLocaleString()}</td>
                                        <td className={`px-6 py-4 text-right font-medium ${assembly.variance > 0 ? 'text-red-500' : 'text-green-500'}`}>{assembly.variance.toFixed(1)}%</td>
                                        <td className="px-6 py-4">{assembly.lastUsed}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center space-x-2">
                                                <Button variant="ghost" size="sm" className="!p-2" onClick={() => handleEditAssembly(assembly)} disabled={!canEdit}>
                                                    <PencilIcon className="h-4 w-4"/>
                                                </Button>
                                                <Button variant="ghost" size="sm" className="!p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50" onClick={() => handleDeleteAssembly(assembly.id)} disabled={!canEdit}>
                                                    <TrashIcon className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {filteredAssemblies.map((assembly) => (
                            <div key={assembly.id} className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 border dark:border-slate-700">
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-slate-800 dark:text-slate-200 flex-1 pr-2">{assembly.name}</p>
                                    <div className="flex items-center space-x-1">
                                        <Button variant="ghost" size="sm" className="!p-2" onClick={() => handleEditAssembly(assembly)} disabled={!canEdit}>
                                            <PencilIcon className="h-4 w-4"/>
                                        </Button>
                                        <Button variant="ghost" size="sm" className="!p-2 text-red-500" onClick={() => handleDeleteAssembly(assembly.id)} disabled={!canEdit}>
                                            <TrashIcon className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t dark:border-slate-700 grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-slate-500">Avg Cost</p>
                                        <p>${assembly.averageCost.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Variance</p>
                                        <p className={`font-medium ${assembly.variance > 0 ? 'text-red-500' : 'text-green-500'}`}>{assembly.variance.toFixed(1)}%</p>
                                    </div>
                                </div>
                                <div className="mt-2 text-xs text-slate-400">
                                    Last Used: {assembly.lastUsed}
                                </div>
                            </div>
                        ))}
                    </div>
                    {filteredAssemblies.length === 0 && (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            No assemblies found.
                        </div>
                    )}
                </CardContent>
            </Card>
            <AssemblyBuilderModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveAssembly}
                assemblyToEdit={editingAssembly}
                canEdit={canEdit}
            />
        </>
    );
};

export default KnowledgeBase;
