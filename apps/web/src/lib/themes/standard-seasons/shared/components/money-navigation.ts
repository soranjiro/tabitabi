export const MONEY_NAVIGATION_CONTEXT = Symbol('standard-money-navigation');

export interface MoneyNavigationContext {
  openMoneyItem(itemId: string): void;
}
