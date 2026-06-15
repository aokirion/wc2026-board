// scripts/validate.mjs
// data.json の整合性チェック（API 不使用・決定論）。
// 構造（48か国の group/seed・8人のロスター）は固定。
// 変わってよいのは match の hs/as/played、teams の status、meta.asOf、matches への追加のみ。
// 違反があれば exit 1（→ 自動更新タスクは push しない）。

import fs from "node:fs";
const DATA_PATH = new URL("../data.json", import.meta.url);
const STATUSES = new Set(["alive", "advanced", "eliminated"]);
const intScore = v => Number.isInteger(v) && v >= 0 && v <= 30;

// ── 不変の基準（[group, seed]） ──
const BASE_TEAMS = {
  "モロッコ":["C",8],"ベルギー":["G",9],"トルコ":["D",20],"カナダ":["B",27],"南アフリカ":["A",40],"キュラソー":["E",46],
  "ポルトガル":["K",5],"クロアチア":["L",11],"オーストラリア":["D",24],"ノルウェー":["I",28],"チュニジア":["F",35],"ガーナ":["L",45],
  "アルゼンチン":["J",3],"コロンビア":["K",12],"オーストリア":["J",22],"アルジェリア":["J",25],"パラグアイ":["D",33],"ニュージーランド":["G",48],
  "ブラジル":["C",6],"セネガル":["I",13],"日本":["F",17],"チェコ":["A",32],"スコットランド":["C",34],"ハイチ":["C",47],
  "フランス":["I",1],"ウルグアイ":["H",16],"韓国":["A",23],"スウェーデン":["F",31],"ウズベキスタン":["K",37],"ボスニア":["B",42],
  "イングランド":["L",4],"メキシコ":["A",14],"イラン":["G",19],"コートジボワール":["E",30],"コンゴ民主共和国":["K",36],"カボベルデ":["H",44],
  "オランダ":["F",7],"アメリカ":["D",15],"スイス":["B",18],"パナマ":["L",29],"カタール":["B",38],"ヨルダン":["J",43],
  "スペイン":["H",2],"ドイツ":["E",10],"エクアドル":["E",21],"エジプト":["G",26],"イラク":["I",39],"サウジアラビア":["H",41]
};
const BASE_PART = {
  "青木":["モロッコ","ベルギー","トルコ","カナダ","南アフリカ","キュラソー"],
  "薮野":["ポルトガル","クロアチア","オーストラリア","ノルウェー","チュニジア","ガーナ"],
  "久保田":["アルゼンチン","コロンビア","オーストリア","アルジェリア","パラグアイ","ニュージーランド"],
  "宮坂":["ブラジル","セネガル","日本","チェコ","スコットランド","ハイチ"],
  "山中":["フランス","ウルグアイ","韓国","スウェーデン","ウズベキスタン","ボスニア"],
  "曽根":["イングランド","メキシコ","イラン","コートジボワール","コンゴ民主共和国","カボベルデ"],
  "新城":["オランダ","アメリカ","スイス","パナマ","カタール","ヨルダン"],
  "勝間":["スペイン","ドイツ","エクアドル","エジプト","イラク","サウジアラビア"]
};

const errs = [];
let data;
try { data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")); }
catch (e) { console.error("✗ JSONとして読めません:", e.message); process.exit(1); }

if (!data.meta || typeof data.meta.asOf !== "string" || !data.meta.asOf.trim()) errs.push("meta.asOf が不正");

// teams：基準と完全一致（group/seed 固定、status のみ可変）
const keys = Object.keys(data.teams || {});
if (keys.length !== 48) errs.push(`teams 数 ${keys.length}(48期待)`);
for (const k of Object.keys(BASE_TEAMS)) {
  const t = data.teams && data.teams[k];
  if (!t) { errs.push(`欠落: ${k}`); continue; }
  if (t.group !== BASE_TEAMS[k][0]) errs.push(`group 改変: ${k}`);
  if (t.seed !== BASE_TEAMS[k][1]) errs.push(`seed 改変: ${k}`);
  if (!STATUSES.has(t.status)) errs.push(`status 不正: ${k}=${t.status}`);
  if (typeof t.flag !== "string" || !t.flag) errs.push(`flag 欠落: ${k}`);
}
for (const k of keys) if (!BASE_TEAMS[k]) errs.push(`未知の国が追加された: ${k}`);

// participants：基準ロスターと一致
const pnames = (data.participants || []).map(p => p.name);
for (const name of Object.keys(BASE_PART)) {
  const p = (data.participants || []).find(x => x.name === name);
  if (!p) { errs.push(`参加者欠落: ${name}`); continue; }
  const a = [...BASE_PART[name]].sort(), b = [...(p.teams || [])].sort();
  if (a.length !== b.length || a.some((v, i) => v !== b[i])) errs.push(`ロスター改変: ${name}`);
}
if (pnames.length !== 8) errs.push(`participants 数 ${pnames.length}(8期待)`);

// matches：各国は実在、確定試合は整数スコア（追加は可）
(data.matches || []).forEach((m, i) => {
  if (!data.teams[m.h] || !data.teams[m.a]) errs.push(`match[${i}] 不明な国`);
  if (m.played && (!intScore(m.hs) || !intScore(m.as))) errs.push(`match[${i}] スコア不正`);
});

if (errs.length) {
  console.error("✗ 検証失敗（" + errs.length + "件）:");
  errs.slice(0, 20).forEach(e => console.error("  - " + e));
  process.exit(1);
}
const played = (data.matches || []).filter(m => m.played).length;
const elim = Object.values(data.teams).filter(t => t.status === "eliminated").length;
console.log(`✓ 検証OK｜asOf ${data.meta.asOf}／消化 ${played} 試合／敗退 ${elim} か国／matches ${data.matches.length} 件`);
process.exit(0);
