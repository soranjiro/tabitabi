export const MONEY_NAVIGATION_CONTEXT = Symbol('itinerary-money-navigation');

export interface MoneyNavigationContext {
  openMoneyItem(itemId: string): void;
}
