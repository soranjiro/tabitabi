export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  prefecture: Prefecture | null;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
] as const;

export type Prefecture = (typeof PREFECTURES)[number];

export interface UserPublicProfile {
  username: string;
  created_at: string;
}

export interface UserSessionProfile extends UserPublicProfile {
  email: string;
  prefecture: Prefecture | null;
  email_verified: boolean;
  profile_complete: boolean;
}

export interface UserBookmark {
  user_id: string;
  itinerary_id: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  prefecture_slugs: string[];
  areas: string[];
  tags: string[];
}

export interface UserBookmarkWithItinerary extends UserBookmark {
  title: string;
  theme_id: string;
  is_password_protected: boolean;
  itinerary_updated_at: string;
  source_itinerary_id?: string | null;
  shared_itinerary_id?: string | null;
  shared_updated_at?: string | null;
}

export interface PublicBookmark {
  itinerary_id: string;
  title: string;
  theme_id: string;
  created_at: string;
  prefecture_slugs: string[];
  areas: string[];
  tags: string[];
  stops: number;
  copies: number;
  start_at: number | null;
  end_at: number | null;
  description: string;
}

export interface PublicFeedItem extends PublicBookmark {
  username: string;
}

export interface PublicFeedResponse {
  items: PublicFeedItem[];
  hasMore: boolean;
  total: number;
  destinationCounts: Record<string, number>;
}

export interface PublishItineraryInput {
  prefecture_slugs: string[];
  areas?: string[];
  tags?: string[];
}

export interface UpdateBookmarkMetadataInput {
  prefecture_slugs: string[];
  areas?: string[];
  tags?: string[];
}

export interface BootstrapProfileInput {
  username?: string;
  prefecture?: Prefecture;
}

export interface UpdateVisibilityInput {
  is_visible: boolean;
}

export interface SyncBookmarksInput {
  itinerary_ids: string[];
}

export interface SyncBookmarksResponse {
  synced: number;
  skipped: number;
}

export interface UpdateProfileInput {
  username?: string;
  prefecture?: Prefecture;
}

export interface UpdateProfileResponse {
  username: string;
  email: string;
  created_at: string;
  prefecture: Prefecture | null;
  email_verified: boolean;
  profile_complete: boolean;
}

export interface UserSearchResult {
  username: string;
  created_at: string;
}
