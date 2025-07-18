export interface Couple {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  role: 'husband' | 'wife';
  coupleId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  payerId: string; // User ID
  coupleId: string;
  expenseYear: number;
  expenseMonth: number;
  // Custom allocation ratio fields
  customHusbandRatio?: number | null;
  customWifeRatio?: number | null;
  usesCustomRatio: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AllocationRatio {
  id: string;
  coupleId: string;
  husbandRatio: number;
  wifeRatio: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Settlement {
  id: string;
  expenseId: string;
  husbandAmount: number;
  wifeAmount: number;
  payer: 'husband' | 'wife';
  receiver: 'husband' | 'wife';
  settlementAmount: number;
  status: 'pending' | 'approved' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  // Additional expense details for display
  expenseDescription?: string;
  expenseAmount?: number;
  // Custom allocation ratio fields
  customHusbandRatio?: number | null;
  customWifeRatio?: number | null;
  usesCustomRatio: boolean;
}

export interface CreateExpenseRequest {
  description: string;
  amount: number;
  payerId: string;
  coupleId: string;
  expenseYear?: number; // Optional - defaults to current year
  expenseMonth?: number; // Optional - defaults to current month
  // Custom allocation ratio fields
  customHusbandRatio?: number;
  customWifeRatio?: number;
  usesCustomRatio?: boolean;
}

export interface UpdateExpenseAllocationRatioRequest {
  customHusbandRatio: number;
  customWifeRatio: number;
  usesCustomRatio: boolean;
}

export interface UpdateExpenseRequest {
  description?: string;
  amount?: number;
  payerId?: string;
  expenseYear?: number;
  expenseMonth?: number;
}

export interface UpdateAllocationRatioRequest {
  husbandRatio: number;
  wifeRatio: number;
}

// Monthly expense specific interfaces
export interface MonthlyExpenseSummary {
  year: number;
  month: number;
  totalAmount: number;
  totalExpenses: number;
  husbandAmount: number;
  wifeAmount: number;
}

export interface MonthlyExpenseRequest {
  year: number;
  month: number;
}

export interface MonthlyExpenseStats {
  currentMonth: MonthlyExpenseSummary;
  previousMonth: MonthlyExpenseSummary;
  yearToDate: {
    totalAmount: number;
    totalExpenses: number;
    monthlyAverages: number;
  };
}

export interface CreateCoupleRequest {
  name: string;
}

export interface CreateUserRequest {
  name: string;
  role: 'husband' | 'wife';
  coupleId: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
} 
