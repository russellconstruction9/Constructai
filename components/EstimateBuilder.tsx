import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card, { CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { WandSparklesIcon, TrashIcon, UploadIcon, DownloadIcon, ChevronDownIcon, SaveIcon, FileTextIcon, FileInvoiceIcon } from './Icons';
import { LineItem, CostCategory, EstimateTemplate, Invoice } from '../types';
import { ASSEMBLIES, PROJECTS, ESTIMATE_TEMPLATES } from '../constants';
import { getAISuggestedPricing, ApiKeyError } from '../services/geminiService';
import { useApiKey } from '../hooks/useApiKey';
import ApiKeyModal from './ApiKeyModal';
import { useEstimate } from './Layout';
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


const tabs = ['Project Info', 'Assemblies & Line Items', 'Summary & Proposal'];

interface LaborCalculatorState {
    crewSize: number;
    days: number;
    hoursPerDay: number;
    rate: number;
}

const AIInsight: React.FC<{ message: string }> = ({ message }) => {
    return (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-lg mt-4">
            <div className="flex items-center">
                <WandSparklesIcon className="h-5 w-5 text-emerald-500 mr-2" />
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">AI Insight</h4>
            </div>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">{message}</p>
        </div>
    );
};

const EstimateBuilder: React.FC = () => {
    const [activeTab, setActiveTab] = useState(tabs[0]);
    const { estimate, setEstimate } = useEstimate()!;
    const [isAssemblyModalOpen, setIsAssemblyModalOpen] = useState(false);
    const [loadingAIPrice, setLoadingAIPrice] = useState<string | null>(null);
    const { isKeySelected, resetKeyState } = useApiKey();
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
    const estimateFileInputRef = useRef<HTMLInputElement>(null);
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const { user } = useCurrentUser();
    const canEdit = user?.permissions.estimateBuilder === 'edit';
    
    // --- Template State ---
    const [templates, setTemplates] = useState<EstimateTemplate[]>(ESTIMATE_TEMPLATES);
    const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
    const [isLoadTemplateModalOpen, setIsLoadTemplateModalOpen] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateDesc, setNewTemplateDesc] = useState('');

    const [laborCalculators, setLaborCalculators] = useState<Record<string, LaborCalculatorState>>({});
    
    useEffect(() => {
        const initialCalcs: Record<string, LaborCalculatorState> = {};
        estimate.lineItems.forEach(item => {
            if (item.category === 'Labor' && !laborCalculators[item.id]) {
                const rate = item.unitCost || 50;
                const hours = item.quantity || 8;
                const days = Math.ceil(hours / 8) || 1;
                initialCalcs[item.id] = { crewSize: 1, days, hoursPerDay: 8, rate };
            }
        });
        if(Object.keys(initialCalcs).length > 0) {
            setLaborCalculators(prev => ({ ...prev, ...initialCalcs}));
        }
    }, [estimate.lineItems]);

    const handleLineItemChange = (id: string, field: keyof LineItem, value: any) => {
        if (!canEdit) return;
        setEstimate(prev => {
            if (field === 'category') {
                if (value === 'Labor') {
                    setLaborCalculators(prevCalcs => ({
                        ...prevCalcs,
                        [id]: prevCalcs[id] || { crewSize: 1, days: 1, hoursPerDay: 8, rate: 50 }
                    }));
                } else {
                    setLaborCalculators(prevCalcs => {
                        const newCalcs = { ...prevCalcs };
                        delete newCalcs[id];
                        return newCalcs;
                    });
                }
            }

            const updatedItems = prev.lineItems.map(item => {
                if (item.id === id) {
                    const newItem = { ...item, [field]: value };
                    if (field === 'quantity' || field === 'unitCost') {
                        newItem.total = (newItem.quantity || 0) * (newItem.unitCost || 0);
                    }
                    return newItem;
                }
                return item;
            });
            return { ...prev, lineItems: updatedItems };
        });
    };
    
    const handleLaborCalcChange = (id: string, field: keyof LaborCalculatorState, value: number) => {
        if (!canEdit) return;
        const currentCalc = laborCalculators[id] || { crewSize: 1, days: 1, hoursPerDay: 8, rate: 50 };
        const newCalcState = { ...currentCalc, [field]: isNaN(value) ? 0 : value };
        setLaborCalculators(prev => ({ ...prev, [id]: newCalcState }));

        const { crewSize, days, hoursPerDay, rate } = newCalcState;
        const totalHours = crewSize * days * hoursPerDay;

        setEstimate(prev => {
            const updatedItems = prev.lineItems.map(item => {
                if (item.id === id) {
                    return {
                        ...item,
                        quantity: totalHours,
                        unitCost: rate,
                        unit: 'hours',
                        total: totalHours * rate,
                    };
                }
                return item;
            });
            return { ...prev, lineItems: updatedItems };
        });
    };

    const handleAddLineItem = () => {
        if (!canEdit) return;
        const newItem: LineItem = {
            id: `li-${Date.now()}`,
            description: '',
            category: 'Material',
            quantity: 1,
            unit: 'ea',
            unitCost: 0,
            total: 0
        };
        setEstimate(prev => ({...prev, lineItems: [...prev.lineItems, newItem]}));
        setExpandedItemId(newItem.id); // Expand the new item
    };

    const handleRemoveLineItem = (id: string) => {
        if (!canEdit) return;
        setEstimate(prev => ({...prev, lineItems: prev.lineItems.filter(item => item.id !== id)}));
    };

    const handleAddAssembly = (assemblyId: string) => {
        if (!canEdit) return;
        const assembly = ASSEMBLIES.find(a => a.id === assemblyId);
        if (!assembly) return;

        const newItems: LineItem[] = assembly.items.map(item => ({
            ...item,
            id: `li-${Date.now()}-${Math.random()}`,
            total: item.quantity * item.unitCost,
        }));

        setEstimate(prev => ({...prev, lineItems: [...prev.lineItems, ...newItems]}));
        setIsAssemblyModalOpen(false);
    };

    const handleSuggestPrice = async (itemId: string, description: string) => {
        if (!canEdit) return;
        if (!isKeySelected) {
          setIsApiKeyModalOpen(true);
          return;
        }
        if (!description) return;
        setLoadingAIPrice(itemId);
        try {
            const result = await getAISuggestedPricing(description);
            handleLineItemChange(itemId, 'unitCost', result);
        } catch (error) {
            console.error("AI Pricing Error:", error);
            if (error instanceof ApiKeyError) {
                resetKeyState();
                alert(error.message);
            } else if (error instanceof Error) {
                alert(error.message);
            }
        } finally {
            setLoadingAIPrice(null);
        }
    };

    const { subtotal, contingencyAmount, totalCost, markupAmount, grandTotal } = useMemo(() => {
        const subtotal = estimate.lineItems.reduce((acc, item) => acc + item.total, 0);
        const contingencyAmount = subtotal * (estimate.contingencyPercentage / 100);
        const totalCost = subtotal + contingencyAmount;
        const markupAmount = totalCost * (estimate.markupPercentage / 100);
        const grandTotal = totalCost + markupAmount;
        return { subtotal, contingencyAmount, totalCost, markupAmount, grandTotal };
    }, [estimate]);

    const handleGenerateProposal = () => {
        const proposalWindow = window.open('', '_blank');
        if (!proposalWindow) {
            alert('Please allow popups to generate a proposal.');
            return;
        }

        const currentProject = PROJECTS.find(p => p.client === estimate.projectName);

        const groupedItems = estimate.lineItems.reduce((acc, item) => {
            const category = item.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        }, {} as Record<CostCategory, LineItem[]>);

        const lineItemsHtml = (Object.keys(groupedItems) as CostCategory[]).map(category => {
            const itemsInCategory = groupedItems[category];
            const categoryHtml = `
                <tr class="bg-slate-100 dark:bg-slate-700">
                    <td colspan="5" class="py-2 px-4 font-semibold text-slate-800 dark:text-slate-200">${category}</td>
                </tr>
            `;
            const itemsHtml = itemsInCategory.map(item => `
                <tr class="border-b dark:border-slate-600">
                    <td class="py-2 px-4">${item.description}</td>
                    <td class="py-2 px-4 text-center">${item.quantity}</td>
                    <td class="py-2 px-4">${item.unit}</td>
                    <td class="py-2 px-4 text-right">${item.unitCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                    <td class="py-2 px-4 text-right font-medium">${item.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                </tr>
            `).join('');
            return categoryHtml + itemsHtml;
        }).join('');

        const proposalHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Estimate Proposal - ${estimate.projectName}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    @media print {
                        .no-print { display: none !important; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body class="bg-white text-slate-800">
                <div class="p-4 sm:p-8 font-sans max-w-4xl mx-auto">
                    <header class="flex flex-col sm:flex-row justify-between items-start mb-10 pb-4 border-b">
                        <div>
                           <div class="flex items-center text-emerald-600">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-2.25 2.25"></path><path d="m13.5 13.5 2.25 2.25"></path><path d="m2 22 2.25-2.25"></path><path d="m13.5 8.25 2.25-2.25"></path><path d="M11 2a2.5 2.5 0 0 1 5 0"></path><path d="M2 11a2.5 2.5 0 0 1 0-5"></path><path d="M11 22a2.5 2.5 0 0 1 0-5"></path><path d="M22 11a2.5 2.5 0 0 1-5 0"></path><path d="M14 11a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"></path></svg>
                                <h1 class="text-3xl font-bold ml-2">ConstructAI</h1>
                           </div>
                            <p class="text-slate-500 mt-1">Your Trusted Construction Partner</p>
                        </div>
                        <div class="text-left sm:text-right mt-4 sm:mt-0">
                            <h2 class="text-2xl font-bold text-slate-700">Cost Proposal</h2>
                            <p class="text-slate-500">Date: ${new Date().toLocaleDateString()}</p>
                            <p class="text-slate-500">Estimate ID: ${estimate.id}</p>
                        </div>
                    </header>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
                        <div>
                            <h3 class="text-sm font-semibold uppercase text-slate-500 tracking-wider mb-2">Prepared For</h3>
                            <p class="font-semibold text-slate-800">${currentProject?.client || ''}</p>
                            <p class="text-slate-600">${currentProject?.address || ''}</p>
                        </div>
                        <div class="text-left sm:text-right">
                            <h3 class="text-sm font-semibold uppercase text-slate-500 tracking-wider mb-2">Prepared By</h3>
                            <p class="font-semibold text-slate-800">ConstructAI</p>
                            <p class="text-slate-600">${estimate.estimator}</p>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left mb-8 text-sm">
                            <thead class="border-b-2 dark:border-slate-600">
                                <tr>
                                    <th class="py-2 px-4 font-semibold uppercase text-slate-600">Description</th>
                                    <th class="py-2 px-4 font-semibold uppercase text-slate-600 text-center">Qty</th>
                                    <th class="py-2 px-4 font-semibold uppercase text-slate-600">Unit</th>
                                    <th class="py-2 px-4 font-semibold uppercase text-slate-600 text-right">Unit Cost</th>
                                    <th class="py-2 px-4 font-semibold uppercase text-slate-600 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>${lineItemsHtml}</tbody>
                        </table>
                    </div>

                    <div class="flex justify-end">
                        <div class="w-full max-w-sm space-y-2 text-slate-700">
                            <div class="flex justify-between">
                                <span class="font-medium">Subtotal:</span>
                                <span>${subtotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="font-medium">Contingency (${estimate.contingencyPercentage}%):</span>
                                <span>${contingencyAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                            </div>
                            <div class="flex justify-between font-semibold border-t pt-2 mt-2">
                                <span>Total Project Cost:</span>
                                <span>${totalCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                            </div>
                            <div class="flex justify-between text-slate-600">
                                <span class="font-medium">Markup (${estimate.markupPercentage}%):</span>
                                <span>${markupAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                            </div>
                            <div class="flex justify-between text-xl font-bold border-t pt-2 mt-2 text-slate-900 bg-emerald-100 p-3 rounded-lg">
                                <span>Client Total:</span>
                                <span>${grandTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                            </div>
                        </div>
                    </div>
                    
                     <div class="mt-12 pt-6 border-t">
                        <h3 class="font-semibold text-slate-800 mb-2">Terms & Conditions</h3>
                        <p class="text-xs text-slate-500">
                            1. This proposal is valid for 30 days from the date of issue.
                            2. Payment schedule: 50% deposit upon acceptance, 40% upon substantial completion, 10% upon final inspection.
                            3. Any alterations or deviations from the scope of work described will be executed only upon written orders and will become an extra charge over and above the estimate.
                            4. All elements of this agreement are contingent upon strikes, accidents, or delays beyond our control.
                        </p>
                    </div>

                    <div class="mt-12 pt-6 flex justify-between">
                        <div class="w-1/2">
                            <div class="border-b-2 border-slate-400 pb-2"></div>
                            <p class="mt-2 font-semibold">Client Signature</p>
                        </div>
                        <div class="w-1/4">
                             <div class="border-b-2 border-slate-400 pb-2"></div>
                            <p class="mt-2 font-semibold">Date</p>
                        </div>
                    </div>

                    <footer class="mt-12 text-center text-slate-500 text-xs">
                        <p>Thank you for considering ConstructAI for your project.</p>
                    </footer>

                    <div class="mt-8 text-center no-print">
                        <button onclick="window.print()" class="px-6 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
                            Print or Save as PDF
                        </button>
                    </div>
                </div>
            </body>
            </html>
        `;

        proposalWindow.document.write(proposalHtml);
        proposalWindow.document.close();
    };

    const handleCreateInvoice = () => {
        const invoiceWindow = window.open('', '_blank');
        if (!invoiceWindow) {
            alert('Please allow popups to create an invoice.');
            return;
        }

        const currentProject = PROJECTS.find(p => p.client === estimate.projectName);
        if (!currentProject) {
            alert("Project not found. Cannot create invoice.");
            return;
        }

        const issueDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(issueDate.getDate() + 30); // Net 30

        const invoice: Invoice = {
            id: `INV-${Date.now()}`,
            estimateId: estimate.id,
            projectId: currentProject.id,
            invoiceNumber: `INV-${currentProject.id}-${issueDate.getFullYear()}${(issueDate.getMonth() + 1).toString().padStart(2, '0')}`,
            issueDate: issueDate.toLocaleDateString(),
            dueDate: dueDate.toLocaleDateString(),
            status: 'Unpaid',
            clientName: currentProject.client,
            clientAddress: currentProject.address,
            lineItems: estimate.lineItems,
            subtotal,
            contingencyAmount,
            markupAmount,
            grandTotal,
        };

        const statusClasses = {
            'Unpaid': 'bg-yellow-100 text-yellow-800',
            'Paid': 'bg-green-100 text-green-800',
            'Overdue': 'bg-red-100 text-red-800',
        };

        const lineItemsHtml = invoice.lineItems.map(item => `
            <tr class="border-b">
                <td class="py-2 px-4">${item.description}</td>
                <td class="py-2 px-4 text-center">${item.quantity}</td>
                <td class="py-2 px-4">${item.unit}</td>
                <td class="py-2 px-4 text-right">${item.unitCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                <td class="py-2 px-4 text-right font-medium">${item.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
            </tr>
        `).join('');

        const invoiceHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Invoice - ${invoice.invoiceNumber}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style> @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } } </style>
            </head>
            <body class="bg-white text-slate-800">
                <div class="p-4 sm:p-8 font-sans max-w-4xl mx-auto">
                    <header class="flex flex-col sm:flex-row justify-between items-start mb-8 pb-4 border-b">
                        <div>
                           <div class="flex items-center text-emerald-600">
                               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-2.25 2.25"></path><path d="m13.5 13.5 2.25 2.25"></path><path d="m2 22 2.25-2.25"></path><path d="m13.5 8.25 2.25-2.25"></path><path d="M11 2a2.5 2.5 0 0 1 5 0"></path><path d="M2 11a2.5 2.5 0 0 1 0-5"></path><path d="M11 22a2.5 2.5 0 0 1 0-5"></path><path d="M22 11a2.5 2.5 0 0 1-5 0"></path><path d="M14 11a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"></path></svg>
                                <h1 class="text-3xl font-bold ml-2">ConstructAI</h1>
                           </div>
                        </div>
                        <div class="text-left sm:text-right mt-4 sm:mt-0">
                            <h2 class="text-4xl font-bold text-slate-700">INVOICE</h2>
                            <span class="px-3 py-1 text-sm font-semibold rounded-full ${statusClasses[invoice.status]}">${invoice.status.toUpperCase()}</span>
                        </div>
                    </header>
                    <div class="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <h3 class="text-sm font-semibold uppercase text-slate-500 tracking-wider mb-2">Bill To</h3>
                            <p class="font-semibold text-slate-800">${invoice.clientName}</p>
                            <p class="text-slate-600">${invoice.clientAddress}</p>
                        </div>
                        <div class="text-right">
                            <p><span class="font-semibold">Invoice #:</span> ${invoice.invoiceNumber}</p>
                            <p><span class="font-semibold">Issue Date:</span> ${invoice.issueDate}</p>
                            <p><span class="font-semibold">Due Date:</span> ${invoice.dueDate}</p>
                        </div>
                    </div>
                    <table class="w-full text-left mb-8 text-sm">
                        <thead class="bg-slate-100">
                            <tr>
                                <th class="py-2 px-4 font-semibold uppercase text-slate-600">Description</th>
                                <th class="py-2 px-4 font-semibold uppercase text-slate-600 text-center">Qty</th>
                                <th class="py-2 px-4 font-semibold uppercase text-slate-600">Unit</th>
                                <th class="py-2 px-4 font-semibold uppercase text-slate-600 text-right">Unit Cost</th>
                                <th class="py-2 px-4 font-semibold uppercase text-slate-600 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>${lineItemsHtml}</tbody>
                    </table>
                    <div class="flex justify-end">
                        <div class="w-full max-w-sm space-y-2 text-slate-700">
                            <div class="flex justify-between"><span>Subtotal:</span><span>${invoice.subtotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span></div>
                            ${invoice.contingencyAmount > 0 ? `<div class="flex justify-between"><span>Contingency:</span><span>${invoice.contingencyAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span></div>` : ''}
                            ${invoice.markupAmount > 0 ? `<div class="flex justify-between"><span>Markup:</span><span>${invoice.markupAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span></div>` : ''}
                            <div class="flex justify-between text-xl font-bold border-t pt-2 mt-2 text-slate-900 bg-emerald-100 p-3 rounded-lg">
                                <span>Amount Due:</span>
                                <span>${invoice.grandTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                            </div>
                        </div>
                    </div>
                    <div class="mt-12 pt-6 border-t">
                        <h3 class="font-semibold text-slate-800 mb-2">Payment Instructions</h3>
                        <p class="text-xs text-slate-500">Please make checks payable to ConstructAI. For wire transfers, please use the account details provided separately. Payment is due within 30 days of the issue date.</p>
                    </div>
                    <div class="mt-8 text-center no-print">
                        <button onclick="window.print()" class="px-6 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700">Print or Save as PDF</button>
                    </div>
                </div>
            </body>
            </html>
        `;
        invoiceWindow.document.write(invoiceHtml);
        invoiceWindow.document.close();
    };


    const handleExportEstimate = () => {
        const exportData = estimate.lineItems.map(({ id, total, ...rest }) => rest);
        if (exportData.length === 0) {
            alert("No line items to export.");
            return;
        }
        const csvString = jsonToCsv(exportData);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        const fileName = `estimate_${estimate.projectName.replace(/\s+/g, '_')}.csv`;
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportEstimateClick = () => {
        if (!canEdit) return;
        estimateFileInputRef.current?.click();
    };
    
    const handleFileImportEstimate = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !canEdit) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            try {
                const importedData = csvToJson(text);
                const newItems: LineItem[] = importedData.map(row => {
                    const quantity = parseFloat(row.quantity) || 0;
                    const unitCost = parseFloat(row.unitCost) || 0;
                    return {
                        id: `li-${Date.now()}-${Math.random()}`,
                        description: row.description || '',
                        category: (row.category as CostCategory) || 'Other',
                        quantity,
                        unit: row.unit || '',
                        unitCost,
                        total: quantity * unitCost,
                    };
                });
                setEstimate(prev => ({ ...prev, lineItems: [...prev.lineItems, ...newItems] }));
                alert(`${newItems.length} line items imported successfully!`);
            } catch (error) {
                console.error("Error importing estimate CSV:", error);
                alert("Failed to import CSV. Please check the file format and console for errors.");
            }
            if (event.target) event.target.value = '';
        };
        reader.readAsText(file);
    };

    const toggleExpand = (itemId: string) => {
        setExpandedItemId(prevId => prevId === itemId ? null : itemId);
    };

    const handleSaveTemplate = () => {
        if (!canEdit || !newTemplateName.trim()) {
            alert("Please provide a template name.");
            return;
        }
        const newTemplate: EstimateTemplate = {
            id: `tpl-${Date.now()}`,
            name: newTemplateName,
            description: newTemplateDesc,
            contingencyPercentage: estimate.contingencyPercentage,
            markupPercentage: estimate.markupPercentage,
            lineItems: estimate.lineItems.map(({ description, category, quantity, unit, unitCost }) => ({
                description, category, quantity, unit, unitCost
            }))
        };
        setTemplates(prev => [...prev, newTemplate]);
        setIsSaveTemplateModalOpen(false);
        setNewTemplateName('');
        setNewTemplateDesc('');
        alert('Template saved successfully!');
    };

    const handleLoadTemplate = (templateId: string, mode: 'replace' | 'append') => {
        if (!canEdit) return;
        const template = templates.find(t => t.id === templateId);
        if (!template) return;

        const newItemsFromTemplate: LineItem[] = template.lineItems.map(item => ({
            ...item,
            id: `li-${Date.now()}-${Math.random()}`,
            total: item.quantity * item.unitCost,
            actualCost: 0,
        }));

        setEstimate(prev => ({
            ...prev,
            contingencyPercentage: template.contingencyPercentage,
            markupPercentage: template.markupPercentage,
            lineItems: mode === 'replace' 
                ? newItemsFromTemplate 
                : [...prev.lineItems, ...newItemsFromTemplate]
        }));
        
        setIsLoadTemplateModalOpen(false);
        setActiveTab('Assemblies & Line Items'); // Switch tab to see the result
    };


    const renderContent = () => {
        switch (activeTab) {
            case 'Project Info':
                return (
                    <div className="space-y-4 max-w-md">
                        <div>
                            <label htmlFor="projectName" className="block mb-2 text-sm font-medium">Project</label>
                            <select 
                                id="projectName" 
                                className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600"
                                value={estimate.projectName}
                                onChange={(e) => canEdit && setEstimate({...estimate, projectName: e.target.value})}
                                disabled={!canEdit}
                            >
                                {PROJECTS.map(p => <option key={p.id}>{p.client}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="estimator" className="block mb-2 text-sm font-medium">Estimator</label>
                            <input type="text" id="estimator" className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600" value={estimate.estimator} readOnly />
                        </div>
                    </div>
                );
            case 'Assemblies & Line Items':
                return (
                    <div>
                        <div className="flex flex-wrap gap-2 mb-4">
                            <Button onClick={() => setIsAssemblyModalOpen(true)} disabled={!canEdit}>+ Add from Knowledge Base</Button>
                            <Button onClick={() => setIsLoadTemplateModalOpen(true)} variant="secondary" disabled={!canEdit}>
                                <FileTextIcon className="h-4 w-4 mr-2"/> Load from Template
                            </Button>
                            <Button onClick={handleAddLineItem} variant="secondary" disabled={!canEdit}>+ Add Line Item</Button>
                            <div className="flex-grow"></div>
                            <input type="file" ref={estimateFileInputRef} onChange={handleFileImportEstimate} className="hidden" accept=".csv" />
                            <Button onClick={handleImportEstimateClick} variant="secondary" size="sm" disabled={!canEdit}>
                                <UploadIcon className="h-4 w-4 mr-1" /> Import CSV
                            </Button>
                            <Button onClick={handleExportEstimate} variant="secondary" size="sm">
                                <DownloadIcon className="h-4 w-4 mr-1" /> Export CSV
                            </Button>
                        </div>
                        <div className="overflow-x-auto -mx-6 px-6">
                           <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400 hidden md:table-header-group">
                                    <tr>
                                        <th className="px-4 py-3 w-12"></th>
                                        <th className="px-4 py-3">Description</th>
                                        <th className="px-4 py-3">Category</th>
                                        <th className="px-4 py-3 w-32 text-right">Total</th>
                                        <th className="px-4 py-3 w-12 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="md:table-row-group">
                                    {estimate.lineItems.map(item => (
                                        <React.Fragment key={item.id}>
                                            <tr 
                                                className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer hidden md:table-row"
                                                onClick={() => toggleExpand(item.id)}
                                            >
                                                <td className="px-4 py-3 text-center">
                                                    <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition-transform ${expandedItemId === item.id ? 'rotate-180' : ''}`} />
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{item.description || <span className="text-slate-400 italic">New Line Item</span>}</td>
                                                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.category}</td>
                                                <td className="px-4 py-3 text-right font-semibold">${item.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveLineItem(item.id); }} className="text-slate-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canEdit}><TrashIcon className="h-4 w-4"/></button>
                                                </td>
                                            </tr>
                                            <tr className="md:hidden border-b dark:border-slate-700 block mb-4 rounded-lg bg-white dark:bg-slate-800 shadow">
                                                <td className="p-4 block" onClick={() => toggleExpand(item.id)}>
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{item.description || <span className="text-slate-400 italic">New Line Item</span>}</p>
                                                            <p className="text-xs text-slate-500">{item.category}</p>
                                                        </div>
                                                        <div className="text-right ml-2">
                                                            <p className="font-bold text-lg">${item.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                                            <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition-transform inline-block ${expandedItemId === item.id ? 'rotate-180' : ''}`} />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>

                                            {expandedItemId === item.id && (
                                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                    <td colSpan={5} className="p-0">
                                                        <div className="p-4 space-y-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="text-xs text-slate-500">Description</label>
                                                                    <textarea value={item.description} onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)} className="w-full bg-white dark:bg-slate-700 p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" rows={2} disabled={!canEdit}/>
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-slate-500">Category</label>
                                                                     <select value={item.category} onChange={(e) => handleLineItemChange(item.id, 'category', e.target.value as CostCategory)} className="w-full bg-white dark:bg-slate-700 p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" disabled={!canEdit}>
                                                                        <option>Material</option><option>Labor</option><option>Subcontractor</option><option>Equipment</option><option>Other</option>
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                 <div>
                                                                    <label className="text-xs text-slate-500">Quantity</label>
                                                                    <input type="number" value={item.quantity} onChange={(e) => handleLineItemChange(item.id, 'quantity', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-700 p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" disabled={!canEdit || item.category === 'Labor'} />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-slate-500">Unit</label>
                                                                    <input type="text" value={item.unit} onChange={(e) => handleLineItemChange(item.id, 'unit', e.target.value)} className="w-full bg-white dark:bg-slate-700 p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" disabled={!canEdit || item.category === 'Labor'} />
                                                                </div>
                                                                 <div className="relative">
                                                                    <label className="text-xs text-slate-500">Unit Cost</label>
                                                                    <span className="absolute left-2 top-7 text-slate-400">$</span>
                                                                    <input type="number" value={item.unitCost} onChange={(e) => handleLineItemChange(item.id, 'unitCost', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-700 p-2 pl-6 border border-slate-300 dark:border-slate-600 rounded-md text-sm" disabled={!canEdit || item.category === 'Labor'} />
                                                                    <button onClick={() => handleSuggestPrice(item.id, item.description)} disabled={!canEdit || loadingAIPrice === item.id || item.category === 'Labor'} className="absolute right-1 top-5 text-emerald-500 hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed p-1">
                                                                        <WandSparklesIcon className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        
                                                            {item.category === 'Labor' && (
                                                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-md border border-emerald-200 dark:border-emerald-800/50">
                                                                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center"><WandSparklesIcon className="h-4 w-4 mr-1"/> Labor Calculator</p>
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                                                                        <label className="flex flex-col"><span className="text-xs text-slate-500">Crew Size</span><input type="number" value={laborCalculators[item.id]?.crewSize || ''} onChange={(e) => handleLaborCalcChange(item.id, 'crewSize', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-700 p-1 border border-slate-300 dark:border-slate-600 rounded-md" disabled={!canEdit} /></label>
                                                                        <label className="flex flex-col"><span className="text-xs text-slate-500">Days</span><input type="number" value={laborCalculators[item.id]?.days || ''} onChange={(e) => handleLaborCalcChange(item.id, 'days', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-700 p-1 border border-slate-300 dark:border-slate-600 rounded-md" disabled={!canEdit} /></label>
                                                                        <label className="flex flex-col"><span className="text-xs text-slate-500">Hours/Day</span><input type="number" value={laborCalculators[item.id]?.hoursPerDay || ''} onChange={(e) => handleLaborCalcChange(item.id, 'hoursPerDay', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-700 p-1 border border-slate-300 dark:border-slate-600 rounded-md" disabled={!canEdit} /></label>
                                                                        <label className="flex flex-col"><span className="text-xs text-slate-500">Rate/Hr ($)</span><input type="number" value={laborCalculators[item.id]?.rate || ''} onChange={(e) => handleLaborCalcChange(item.id, 'rate', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-700 p-1 border border-slate-300 dark:border-slate-600 rounded-md" disabled={!canEdit} /></label>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-end md:hidden">
                                                                <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); handleRemoveLineItem(item.id); }} disabled={!canEdit}>
                                                                    <TrashIcon className="h-4 w-4 mr-1" /> Remove
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                           </table>
                        </div>
                        { estimate.lineItems.length > 5 && <AIInsight message="Based on historical data for similar projects, consider increasing labor hours for 'Drywall' by 10% to account for potential rework."/>}
                    </div>
                );
            case 'Summary & Proposal':
                return (
                    <div className="space-y-4 max-w-lg">
                        <div className="p-4 border dark:border-slate-700 rounded-lg space-y-3">
                            <div className="flex justify-between items-center text-md">
                                <span className="font-medium text-slate-600 dark:text-slate-300">Line Item Subtotal:</span>
                                <span>{subtotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                            </div>
                             <div className="flex justify-between items-center text-md">
                                <div className="flex items-center">
                                    <label htmlFor="contingency" className="font-medium text-slate-600 dark:text-slate-300 mr-2">Contingency:</label>
                                    <input 
                                        type="number" 
                                        id="contingency" 
                                        value={estimate.contingencyPercentage}
                                        onChange={(e) => setEstimate({...estimate, contingencyPercentage: parseFloat(e.target.value) || 0})}
                                        className="w-16 p-1 text-right bg-slate-100 dark:bg-slate-700 rounded-md border border-slate-300 dark:border-slate-600"
                                        disabled={!canEdit}
                                    />
                                    <span className="ml-1">%</span>
                                </div>
                                <span>{contingencyAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                            </div>
                            <div className="flex justify-between items-center text-lg font-semibold border-t pt-3 dark:border-slate-600">
                                <span>Total Project Cost:</span>
                                <span>{totalCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                            </div>
                        </div>

                         <div className="p-4 border dark:border-slate-700 rounded-lg space-y-3">
                            <div className="flex justify-between items-center text-md">
                                <div className="flex items-center">
                                    <label htmlFor="markup" className="font-medium text-slate-600 dark:text-slate-300 mr-2">Markup:</label>
                                    <input 
                                        type="number" 
                                        id="markup"
                                        value={estimate.markupPercentage}
                                        onChange={(e) => setEstimate({...estimate, markupPercentage: parseFloat(e.target.value) || 0})} 
                                        className="w-16 p-1 text-right bg-slate-100 dark:bg-slate-700 rounded-md border border-slate-300 dark:border-slate-600"
                                        disabled={!canEdit}
                                    />
                                    <span className="ml-1">%</span>
                                </div>
                                <span>{markupAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                            </div>

                             <div className="flex justify-between items-center text-xl sm:text-2xl font-bold border-t pt-3 dark:border-slate-600 text-emerald-600 dark:text-emerald-500">
                                <span>Grand Total:</span>
                                <span>{grandTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                            </div>
                        </div>
                        <div className="pt-4 flex flex-wrap gap-2">
                            <Button size="lg" variant="secondary" onClick={handleGenerateProposal}>Generate PDF Proposal</Button>
                            <Button size="lg" onClick={handleCreateInvoice}>
                                <FileInvoiceIcon className="h-5 w-5 mr-2" /> Create Invoice
                            </Button>
                            <Button size="lg" variant="secondary" onClick={() => setIsSaveTemplateModalOpen(true)} disabled={!canEdit}>
                                <SaveIcon className="h-5 w-5 mr-2" />
                                Save as Template
                            </Button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Estimate Builder</CardTitle>
                        {!canEdit && (
                            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                View Only
                            </span>
                        )}
                    </div>
                    <div className="border-b border-slate-200 dark:border-slate-700 mt-4">
                        <nav className="-mb-px flex space-x-2 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`${
                                        activeTab === tab
                                            ? 'border-emerald-500 text-emerald-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600'
                                    } whitespace-nowrap py-3 px-2 sm:px-1 border-b-2 font-medium text-sm`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>
                </CardHeader>
                <CardContent className="mt-6">
                    {renderContent()}
                </CardContent>
            </Card>

            <Modal isOpen={isAssemblyModalOpen} onClose={() => setIsAssemblyModalOpen(false)} title="Add Assembly from Knowledge Base">
                <div className="space-y-2">
                    {ASSEMBLIES.map(assembly => (
                        <div key={assembly.id} className="p-3 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{assembly.name}</p>
                                <p className="text-sm text-slate-500">${assembly.averageCost.toLocaleString()} avg. cost</p>
                            </div>
                            <Button size="sm" onClick={() => handleAddAssembly(assembly.id)} disabled={!canEdit}>Add</Button>
                        </div>
                    ))}
                </div>
            </Modal>

             <Modal isOpen={isLoadTemplateModalOpen} onClose={() => setIsLoadTemplateModalOpen(false)} title="Load Estimate from Template">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {templates.length === 0 ? (
                        <p className="text-center text-slate-500">No templates saved yet.</p>
                    ) : (
                        templates.map(template => (
                            <div key={template.id} className="p-3 rounded-md border dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                                <p className="font-semibold">{template.name}</p>
                                <p className="text-sm text-slate-500 mb-3">{template.description}</p>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleLoadTemplate(template.id, 'replace')} disabled={!canEdit} className="flex-1">Replace</Button>
                                    <Button size="sm" variant="secondary" onClick={() => handleLoadTemplate(template.id, 'append')} disabled={!canEdit} className="flex-1">Append</Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Modal>
            
            <Modal isOpen={isSaveTemplateModalOpen} onClose={() => setIsSaveTemplateModalOpen(false)} title="Save Estimate as Template">
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSaveTemplate(); }}>
                    <div>
                        <label htmlFor="templateName" className="block mb-2 text-sm font-medium">Template Name</label>
                        <input type="text" id="templateName" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 p-2 border border-slate-300 dark:border-slate-600 rounded-md" required />
                    </div>
                    <div>
                        <label htmlFor="templateDesc" className="block mb-2 text-sm font-medium">Description (Optional)</label>
                        <textarea id="templateDesc" value={newTemplateDesc} onChange={e => setNewTemplateDesc(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 p-2 border border-slate-300 dark:border-slate-600 rounded-md" rows={3}></textarea>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsSaveTemplateModalOpen(false)} className="mr-2">Cancel</Button>
                        <Button type="submit" disabled={!canEdit}>Save Template</Button>
                    </div>
                </form>
            </Modal>

            <ApiKeyModal isOpen={isApiKeyModalOpen} onClose={() => setIsApiKeyModalOpen(false)} />
        </>
    );
};

export default EstimateBuilder;