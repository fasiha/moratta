# Moratta

A simple app for me to grind hiragana and katakana using real vocabulary.

## Usage

Go to https://fasiha.github.io/moratta/ and convert each word to roumaji.

There's no way to see what the "right" answer is in the website but the answer key is [here](./scripts/examples.json). If you think we should add another roumaji answer, open an [issue](https://github.com/fasiha/moratta/issues) or [get in touch](https://fasiha.github.io/#contact).

The words are sourced from [JMDict Simplified](https://github.com/scriptin/jmdict-simplified) which is sourced from the famous [JMDict](https://www.edrdg.org/jmdict/j_jmdict.html) Japanese–English dictionary everyone uses.

## Words

See this [script](./scripts/extractExamples.ts) for how we pick a handful of words for each hiragana and katakana mora. To run it,
1. Download a recent [release](https://github.com/scriptin/jmdict-simplified/releases) of JMDict Simplified
2. place `jmdict-eng-3.6.1.json` in the same directory as the script (`./scripts`),
3. (optional: if you downloaded a newer version, change the `JMDICT_FILENAME` in the script accordingly),
4. run `node --experimental-transform-types extractExamples.ts` (assumes a recent Node that can run TypeScript files).

This updates the answer key in [`examples.json`](./scripts/examples.json).

## Dev
Install [Git](https://git-scm.com) and [Node.js](https://nodejs.org).

Clone this repo:
```bash
$ git clone https://github.com/fasiha/moratta.git
cd moratta
```
Install dependencies:
```bash
$ npm install # or pnpm install or yarn install
```
To run the app in the development mode ([http://localhost:5173](http://localhost:5173)):
```bash
$ npm run dev
```
To build the app for production in the `dist` directory:
```bash
$ npm run build
```
After building, commit and push to GitHub to update the website:
```bash
$ git add dist -f
$ git commit -am dist
$ git push
```