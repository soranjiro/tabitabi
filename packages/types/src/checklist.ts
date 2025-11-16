// Checklist types
export interface ChecklistItem {
  id: string;
  itineraryId: string;
  category?: string;
  itemName: string;
  isChecked: boolean;
  quantity: number;
  priority: 'low' | 'normal' | 'high';
  createdAt: string;
}

export interface CreateChecklistItemInput {
  category?: string;
  itemName: string;
  quantity?: number;
  priority?: 'low' | 'normal' | 'high';
}

export interface UpdateChecklistItemInput {
  category?: string;
  itemName?: string;
  isChecked?: boolean;
  quantity?: number;
  priority?: 'low' | 'normal' | 'high';
}
