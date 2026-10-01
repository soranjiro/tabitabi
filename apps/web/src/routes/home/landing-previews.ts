export type Preview = {
  id: string;
  image: string;
  itineraryId: string;
  title: string;
  duration: string;
  destination: string;
  accent: string;
  action: string;
  imagePosition: string;
  steps: Array<{ time: string; title: string }>;
};

export const previews: Preview[] = [
  {
    id: "spring",
    image: "/hero/background-spring.avif",
    itineraryId: "official-spring-public",
    title: "春の京都・宇治",
    duration: "2泊3日",
    destination: "京都",
    accent: "#ec858c",
    action: "#bc4f74",
    imagePosition: "center 48%",
    steps: [
      { time: "09:00", title: "清水寺参拝" },
      { time: "12:00", title: "祇園で懐石料理" },
      { time: "13:30", title: "祇園から嵐山へ移動" },
      { time: "15:00", title: "嵐山の桜散策" },
    ],
  },
  {
    id: "summer",
    image: "/hero/background-summer.avif",
    itineraryId: "official-summer-public",
    title: "夏休みの沖縄旅行",
    duration: "2泊3日",
    destination: "沖縄",
    accent: "#3f9ec6",
    action: "#236489",
    imagePosition: "center 52%",
    steps: [
      { time: "10:00", title: "那覇空港到着" },
      { time: "11:15", title: "空港からビーチへ移動" },
      { time: "14:00", title: "ビーチでシュノーケリング" },
      { time: "19:00", title: "恩納村リゾートホテル宿泊" },
    ],
  },
  {
    id: "autumn",
    image: "/hero/background-autumn.avif",
    itineraryId: "official-autumn-public",
    title: "日光・会津 紅葉と温泉",
    duration: "6泊7日",
    destination: "栃木",
    accent: "#c77145",
    action: "#98532e",
    imagePosition: "center 48%",
    steps: [
      { time: "09:00", title: "日光東照宮参拝" },
      { time: "12:00", title: "湯滝観瀑" },
      { time: "13:30", title: "湯滝から華厳滝へ移動" },
      { time: "15:00", title: "華厳滝" },
    ],
  },
  {
    id: "winter",
    image: "/hero/background-winter.avif",
    itineraryId: "official-winter-public",
    title: "冬の北海道 湯めぐり18日間",
    duration: "17泊18日",
    destination: "北海道",
    accent: "#7592b7",
    action: "#4c6083",
    imagePosition: "center 50%",
    steps: [
      { time: "08:00", title: "札幌駅から登別へ移動" },
      { time: "11:30", title: "登別温泉街を散策" },
      { time: "15:00", title: "温泉宿にチェックイン" },
      { time: "19:00", title: "温泉宿で夕食" },
    ],
  },
  {
    id: "plan",
    image: "/itinerary-backgrounds/coastal-drive.avif",
    itineraryId: "official-plan-public",
    title: "紫陽花の鎌倉・江の島",
    duration: "1泊2日",
    destination: "鎌倉・江の島",
    accent: "#668fb2",
    action: "#4f687e",
    imagePosition: "center 48%",
    steps: [
      { time: "08:30", title: "明月院の紫陽花" },
      { time: "10:15", title: "円覚寺を拝観" },
      { time: "13:30", title: "鶴岡八幡宮を参拝" },
      { time: "16:30", title: "鎌倉駅近くのホテルに宿泊" },
    ],
  },
  {
    id: "map",
    image: "/itinerary-backgrounds/japanese.avif",
    itineraryId: "official-map-public",
    title: "秋の金沢 王道まち歩き",
    duration: "1泊2日",
    destination: "金沢",
    accent: "#a96845",
    action: "#8c583a",
    imagePosition: "center 52%",
    steps: [
      { time: "09:50", title: "金沢駅に到着" },
      { time: "11:00", title: "近江町市場で海鮮ランチ" },
      { time: "13:00", title: "金沢城公園" },
      { time: "15:00", title: "金沢21世紀美術館" },
    ],
  },
];
