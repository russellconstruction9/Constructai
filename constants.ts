// FIX: Correctly import types from the dedicated types.ts file and remove unused JobCost type.
import { User, Project, Assembly, UserRole, Estimate, Permissions, EstimateTemplate } from './types';

export const USER_ROLES: UserRole[] = ['Admin', 'Employee'];

const ADMIN_PERMISSIONS: Permissions = {
  dashboard: 'edit',
  projects: 'edit',
  estimateBuilder: 'edit',
  jobCosting: 'edit',
  knowledgeBase: 'edit',
  analytics: 'edit',
};

export const USERS: User[] = [
  { 
    id: 1, 
    name: 'Catherine Howard', 
    email: 'c.howard@constructai.com', 
    role: 'Admin',
    permissions: ADMIN_PERMISSIONS,
  },
  { 
    id: 2, 
    name: 'John Smith', 
    email: 'j.smith@constructai.com', 
    role: 'Employee',
    permissions: {
      dashboard: 'view',
      projects: 'edit',
      estimateBuilder: 'edit',
      jobCosting: 'edit',
      knowledgeBase: 'view',
      analytics: 'view',
    }
  },
  { 
    id: 3, 
    name: 'Maria Garcia', 
    email: 'm.garcia@constructai.com', 
    role: 'Employee',
    permissions: {
      dashboard: 'view',
      projects: 'view',
      estimateBuilder: 'none',
      jobCosting: 'edit',
      knowledgeBase: 'none',
      analytics: 'none',
    }
  },
  { 
    id: 4, 
    name: 'David Lee', 
    email: 'd.lee@constructai.com', 
    role: 'Employee',
    permissions: {
      dashboard: 'view',
      projects: 'view',
      estimateBuilder: 'view',
      jobCosting: 'view',
      knowledgeBase: 'edit',
      analytics: 'view',
    }
  },
];

export const PROJECTS: Project[] = [
  { 
    id: 1, client: 'Hamilton Residence', address: '123 Oak St, Springfield', status: 'In Progress', 
    budget: 150000, actual: 125000, margin: 16.7, 
    startDate: '2024-05-15', endDate: '2024-09-30',
    activity: [
        { date: '2024-07-20', description: 'Framing inspection passed.' },
        { date: '2024-07-18', description: 'Plumbing rough-in completed.' }
    ]
  },
  { 
    id: 2, client: 'Jefferson Kitchen Remodel', address: '456 Maple Ave, Shelbyville', status: 'Completed', 
    budget: 75000, actual: 72000, margin: 4.0,
    startDate: '2024-04-01', endDate: '2024-06-15',
     activity: [
        { date: '2024-06-14', description: 'Final walkthrough with client.' },
        { date: '2024-06-10', description: 'Countertops installed.' },
        { date: '2024-06-05', description: 'Cabinets delivered and installed.' }
    ]
  },
  { 
    id: 3, client: 'Washington Addition', address: '789 Pine Ln, Capital City', status: 'Planning', 
    budget: 250000, actual: 0, margin: 0,
    startDate: '2024-08-01', endDate: '2025-01-15',
     activity: [
        { date: '2024-07-15', description: 'Permits approved by the city.' },
        { date: '2024-07-01', description: 'Architectural drawings finalized.' }
    ]
  },
  { 
    id: 4, client: 'Adams Deck & Patio', address: '101 Elm Rd, Ogdenville', status: 'On Hold', 
    budget: 35000, actual: 5000, margin: -14.3,
    startDate: '2024-06-01', endDate: '2024-07-30',
     activity: [
        { date: '2024-06-05', description: 'Project put on hold per client request (financing).' },
        { date: '2024-06-03', description: 'Initial site prep and grading completed.' }
    ]
  },
  { 
    id: 5, client: 'Monroe Bathroom', address: '212 Birch Ct, North Haverbrook', status: 'In Progress', 
    budget: 25000, actual: 18000, margin: 28.0,
    startDate: '2024-07-10', endDate: '2024-08-20',
    activity: [
        { date: '2024-07-22', description: 'Tiling work started in shower.' },
        { date: '2024-07-19', description: 'Drywall installed and mudded.' }
    ]
  },
];

export const ASSEMBLIES: Assembly[] = [
  {
    id: 'ASM-001',
    name: 'Standard Bathroom Vanity Install (36-inch)',
    averageCost: 1750,
    variance: 5.2,
    lastUsed: '2024-07-10',
    items: [
      { description: '36" Vanity Cabinet', category: 'Material', quantity: 1, unit: 'ea', unitCost: 600 },
      { description: 'Vanity Countertop', category: 'Material', quantity: 1, unit: 'ea', unitCost: 450 },
      { description: 'Sink & Faucet', category: 'Material', quantity: 1, unit: 'set', unitCost: 200 },
      { description: 'Plumbing Labor for Install', category: 'Labor', quantity: 4, unit: 'hours', unitCost: 90 },
      { description: 'Demolition of old vanity', category: 'Labor', quantity: 2, unit: 'hours', unitCost: 70 },
    ],
  },
  {
    id: 'ASM-002',
    name: 'Standard Interior Door Install',
    averageCost: 525,
    variance: -2.1,
    lastUsed: '2024-06-22',
    items: [
      { description: 'Pre-hung Interior Door', category: 'Material', quantity: 1, unit: 'ea', unitCost: 250 },
      { description: 'Door Lockset', category: 'Material', quantity: 1, unit: 'ea', unitCost: 50 },
      { description: 'Shims, Sealant, Fasteners', category: 'Material', quantity: 1, unit: 'lot', unitCost: 25 },
      { description: 'Labor to install door', category: 'Labor', quantity: 2.5, unit: 'hours', unitCost: 80 },
    ],
  },
  {
    id: 'ASM-003',
    name: 'Drywall per sq ft (including finishing)',
    averageCost: 3.50,
    variance: 1.5,
    lastUsed: '2024-07-19',
    items: [
      { description: '1/2" Drywall Sheet', category: 'Material', quantity: 0.03125, unit: 'sheet', unitCost: 15 },
      { description: 'Joint Compound', category: 'Material', quantity: 1, unit: 'lot', unitCost: 0.50 },
      { description: 'Tape, Screws, etc.', category: 'Material', quantity: 1, unit: 'lot', unitCost: 0.25 },
      { description: 'Labor to hang and finish', category: 'Labor', quantity: 1, unit: 'lot', unitCost: 2.28 },
    ],
  }
];

export const INITIAL_ESTIMATE: Estimate = {
  id: 'EST-001',
  projectId: 2,
  projectName: 'Jefferson Kitchen Remodel',
  estimator: 'John Smith',
  contingencyPercentage: 10,
  markupPercentage: 15,
  lineItems: [
    { id: 'li-1', description: 'Demolition of existing kitchen', category: 'Labor', quantity: 24, unit: 'hours', unitCost: 75, total: 1800, actualCost: 1950 },
    { id: 'li-2', description: 'Standard Kitchen Cabinetry', category: 'Material', quantity: 1, unit: 'lot', unitCost: 8500, total: 8500, actualCost: 8350 },
    { id: 'li-3', description: 'Granite Countertops', category: 'Material', quantity: 60, unit: 'sq ft', unitCost: 80, total: 4800, actualCost: 5100 },
    { id: 'li-4', description: 'Plumbing Re-connection', category: 'Subcontractor', quantity: 1, unit: 'job', unitCost: 1200, total: 1200, actualCost: 1200 },
  ],
};

export const ESTIMATE_TEMPLATES: EstimateTemplate[] = [
    {
        id: 'tpl-1',
        name: 'Basic Bathroom Remodel',
        description: 'A standard template for a 5x8 bathroom gut and remodel, excluding high-end fixtures.',
        contingencyPercentage: 15,
        markupPercentage: 20,
        lineItems: [
            { description: 'Demolition of existing bathroom', category: 'Labor', quantity: 16, unit: 'hours', unitCost: 70 },
            { description: '36" Vanity Cabinet & Top', category: 'Material', quantity: 1, unit: 'ea', unitCost: 800 },
            { description: 'Standard Toilet', category: 'Material', quantity: 1, unit: 'ea', unitCost: 250 },
            { description: 'Tub/Shower Surround', category: 'Material', quantity: 1, unit: 'kit', unitCost: 1200 },
            { description: 'Floor Tile', category: 'Material', quantity: 40, unit: 'sq ft', unitCost: 8 },
            { description: 'Plumbing Rerough & Finish', category: 'Subcontractor', quantity: 1, unit: 'job', unitCost: 2000 },
            { description: 'Electrical Work (Vanity Light, Fan)', category: 'Subcontractor', quantity: 1, unit: 'job', unitCost: 800 },
        ]
    }
];