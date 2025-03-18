// Download jmdict-simplified from https://github.com/scriptin/jmdict-simplified/releases
// run with `NODE_NO_WARNINGS=1 node --experimental-transform-types extractExamples.ts`

import { readFile, writeFile } from "fs/promises";
import { toRomaji, toKatakana, isHiragana } from "wanakana";

const JMDICT_FILENAME = "jmdict-eng-3.6.1.json";
const MIN_EXAMPLES = 50;

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

const toRomajiFixed: typeof toRomaji = (x, y) =>
  toRomaji(
    x
      ?.replaceAll(/[づヅ]/g, "du")
      .replace(/ぢゅ/g, "dyu")
      .replace(/ぢょ/g, "dyo")
      .replace(/ぢゃ/g, "dya")
      .replace(/[ぢヂ]/g, "di"),
    y
  ).replace(/n'/g, "n"); // this allows technically incorrect submissions but I assume that's ok
const serializeDb = (db: DB, isCommon: Set<string>): string => {
  const obj: Record<string, [string, boolean, string[]][]> = {};
  for (const [key, val] of db) {
    const res = [...val].map((x) => {
      const simpleRoumaji = toRomajiFixed(x);
      // we can likely drop the third item back to a single string instead of an array
      const res = [x, isCommon.has(x), [simpleRoumaji]] as [
        string,
        boolean,
        string[]
      ];
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
    db.set(toKatakana(char), new Set());
  }
  for (const entry of db.keys()) stillLooking.add(entry);

  const scanDb = (commonOnly = false) => {
    let wordsScanned = 0;
    for (const w of jmdict.words) {
      for (const { text, common } of w.kana) {
        if (commonOnly && !common) continue;
        if (text.includes("ーー") || text.includes("・")) continue;
        {
          const idx = text.indexOf("ー");
          const prev: string | undefined = text[idx - 1];
          if (isHiragana(prev)) continue;
        }

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
