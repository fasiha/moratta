// Download jmdict-simplified from https://github.com/scriptin/jmdict-simplified/releases
// run with `NODE_NO_WARNINGS=1 node --experimental-transform-types extractExamples.ts`

import { readFile, writeFile } from "fs/promises";
import { toRomaji } from "wanakana";

const JMDICT_FILENAME = "jmdict-eng-3.6.1.json";
const MIN_EXAMPLES = 50;

let hiragana =
  "ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなに" +
  "ぬねのはばぱひびぴふぶぷへべぺほぼまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖ";
let katakana =
  "ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニ" +
  "ヌネノハバパヒビピフブプヘベペホボマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶ";

if (hiragana.length !== katakana.length) {
  throw new Error("Kana strings not same length?");
}

let hira2kataMap: Map<string, string> = new Map([]);
hiragana.split("").forEach((h, i) => {
  hira2kataMap.set(h, katakana[i]);
});

function hira2kata(s: string) {
  return s
    .split("")
    .map((c) => hira2kataMap.get(c) || c)
    .join("");
}

const monographs =
  "あいうえおかがきぎくぐけげこごさざしじすずせぜそぞただちぢつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼまみむめもやゆよらりるれろわをんゔ".split(
    ""
  );
const digraphs =
  `きゃ,きゅ,きょ,しゃ,しゅ,しょ,ちゃ,ちゅ,ちょ,にゃ,にゅ,にょ,ひゃ,ひゅ,ひょ,みゃ,みゅ,みょ,りゃ,りゅ,りょ,ぎゃ,ぎゅ,ぎょ,ぢゃ,ぢゅ,ぢょ,びゃ,びゅ,びょ,ぴゃ,ぴゅ,ぴょ`
    .trim()
    .split(",");

type DB = Map<string, Set<string>>;
interface Word {
  id: string;
  kana: { common: boolean; text: string }[];
}
interface Jmdict {
  words: Word[];
}

const dbToStillLooking = (db: DB): Set<string> => {
  const stillLooking: Set<string> = new Set();
  for (const [key, val] of db) {
    if (val.size < MIN_EXAMPLES) {
      stillLooking.add(key);
    }
  }
  return stillLooking;
};

const serializeDb = (db: DB, isCommon: Set<string>): string => {
  const obj: Record<string, [string, boolean, string[]][]> = {};
  for (const [key, val] of db) {
    const res = [...val].map((x) => {
      const res = [x, isCommon.has(x), [toRomaji(x)]] as [
        string,
        boolean,
        string[]
      ];
      if (res[0] === "チラッチラッ") {
        res[2].push("chiracchira");
      }
      if (res[2][0].includes("n'")) {
        res[2].push(res[2][0].replaceAll(/n'/g, "nn"));
      }
      return res;
    });
    obj[key] = res.sort((a, b) => Number(b[1]) - Number(a[1]));
  }
  return JSON.stringify(obj, null, 1);
};

(async function main() {
  const jmdict: Jmdict = JSON.parse(await readFile(JMDICT_FILENAME, "utf8"));

  const db: DB = new Map();
  let stillLooking = new Set<string>();
  const isCommon = new Set<string>();

  for (const char of [...monographs, ...digraphs]) {
    db.set(char, new Set());
    db.set(hira2kata(char), new Set());
  }
  for (const entry of db.keys()) stillLooking.add(entry);

  const scanDb = (commonOnly = false) => {
    let wordsScanned = 0;
    for (const w of jmdict.words) {
      for (const { text, common } of w.kana) {
        if (commonOnly && !common) continue;
        if (text.includes("ーー") || text.includes("・")) continue;

        for (const char of stillLooking) {
          if (text.includes(char)) {
            db.get(char)!.add(text);
            if (common) isCommon.add(text);
          }
        }
      }
      stillLooking = dbToStillLooking(db);
      if (stillLooking.size === 0) {
        break;
      } else if (wordsScanned++ % 10000 === 0) {
        console.log("still looking", stillLooking.size);
      }
    }
  };
  scanDb(false);
  scanDb(true);

  await writeFile("examples.json", serializeDb(db, isCommon));
  console.log("missing", stillLooking);
})();
