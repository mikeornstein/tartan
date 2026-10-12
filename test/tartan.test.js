import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { DEFAULT_SHADES } from "../js/colours.js";
import { PRESETS } from "../js/presets.js";
import {
  buildDesign,
  colourAt,
  decodeShare,
  encodeShare,
  expandTokens,
  formatPalette,
  formatThreadcount,
  moveToken,
  parsePalette,
  parseThreadcount,
  settSvg,
  threadTotal,
  twillMaskRects,
  warpShows,
  withCount,
} from "../js/tartan.js";

const PALETTE = "K=BLACK;DR=#8B0000#DARK RED;G=GREEN;";
const SYMMETRIC = "DR/8 G64 K44 G/64";
const ASYMMETRIC = "...DR8 G64 K44 G64...";
const SHEET_CODES = [
  "LR", "R", "DR", "O", "DO", "LY", "Y", "DY", "LG", "G", "DG",
  "LB", "B", "DB", "LP", "P", "DP", "W", "LN", "N", "DN", "K", "LT", "T", "DT",
];

test("palette example round-trips and name-only uses the sheet default", () => {
  const parsed = parsePalette(PALETTE);
  assert.equal(formatPalette(parsed.entries), PALETTE);
  const black = parsed.entries[0];
  const red = parsed.entries[1];
  assert.equal(black.explicitHex, null);
  assert.equal(black.hex, DEFAULT_SHADES.K);
  assert.equal(red.explicitHex, "8B0000");
  assert.equal(red.hex, "8B0000");
  assert.equal(red.name, "DARK RED");
});

test("threadcount examples round-trip unchanged", () => {
  for (const sample of [SYMMETRIC, ASYMMETRIC, "B/24 W4 B24 R2 K24 G24 W/2", "...B24 W4 B24 R2 K24 G24 W2..."]) {
    assert.equal(formatThreadcount(parseThreadcount(sample)), sample);
  }
});

test("DR/8 expands to 288 threads, woven once at each pivot", () => {
  const parsed = parseThreadcount(SYMMETRIC);
  const runs = expandTokens(parsed);
  assert.deepEqual(
    runs.map((run) => `${run.code}${run.count}`),
    ["DR8", "G64", "K44", "G64", "K44", "G64"],
  );
  assert.equal(threadTotal(runs), 288);
});

test("asymmetric example repeats with no mirror", () => {
  const parsed = parseThreadcount(ASYMMETRIC);
  assert.equal(parsed.mode, "asymmetric");
  const runs = expandTokens(parsed);
  assert.deepEqual(
    runs.map((run) => `${run.code}${run.count}`),
    ["DR8", "G64", "K44", "G64"],
  );
  assert.equal(threadTotal(runs), 180);
});

test("2/2 twill rule at each crossing", () => {
  const design = buildDesign(PALETTE, SYMMETRIC);
  assert.equal(design.total, 288);
  const warp = design.flat.map((thread) => `warp-${thread.code}`);
  const weft = design.flat.map((thread) => `weft-${thread.code}`);
  for (let y = 0; y < design.total; y += 1) {
    for (let x = 0; x < design.total; x += 1) {
      const expectWarp = (x + y) % 4 === 0 || (x + y) % 4 === 1;
      assert.equal(warpShows(x, y), expectWarp);
      const got = colourAt(x, y, warp, weft);
      assert.equal(got, expectWarp ? warp[x] : weft[y]);
    }
  }
});

test("twill mask covers exactly the warp cells", () => {
  const covered = new Set();
  for (const rect of twillMaskRects()) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      for (let y = rect.y; y < rect.y + rect.height; y += 1) {
        assert.equal(warpShows(x, y), true);
        covered.add(`${x},${y}`);
      }
    }
  }
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      assert.equal(covered.has(`${x},${y}`), warpShows(x, y));
    }
  }
});

test("hints stay non-blocking and name the usual cases", () => {
  const oneEnd = buildDesign(PALETTE, "B/24 W4");
  assert.ok(oneEnd.hints.some((hint) => hint.id === "one-slash"));
  assert.ok(oneEnd.total > 0);

  const mixed = buildDesign(PALETTE, "...DR/8 G64...");
  assert.ok(mixed.hints.some((hint) => hint.id === "mixed"));
  assert.equal(mixed.thread.mode, "mixed");
  assert.equal(mixed.runs.length, parseThreadcount("...DR/8 G64...").tokens.length);

  const odd = buildDesign("B=BLUE;G=GREEN;", "B/9 G/4");
  assert.ok(odd.hints.some((hint) => hint.message.includes("usually even")));

  const short = buildDesign("K=BLACK;R=RED;", "K/10 R10 K/10");
  assert.ok(short.total < 100);
  assert.ok(short.hints.some((hint) => hint.message.includes("usually reads as a check")));

  const unknown = buildDesign("K=BLACK;", "K4 ZZ8");
  assert.ok(unknown.hints.some((hint) => hint.message.includes("Unknown colour code ZZ")));
  assert.equal(unknown.flat.at(-1).hex, "B9B2A9");
});

test("Royal Stewart full sett is 424 and the written half is 288", () => {
  const preset = PRESETS.find((item) => item.id === "royal-stewart");
  const design = buildDesign(preset.palette, preset.threadcount);
  assert.equal(design.written, 288);
  assert.equal(design.total, 424);
  assert.equal(design.thread.mode, "symmetric");
});

test("Hunting Stewart repeats the published order with no mirror", () => {
  const preset = PRESETS.find((item) => item.id === "hunting-stewart");
  const design = buildDesign(preset.palette, preset.threadcount);
  assert.equal(design.thread.mode, "asymmetric");
  assert.equal(design.total, design.written);
  assert.equal(design.total, 222);
  assert.deepEqual(
    design.runs.map((run) => `${run.code}${run.count}`),
    preset.threadcount.replace(/^\.\.\.|\.\.\.$/g, "").split(" "),
  );
  assert.notEqual(design.runs.at(-1).code, design.runs[0].code);
});

test("Balmoral written count is 304 and the slash form is our conversion", () => {
  const preset = PRESETS.find((item) => item.id === "balmoral");
  const design = buildDesign(preset.palette, preset.threadcount);
  assert.equal(design.written, 304);
  assert.equal(design.thread.mode, "symmetric");
  assert.equal(design.total, 304 + (304 - 10 - 6));
  assert.match(preset.countNote, /converted by us, not quoted/i);
  assert.match(preset.yarnNote, /twisted black-and-white yarn/);
});

test("five presets load with a source, four are not available", () => {
  const ready = PRESETS.filter((preset) => preset.available);
  const missing = PRESETS.filter((preset) => !preset.available);
  assert.equal(ready.length, 5);
  assert.equal(missing.length, 4);
  for (const preset of ready) {
    assert.equal(typeof preset.story, "string");
    assert.equal(preset.story.includes("\n"), false);
    assert.match(preset.sourceUrl, /^https:\/\/web\.archive\.org\//);
    assert.match(preset.sourceLabel, /Scottish Tartans Authority/);
    const design = buildDesign(preset.palette, preset.threadcount);
    assert.equal(design.hints.some((hint) => hint.id === "unknown"), false);
    assert.equal(formatThreadcount(design.thread), preset.threadcount);
    assert.equal(formatPalette(design.palette.entries), preset.palette);
  }
  for (const preset of missing) {
    assert.equal(preset.availability, "not available");
    assert.equal(preset.threadcount, undefined);
    assert.match(preset.registerUrl, /^https:\/\/www\.tartanregister\.gov\.uk\//);
  }
  const campbell = ready.find((preset) => preset.id === "campbell");
  const royal = ready.find((preset) => preset.id === "royal-stewart");
  assert.match(campbell.shadeNote, /shade chosen by us, unverified/i);
  assert.match(royal.shadeNote, /shade chosen by us, unverified/i);
  assert.match(royal.palette, /WW=#F4F0E6#/);
  assert.match(campbell.palette, /A=#6A8FBF#/);
  assert.match(campbell.palette, /OG=#5E6A32#/);
});

test("one default shade is recorded for each of the 25 sheet codes", () => {
  assert.deepEqual(Object.keys(DEFAULT_SHADES), SHEET_CODES);
  for (const hex of Object.values(DEFAULT_SHADES)) {
    assert.match(hex, /^[0-9A-F]{6}$/);
  }
  const source = fs.readFileSync(new URL("../js/colours.js", import.meta.url), "utf8");
  assert.match(source, /Colour_shades\.pdf/);
  assert.match(source, /one per code/i);
});

test("Royal Stewart SVG is a compact masked twill under 1 MB", () => {
  const preset = PRESETS.find((item) => item.id === "royal-stewart");
  const svg = settSvg(buildDesign(preset.palette, preset.threadcount), preset.name);
  assert.ok(Buffer.byteLength(svg) < 1_000_000);
  assert.match(svg, /<g id="weft">/);
  assert.match(svg, /<g id="warp" mask="url\(#warpMask\)">/);
  assert.match(svg, /<pattern id="twill"/);
  assert.equal((svg.match(/<g id="weft">([\s\S]*?)<\/g>/)[1].match(/<rect /g) || []).length, 22);
});

test("share hash restores the same palette and threadcount", () => {
  const hash = `#${encodeShare(PALETTE, SYMMETRIC)}`;
  assert.deepEqual(decodeShare(hash), { palette: PALETTE, threadcount: SYMMETRIC });
});

test("stepper and reorder keep Register formatting", () => {
  const parsed = parseThreadcount(SYMMETRIC);
  const changed = withCount(parsed, 1, 32);
  assert.equal(formatThreadcount(changed), "DR/8 G32 K44 G/64");
  const moved = moveToken(parsed, 1, 2);
  assert.equal(formatThreadcount(moved), "DR/8 K44 G64 G/64");
});

test("page assets stay relative and make no runtime network calls", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.match(html, /href="styles\.css"/);
  assert.match(html, /src="js\/app\.js"/);
  assert.doesNotMatch(html, /\ssrc="\//);
  assert.doesNotMatch(html, /href="\//);
  assert.doesNotMatch(`${html}\n${css}\n${app}`, /fonts\.googleapis|fonts\.gstatic|googletagmanager|cdn\.|unpkg|jsdelivr|fetch\(|XMLHttpRequest|sendBeacon/);
  assert.match(html, /searchDesigns\/exportable/);
});
