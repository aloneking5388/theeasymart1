const fs = require("fs");
const path = require("path");

const exts = [".tsx", ".ts"];
const roots = ["app", "components"];
const utilities = [
  "min-w",
  "max-w",
  "min-h",
  "max-h",
  "w",
  "h",
  "p",
  "px",
  "py",
  "pt",
  "pb",
  "pl",
  "pr",
  "gap-x",
  "gap-y",
  "gap",
  "top",
  "right",
  "bottom",
  "left",
  "inset-x",
  "inset-y",
  "inset",
];
// longest-first so e.g. "min-w" matches before "w"
utilities.sort((a, b) => b.length - a.length);

function toScale(px) {
  const n = px / 4;
  if (px === 1) return "px";
  // format without trailing zeros
  let s = n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return s;
}

let files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (exts.includes(path.extname(entry.name))) files.push(full);
  }
}
roots.forEach((r) => walk(r));

// build one big regex alternation for utilities, with optional leading "-" and optional variant prefixes (word: chains)
const utilAlt = utilities
  .map((u) => u.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
  .join("|");
// matches: (variant prefixes)(-)?(util)-[<num>px]
const re = new RegExp(
  `([\\w-]*:)?(-)?(${utilAlt})-\\[(\\d+(?:\\.\\d+)?)px\\]`,
  "g",
);
const zRe = /([\w-]*:)?z-\[(\d+)\]/g;

console.log("DEBUG re.source:", re.source);
console.log("DEBUG test:", "w-[300px]".match(re));
console.log("DEBUG files found:", files.length);

let totalReplacements = 0;
let filesChanged = 0;

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  let changed = false;

  content = content.replace(re, (match, variant, neg, util, pxStr) => {
    const px = parseFloat(pxStr);
    const scale = toScale(px);
    totalReplacements++;
    changed = true;
    return `${variant || ""}${neg || ""}${util}-${scale}`;
  });

  content = content.replace(zRe, (match, variant, num) => {
    totalReplacements++;
    changed = true;
    return `${variant || ""}z-${num}`;
  });

  if (changed) {
    fs.writeFileSync(file, content, "utf8");
    filesChanged++;
  }
}

console.log(`Files changed: ${filesChanged}`);
console.log(`Total class replacements: ${totalReplacements}`);
