import type { CreateMoneyFundTransactionInput, CreateMoneyItemInput, MoneyData, MoneyFundTransaction, MoneyItem, UpdateMoneyItemInput } from '@tabitabi/types';
import { apiClient } from './client';

export const moneyApi = {
  get: (itineraryId: string) => apiClient.get<MoneyData>(`/itineraries/${itineraryId}/money`, itineraryId),
  updateSettings: (itineraryId: string, budget_amount: number | null) =>
    apiClient.put<{ budget_amount: number | null }>(`/itineraries/${itineraryId}/money/settings`, { budget_amount }, itineraryId),
  addItem: (itineraryId: string, input: CreateMoneyItemInput) =>
    apiClient.post<MoneyItem>(`/itineraries/${itineraryId}/money/items`, input, itineraryId),
  updateItem: (itineraryId: string, itemId: string, input: UpdateMoneyItemInput) =>
    apiClient.put<MoneyItem>(`/itineraries/${itineraryId}/money/items/${itemId}`, input, itineraryId),
  deleteItem: (itineraryId: string, itemId: string) =>
    apiClient.delete(`/itineraries/${itineraryId}/money/items/${itemId}`, itineraryId),
  addFundTransaction: (itineraryId: string, input: CreateMoneyFundTransactionInput) =>
    apiClient.post<MoneyFundTransaction>(`/itineraries/${itineraryId}/money/fund-transactions`, input, itineraryId),
  deleteFundTransaction: (itineraryId: string, transactionId: string) =>
    apiClient.delete(`/itineraries/${itineraryId}/money/fund-transactions/${transactionId}`, itineraryId),
};
