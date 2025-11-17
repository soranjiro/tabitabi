// Memo types
export interface Memo {
  id: string;
  itineraryId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemoInput {
  content: string;
}

export interface UpdateMemoInput {
  content: string;
}
