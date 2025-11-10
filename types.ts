export type PermissionLevel = 'edit' | 'view' | 'none';

export interface Permissions {
  dashboard: PermissionLevel;
  projects: PermissionLevel;
  estimateBuilder: PermissionLevel;
  jobCosting: PermissionLevel;
  knowledgeBase: PermissionLevel;
  analytics: PermissionLevel;
}

export type UserRole = 'Admin' | 'Employee';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  permissions: Permissions;
}

export type ProjectStatus = 'In Progress' | 'Completed' | 'Planning' | 'On Hold';

export interface ProjectActivity {
    date: string;
    description: string;
}

export interface Project {
  id: number;
  client: string;
  address: string;
  status: ProjectStatus;
  budget: number;
  actual: number;
  margin: number;
  startDate: string;
  endDate: string;
  activity: ProjectActivity[];
}

export type CostCategory = 'Labor' | 'Material' | 'Subcontractor' | 'Equipment' | 'Other';

export interface LineItem {
  id: string;
  description: string;
  category: CostCategory;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
  actualCost?: number;
}

export interface AssemblyItem {
    description: string;
    category: CostCategory;
    quantity: number;
    unit: string;
    unitCost: number;
}
export interface Assembly {
  id: string;
  name: string;
  averageCost: number;
  variance: number;
  lastUsed: string;
  items: AssemblyItem[];
}

export interface Estimate {
  id: string;
  projectId: number;
  projectName: string;
  estimator: string;
  contingencyPercentage: number;
  markupPercentage: number;
  lineItems: LineItem[];
}

export interface EstimateTemplate {
  id: string;
  name: string;
  description: string;
  contingencyPercentage: number;
  markupPercentage: number;
  lineItems: Omit<LineItem, 'id' | 'total' | 'actualCost'>[];
}

export type PaymentStatus = 'Paid' | 'Unpaid' | 'Overdue';

export interface Invoice {
    id: string;
    estimateId: string;
    projectId: number;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    status: PaymentStatus;
    clientName: string;
    clientAddress: string;
    lineItems: LineItem[];
    subtotal: number;
    contingencyAmount: number;
    markupAmount: number;
    grandTotal: number;
}