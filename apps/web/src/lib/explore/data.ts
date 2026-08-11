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
  count: number;
  x: number;
  y: number;
}

export interface PublicItinerarySummary {
  id: string;
  title: string;
  author: string;
  authorInitial: string;
  duration: string;
  prefectures: string[];
  prefectureSlugs: string[];
  stops: number;
  copies: number;
  description: string;
  accent: "coral" | "ocean" | "forest" | "sun" | "lavender" | "ink";
  stamp: string;
  publishedAt: string;
}

export interface PublicItineraryDetail extends PublicItinerarySummary {
  dateRange: string;
  updatedAt: string;
  intro: string;
  memo: string;
  days: Array<{
    day: number;
    date: string;
    label: string;
    steps: Array<{
      time: string;
      title: string;
      location: string;
      note?: string;
      kind: "move" | "food" | "sight" | "stay" | "shop";
    }>;
  }>;
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

export const prefectures: ExplorePrefecture[] = [
  { id: 1, name: "北海道", shortName: "北海", slug: "hokkaido", region: "北海道", count: 128, x: 82, y: 8 },
  { id: 2, name: "青森県", shortName: "青森", slug: "aomori", region: "東北", count: 34, x: 77, y: 20 },
  { id: 3, name: "岩手県", shortName: "岩手", slug: "iwate", region: "東北", count: 28, x: 80, y: 29 },
  { id: 4, name: "宮城県", shortName: "宮城", slug: "miyagi", region: "東北", count: 61, x: 78, y: 38 },
  { id: 5, name: "秋田県", shortName: "秋田", slug: "akita", region: "東北", count: 25, x: 72, y: 29 },
  { id: 6, name: "山形県", shortName: "山形", slug: "yamagata", region: "東北", count: 32, x: 71, y: 38 },
  { id: 7, name: "福島県", shortName: "福島", slug: "fukushima", region: "東北", count: 47, x: 74, y: 47 },
  { id: 8, name: "茨城県", shortName: "茨城", slug: "ibaraki", region: "関東", count: 39, x: 77, y: 56 },
  { id: 9, name: "栃木県", shortName: "栃木", slug: "tochigi", region: "関東", count: 42, x: 70, y: 52 },
  { id: 10, name: "群馬県", shortName: "群馬", slug: "gunma", region: "関東", count: 44, x: 64, y: 52 },
  { id: 11, name: "埼玉県", shortName: "埼玉", slug: "saitama", region: "関東", count: 52, x: 68, y: 60 },
  { id: 12, name: "千葉県", shortName: "千葉", slug: "chiba", region: "関東", count: 75, x: 78, y: 65 },
  { id: 13, name: "東京都", shortName: "東京", slug: "tokyo", region: "関東", count: 214, x: 70, y: 68 },
  { id: 14, name: "神奈川県", shortName: "神奈", slug: "kanagawa", region: "関東", count: 97, x: 65, y: 72 },
  { id: 15, name: "新潟県", shortName: "新潟", slug: "niigata", region: "中部", count: 48, x: 62, y: 42 },
  { id: 16, name: "富山県", shortName: "富山", slug: "toyama", region: "中部", count: 36, x: 54, y: 48 },
  { id: 17, name: "石川県", shortName: "石川", slug: "ishikawa", region: "中部", count: 58, x: 48, y: 45 },
  { id: 18, name: "福井県", shortName: "福井", slug: "fukui", region: "中部", count: 29, x: 47, y: 56 },
  { id: 19, name: "山梨県", shortName: "山梨", slug: "yamanashi", region: "中部", count: 55, x: 61, y: 63 },
  { id: 20, name: "長野県", shortName: "長野", slug: "nagano", region: "中部", count: 81, x: 59, y: 53 },
  { id: 21, name: "岐阜県", shortName: "岐阜", slug: "gifu", region: "中部", count: 46, x: 51, y: 59 },
  { id: 22, name: "静岡県", shortName: "静岡", slug: "shizuoka", region: "中部", count: 73, x: 59, y: 72 },
  { id: 23, name: "愛知県", shortName: "愛知", slug: "aichi", region: "中部", count: 68, x: 52, y: 69 },
  { id: 24, name: "三重県", shortName: "三重", slug: "mie", region: "近畿", count: 41, x: 47, y: 72 },
  { id: 25, name: "滋賀県", shortName: "滋賀", slug: "shiga", region: "近畿", count: 37, x: 44, y: 62 },
  { id: 26, name: "京都府", shortName: "京都", slug: "kyoto", region: "近畿", count: 186, x: 39, y: 60 },
  { id: 27, name: "大阪府", shortName: "大阪", slug: "osaka", region: "近畿", count: 154, x: 39, y: 70 },
  { id: 28, name: "兵庫県", shortName: "兵庫", slug: "hyogo", region: "近畿", count: 76, x: 33, y: 64 },
  { id: 29, name: "奈良県", shortName: "奈良", slug: "nara", region: "近畿", count: 63, x: 44, y: 72 },
  { id: 30, name: "和歌山県", shortName: "和歌", slug: "wakayama", region: "近畿", count: 35, x: 40, y: 80 },
  { id: 31, name: "鳥取県", shortName: "鳥取", slug: "tottori", region: "中国", count: 24, x: 27, y: 58 },
  { id: 32, name: "島根県", shortName: "島根", slug: "shimane", region: "中国", count: 27, x: 20, y: 59 },
  { id: 33, name: "岡山県", shortName: "岡山", slug: "okayama", region: "中国", count: 46, x: 29, y: 67 },
  { id: 34, name: "広島県", shortName: "広島", slug: "hiroshima", region: "中国", count: 69, x: 22, y: 68 },
  { id: 35, name: "山口県", shortName: "山口", slug: "yamaguchi", region: "中国", count: 32, x: 14, y: 68 },
  { id: 36, name: "徳島県", shortName: "徳島", slug: "tokushima", region: "四国", count: 25, x: 34, y: 78 },
  { id: 37, name: "香川県", shortName: "香川", slug: "kagawa", region: "四国", count: 31, x: 29, y: 75 },
  { id: 38, name: "愛媛県", shortName: "愛媛", slug: "ehime", region: "四国", count: 38, x: 23, y: 79 },
  { id: 39, name: "高知県", shortName: "高知", slug: "kochi", region: "四国", count: 30, x: 28, y: 85 },
  { id: 40, name: "福岡県", shortName: "福岡", slug: "fukuoka", region: "九州・沖縄", count: 104, x: 9, y: 67 },
  { id: 41, name: "佐賀県", shortName: "佐賀", slug: "saga", region: "九州・沖縄", count: 22, x: 4, y: 73 },
  { id: 42, name: "長崎県", shortName: "長崎", slug: "nagasaki", region: "九州・沖縄", count: 36, x: 1, y: 80 },
  { id: 43, name: "熊本県", shortName: "熊本", slug: "kumamoto", region: "九州・沖縄", count: 51, x: 10, y: 80 },
  { id: 44, name: "大分県", shortName: "大分", slug: "oita", region: "九州・沖縄", count: 48, x: 16, y: 74 },
  { id: 45, name: "宮崎県", shortName: "宮崎", slug: "miyazaki", region: "九州・沖縄", count: 28, x: 15, y: 84 },
  { id: 46, name: "鹿児島県", shortName: "鹿児", slug: "kagoshima", region: "九州・沖縄", count: 43, x: 8, y: 90 },
  { id: 47, name: "沖縄県", shortName: "沖縄", slug: "okinawa", region: "九州・沖縄", count: 89, x: 1, y: 94 },
];

export const publicItineraries: PublicItinerarySummary[] = [
  {
    id: "kyoto-weekend",
    title: "朝と余白を味わう、2泊3日の京都",
    author: "mio_trips",
    authorInitial: "M",
    duration: "2泊3日",
    prefectures: ["京都府", "大阪府"],
    prefectureSlugs: ["kyoto", "osaka"],
    stops: 12,
    copies: 86,
    description: "静かな朝の寺院と喫茶店を中心にした、詰め込みすぎない京都旅。",
    accent: "coral",
    stamp: "京",
    publishedAt: "2026.08.08",
  },
  {
    id: "hokkaido-summer",
    title: "花畑と小さな町をめぐる夏の北海道",
    author: "sora_days",
    authorInitial: "S",
    duration: "3泊4日",
    prefectures: ["北海道"],
    prefectureSlugs: ["hokkaido"],
    stops: 16,
    copies: 64,
    description: "美瑛、富良野、旭川をレンタカーでつなぐ、景色が主役の4日間。",
    accent: "forest",
    stamp: "北",
    publishedAt: "2026.08.06",
  },
  {
    id: "setouchi-art",
    title: "島から島へ。瀬戸内アート旅",
    author: "nagi_note",
    authorInitial: "N",
    duration: "2泊3日",
    prefectures: ["香川県", "岡山県"],
    prefectureSlugs: ["kagawa", "okayama"],
    stops: 10,
    copies: 51,
    description: "直島と豊島をフェリーで渡る、建築とアートを楽しむ週末。",
    accent: "ocean",
    stamp: "島",
    publishedAt: "2026.08.03",
  },
  {
    id: "fukuoka-food",
    title: "おいしい福岡、朝から夜まで",
    author: "haru_tabememo",
    authorInitial: "H",
    duration: "1泊2日",
    prefectures: ["福岡県"],
    prefectureSlugs: ["fukuoka"],
    stops: 9,
    copies: 73,
    description: "市場の朝ごはんから屋台まで。食べたいものを無理なくつないだ旅程。",
    accent: "sun",
    stamp: "食",
    publishedAt: "2026.08.01",
  },
  {
    id: "kamakura-coast",
    title: "海沿いを歩く、鎌倉ひとり旅",
    author: "ao_weekend",
    authorInitial: "A",
    duration: "日帰り",
    prefectures: ["神奈川県"],
    prefectureSlugs: ["kanagawa"],
    stops: 7,
    copies: 44,
    description: "北鎌倉から江ノ島まで、電車と徒歩で気ままにめぐる一日。",
    accent: "lavender",
    stamp: "海",
    publishedAt: "2026.07.30",
  },
  {
    id: "nagano-books",
    title: "本と温泉に会いに行く長野の休日",
    author: "tsuki_trip",
    authorInitial: "T",
    duration: "1泊2日",
    prefectures: ["長野県"],
    prefectureSlugs: ["nagano"],
    stops: 8,
    copies: 39,
    description: "松本の本屋と建築を歩いて、浅間温泉でゆっくり過ごす小旅行。",
    accent: "ink",
    stamp: "本",
    publishedAt: "2026.07.27",
  },
  {
    id: "kyoto-garden",
    title: "庭園と甘味をめぐる京都一日散歩",
    author: "rin_walks",
    authorInitial: "R",
    duration: "日帰り",
    prefectures: ["京都府"],
    prefectureSlugs: ["kyoto"],
    stops: 6,
    copies: 31,
    description: "東山の庭園と和菓子店をゆっくり歩く、午後までの短い旅。",
    accent: "forest",
    stamp: "庭",
    publishedAt: "2026.07.24",
  },
  {
    id: "kyoto-craft",
    title: "手しごとを訪ねる、京都と宇治",
    author: "koto_collect",
    authorInitial: "K",
    duration: "1泊2日",
    prefectures: ["京都府"],
    prefectureSlugs: ["kyoto"],
    stops: 8,
    copies: 27,
    description: "器、染め、茶。つくり手の店を訪ねながら宇治まで足を延ばす旅。",
    accent: "lavender",
    stamp: "工",
    publishedAt: "2026.07.20",
  },
  {
    id: "kyoto-night",
    title: "夕暮れから始める、京都の夜散歩",
    author: "yoi_trip",
    authorInitial: "Y",
    duration: "1泊2日",
    prefectures: ["京都府"],
    prefectureSlugs: ["kyoto"],
    stops: 7,
    copies: 24,
    description: "夕方のチェックインから、灯りのきれいな路地と夜喫茶をめぐる旅。",
    accent: "ink",
    stamp: "夜",
    publishedAt: "2026.07.18",
  },
  {
    id: "kyoto-family",
    title: "子どもと楽しむ、ゆったり京都鉄道旅",
    author: "family_journey",
    authorInitial: "F",
    duration: "2泊3日",
    prefectures: ["京都府"],
    prefectureSlugs: ["kyoto"],
    stops: 11,
    copies: 19,
    description: "鉄道博物館と水族館を中心に、移動を少なくした家族向けプラン。",
    accent: "sun",
    stamp: "鉄",
    publishedAt: "2026.07.15",
  },
];

export const kyotoItinerary: PublicItineraryDetail = {
  ...publicItineraries[0],
  dateRange: "2026年9月19日（土）— 9月21日（月）",
  updatedAt: "2026年8月8日",
  intro: "朝は少し早く、午後には余白を。混雑を避けながら、京都らしい静けさと日常の喫茶を楽しむ2泊3日のプランです。最後は大阪で粉ものを食べて帰ります。",
  memo: "寺社は開門直後がおすすめ。歩く時間が長いので、履き慣れた靴で。市バスだけでなく地下鉄も使うと移動が楽でした。",
  days: [
    {
      day: 1,
      date: "9/19 SAT",
      label: "東山の朝、鴨川の夕方",
      steps: [
        { time: "08:10", title: "京都駅に到着", location: "JR京都駅", note: "コインロッカーは中央口側が便利", kind: "move" },
        { time: "09:00", title: "無鄰菴の庭を歩く", location: "無鄰菴", note: "朝の時間帯を事前予約", kind: "sight" },
        { time: "11:00", title: "岡崎の喫茶店で早めの昼食", location: "岡崎エリア", kind: "food" },
        { time: "15:30", title: "鴨川を散歩して宿へ", location: "出町柳〜丸太町", kind: "sight" },
        { time: "18:00", title: "町家の小さな宿にチェックイン", location: "京都御所南", kind: "stay" },
      ],
    },
    {
      day: 2,
      date: "9/20 SUN",
      label: "嵯峨野と本屋をめぐる日",
      steps: [
        { time: "07:30", title: "嵐電で嵐山へ", location: "四条大宮駅", kind: "move" },
        { time: "08:15", title: "常寂光寺の静かな朝", location: "常寂光寺", kind: "sight" },
        { time: "11:30", title: "季節の野菜で昼ごはん", location: "嵯峨野", kind: "food" },
        { time: "15:00", title: "小さな本屋とレコード店", location: "河原町丸太町", note: "気になった店だけ寄る余白時間", kind: "shop" },
        { time: "19:00", title: "おばんざいの夜ごはん", location: "烏丸御池", kind: "food" },
      ],
    },
    {
      day: 3,
      date: "9/21 MON",
      label: "朝市から大阪へ",
      steps: [
        { time: "08:00", title: "朝市でパンと果物", location: "平安神宮前", kind: "food" },
        { time: "10:30", title: "京阪電車で大阪へ", location: "三条駅 → 淀屋橋駅", kind: "move" },
        { time: "12:00", title: "たこ焼きと喫茶店", location: "中崎町", kind: "food" },
        { time: "16:00", title: "新大阪から帰路へ", location: "JR新大阪駅", kind: "move" },
      ],
    },
  ],
};

export const featuredDestinations = ["kyoto", "hokkaido", "fukuoka", "okinawa", "kanagawa", "nagano"];

export function findPrefecture(slug: string) {
  return prefectures.find((prefecture) => prefecture.slug === slug);
}

export function findPublicItinerary(id: string) {
  if (id === kyotoItinerary.id) return kyotoItinerary;
  return publicItineraries.find((itinerary) => itinerary.id === id);
}

export function getAreaItineraries(slug: string) {
  return publicItineraries.filter((itinerary) => itinerary.prefectureSlugs.includes(slug));
}
