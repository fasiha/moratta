// Download jmdict-simplified from https://github.com/scriptin/jmdict-simplified/releases
// run with `NODE_NO_WARNINGS=1 node --experimental-transform-types extractExamples.ts`

import { readFile, writeFile } from "fs/promises";
import { toRomaji } from "wanakana";

let hiragana =
  "ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなに" +
  "ぬねのはばぱひびぴふぶぷへべぺほぼまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖ";
let katakana =
  "ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニ" +
  "ヌネノハバパヒビピフブプヘベペホボマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶ";

if (hiragana.length !== katakana.length) {
  throw new Error("Kana strings not same length?");
}

let kata2hiraMap: Map<string, string> = new Map([]);
let hira2kataMap: Map<string, string> = new Map([]);
hiragana.split("").forEach((h, i) => {
  kata2hiraMap.set(katakana[i], h);
  hira2kataMap.set(h, katakana[i]);
});

function kata2hira(s: string) {
  return s
    .split("")
    .map((c) => kata2hiraMap.get(c) || c)
    .join("");
}
function hira2kata(s: string) {
  return s
    .split("")
    .map((c) => hira2kataMap.get(c) || c)
    .join("");
}

/*
There are other ways of doing this. In Unicode, katakana is 96 codepoints above hiragana. So
`String.fromCharCode(hiragana.charCodeAt(0) + 96)` will produce katakana. In speed tests though, the above Map-based
approach had the least variability in runtime (200 to 800 microseconds), while arithmetic-based approaches used 100 to
1500 microseconds.
*/

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
const MIN_EXAMPLES = 50;

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
    const res = [...val].map(
      (x) => [x, isCommon.has(x), [toRomaji(x)]] as [string, boolean, string[]]
    );
    obj[key] = res.sort((a, b) => Number(b[1]) - Number(a[1]));
  }
  return JSON.stringify(obj, null, 1);
};

(async function main() {
  const jmdict: Jmdict = JSON.parse(
    await readFile("jmdict-eng-3.6.1.json", "utf8")
  );

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
