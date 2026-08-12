export type RegionName =
  | "北海道"
  | "東北"
  | "関東"
  | "中部"
  | "近畿"
  | "中国"
  | "四国"
  | "九州・沖縄";

export interface ExplorePrefecture {
  id: number;
  name: string;
  shortName: string;
  slug: string;
  region: RegionName;
}

export const regions: RegionName[] = [
  "北海道",
  "東北",
  "関東",
  "中部",
  "近畿",
  "中国",
  "四国",
  "九州・沖縄",
];

export const travelTags = [
  "温泉",
  "グルメ",
  "絶景",
  "カフェ",
  "寺社・歴史",
  "アート",
  "子どもと",
  "ひとり旅",
] as const;

export const prefectures: ExplorePrefecture[] = [
  { id: 1, name: "北海道", shortName: "北海", slug: "hokkaido", region: "北海道" },
  { id: 2, name: "青森県", shortName: "青森", slug: "aomori", region: "東北" },
  { id: 3, name: "岩手県", shortName: "岩手", slug: "iwate", region: "東北" },
  { id: 4, name: "宮城県", shortName: "宮城", slug: "miyagi", region: "東北" },
  { id: 5, name: "秋田県", shortName: "秋田", slug: "akita", region: "東北" },
  { id: 6, name: "山形県", shortName: "山形", slug: "yamagata", region: "東北" },
  { id: 7, name: "福島県", shortName: "福島", slug: "fukushima", region: "東北" },
  { id: 8, name: "茨城県", shortName: "茨城", slug: "ibaraki", region: "関東" },
  { id: 9, name: "栃木県", shortName: "栃木", slug: "tochigi", region: "関東" },
  { id: 10, name: "群馬県", shortName: "群馬", slug: "gunma", region: "関東" },
  { id: 11, name: "埼玉県", shortName: "埼玉", slug: "saitama", region: "関東" },
  { id: 12, name: "千葉県", shortName: "千葉", slug: "chiba", region: "関東" },
  { id: 13, name: "東京都", shortName: "東京", slug: "tokyo", region: "関東" },
  { id: 14, name: "神奈川県", shortName: "神奈", slug: "kanagawa", region: "関東" },
  { id: 15, name: "新潟県", shortName: "新潟", slug: "niigata", region: "中部" },
  { id: 16, name: "富山県", shortName: "富山", slug: "toyama", region: "中部" },
  { id: 17, name: "石川県", shortName: "石川", slug: "ishikawa", region: "中部" },
  { id: 18, name: "福井県", shortName: "福井", slug: "fukui", region: "中部" },
  { id: 19, name: "山梨県", shortName: "山梨", slug: "yamanashi", region: "中部" },
  { id: 20, name: "長野県", shortName: "長野", slug: "nagano", region: "中部" },
  { id: 21, name: "岐阜県", shortName: "岐阜", slug: "gifu", region: "中部" },
  { id: 22, name: "静岡県", shortName: "静岡", slug: "shizuoka", region: "中部" },
  { id: 23, name: "愛知県", shortName: "愛知", slug: "aichi", region: "中部" },
  { id: 24, name: "三重県", shortName: "三重", slug: "mie", region: "近畿" },
  { id: 25, name: "滋賀県", shortName: "滋賀", slug: "shiga", region: "近畿" },
  { id: 26, name: "京都府", shortName: "京都", slug: "kyoto", region: "近畿" },
  { id: 27, name: "大阪府", shortName: "大阪", slug: "osaka", region: "近畿" },
  { id: 28, name: "兵庫県", shortName: "兵庫", slug: "hyogo", region: "近畿" },
  { id: 29, name: "奈良県", shortName: "奈良", slug: "nara", region: "近畿" },
  { id: 30, name: "和歌山県", shortName: "和歌", slug: "wakayama", region: "近畿" },
  { id: 31, name: "鳥取県", shortName: "鳥取", slug: "tottori", region: "中国" },
  { id: 32, name: "島根県", shortName: "島根", slug: "shimane", region: "中国" },
  { id: 33, name: "岡山県", shortName: "岡山", slug: "okayama", region: "中国" },
  { id: 34, name: "広島県", shortName: "広島", slug: "hiroshima", region: "中国" },
  { id: 35, name: "山口県", shortName: "山口", slug: "yamaguchi", region: "中国" },
  { id: 36, name: "徳島県", shortName: "徳島", slug: "tokushima", region: "四国" },
  { id: 37, name: "香川県", shortName: "香川", slug: "kagawa", region: "四国" },
  { id: 38, name: "愛媛県", shortName: "愛媛", slug: "ehime", region: "四国" },
  { id: 39, name: "高知県", shortName: "高知", slug: "kochi", region: "四国" },
  { id: 40, name: "福岡県", shortName: "福岡", slug: "fukuoka", region: "九州・沖縄" },
  { id: 41, name: "佐賀県", shortName: "佐賀", slug: "saga", region: "九州・沖縄" },
  { id: 42, name: "長崎県", shortName: "長崎", slug: "nagasaki", region: "九州・沖縄" },
  { id: 43, name: "熊本県", shortName: "熊本", slug: "kumamoto", region: "九州・沖縄" },
  { id: 44, name: "大分県", shortName: "大分", slug: "oita", region: "九州・沖縄" },
  { id: 45, name: "宮崎県", shortName: "宮崎", slug: "miyazaki", region: "九州・沖縄" },
  { id: 46, name: "鹿児島県", shortName: "鹿児", slug: "kagoshima", region: "九州・沖縄" },
  { id: 47, name: "沖縄県", shortName: "沖縄", slug: "okinawa", region: "九州・沖縄" },
];

export function findPrefecture(slug: string) {
  return prefectures.find((prefecture) => prefecture.slug === slug);
}

export function prefectureName(slug: string) {
  return findPrefecture(slug)?.name ?? slug;
}
