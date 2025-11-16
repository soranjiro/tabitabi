// Budget types
export interface BudgetItem {
  id: string;
  itineraryId: string;
  category: string;
  itemName: string;
  plannedAmount: number;
  actualAmount?: number;
  currency: string;
  notes?: string;
  createdAt: string;
}

export interface CreateBudgetItemInput {
  category: string;
  itemName: string;
  plannedAmount: number;
  actualAmount?: number;
  currency?: string;
  notes?: string;
}

export interface UpdateBudgetItemInput {
  category?: string;
  itemName?: string;
  plannedAmount?: number;
  actualAmount?: number;
  currency?: string;
  notes?: string;
}

export interface BudgetSummary {
  totalPlanned: number;
  totalActual: number;
  difference: number;
  byCategory: Array<{
    category: string;
    planned: number;
    actual: number;
    difference: number;
  }>;
}
