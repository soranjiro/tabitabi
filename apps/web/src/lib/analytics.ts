/**
 * Google Analytics ユーティリティ
 *
 * イベント追跡用の関数を提供します
 */

/**
 * ページビューイベントを記録
 * @param path ページパス
 * @param title ページタイトル
 */
export function trackPageView(path: string, title: string) {
  if (typeof window === 'undefined') return;

  const gtag = (window as any).gtag;
  if (gtag) {
    gtag('event', 'page_view', {
      page_path: path,
      page_title: title
    });
  }
}

/**
 * しおり作成イベントを記録
 * @param themeId テーマID
 * @param hasPassword パスワード設定の有無
 */
export function trackItineraryCreated(themeId: string, hasPassword: boolean) {
  if (typeof window === 'undefined') return;

  const gtag = (window as any).gtag;
  if (gtag) {
    gtag('event', 'itinerary_created', {
      theme_id: themeId,
      has_password: hasPassword,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * しおり表示イベントを記録
 * @param themeId テーマID
 */
export function trackItineraryViewed(themeId: string) {
  if (typeof window === 'undefined') return;

  const gtag = (window as any).gtag;
  if (gtag) {
    gtag('event', 'itinerary_viewed', {
      theme_id: themeId,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * しおり共有イベントを記録
 * @param themeId テーマID
 * @param shareMethod 共有方法 (url, twitter, line等)
 */
export function trackShareItinerary(themeId: string, shareMethod: string) {
  if (typeof window === 'undefined') return;

  const gtag = (window as any).gtag;
  if (gtag) {
    gtag('event', 'share_itinerary', {
      theme_id: themeId,
      share_method: shareMethod,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * テーマ選択イベントを記録
 * @param themeId テーマID
 */
export function trackThemeSelected(themeId: string) {
  if (typeof window === 'undefined') return;

  const gtag = (window as any).gtag;
  if (gtag) {
    gtag('event', 'theme_selected', {
      theme_id: themeId,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * デモモード開始イベントを記録
 */
export function trackDemoStarted() {
  if (typeof window === 'undefined') return;

  const gtag = (window as any).gtag;
  if (gtag) {
    gtag('event', 'demo_started', {
      timestamp: new Date().toISOString()
    });
  }
}
