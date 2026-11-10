import { TRADES } from "./db.mjs";

const keywords = {
  Electrician: [
    "electric",
    "electrician",
    "bijli",
    "بجلی",
    "fan",
    "پنکھا",
    "switch",
    "سوئچ",
    "wiring",
    "وائرنگ",
  ],
  Plumber: ["plumb", "nal", "نل", "پانی", "water", "pipe", "پائپ", "leak", "لیک", "tap"],
  "AC technician": [
    "ac",
    "air conditioner",
    "aircon",
    "ایئر کنڈیشنر",
    "cooling",
    "کولنگ",
    "مکینک اے سی",
  ],
  Carpenter: ["carpenter", "wood", "لکڑی", "دروازہ", "door", "furniture", "فرنیچر", "cabinet"],
  Mechanic: ["mechanic", "گاڑی", "car", "bike", "موٹر", "motor", "engine", "انجن", "automobile"],
};

export function suggestTradeFromTranscript(transcript) {
  if (typeof transcript !== "string" || !transcript.trim()) return null;
  const text = transcript.toLocaleLowerCase();
  const matches = TRADES.map((trade) => ({
    trade,
    score: keywords[trade].reduce(
      (score, keyword) => score + (text.includes(keyword.toLocaleLowerCase()) ? 1 : 0),
      0,
    ),
  }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
  return matches.length === 1 || matches[0]?.score > matches[1]?.score ? matches[0].trade : null;
}
