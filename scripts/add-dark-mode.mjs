import fs from "fs";
import path from "path";

const files = [
  "artifacts/srt-tools/src/tabs/SrtMergerTab.tsx",
  "artifacts/srt-tools/src/tabs/SrtEditorTab.tsx",
  "artifacts/srt-tools/src/tabs/SrtConverterTab.tsx",
  "artifacts/srt-tools/src/tabs/SrtMakerTab.tsx",
  "artifacts/srt-tools/src/tabs/SrtNoteTab.tsx",
  "artifacts/srt-tools/src/tabs/SrtTimeSplitterTab.tsx",
  "artifacts/srt-tools/src/tabs/VoiceTrimmerTab.tsx",
  "artifacts/srt-tools/src/tabs/SrtEditTab.tsx",
  "artifacts/srt-tools/src/tabs/CounterTab.tsx",
  "artifacts/srt-tools/src/tabs/TextSplitterTab.tsx",
];

const map = [
  ["bg-white", "dark:bg-gray-900"],
  ["bg-gray-50/50", "dark:bg-gray-800/50"],
  ["bg-gray-50", "dark:bg-gray-900"],
  ["bg-gray-100", "dark:bg-gray-800"],
  ["bg-gray-200", "dark:bg-gray-700"],
  ["hover:bg-white", "dark:hover:bg-gray-900"],
  ["hover:bg-gray-50", "dark:hover:bg-gray-800"],
  ["hover:bg-gray-100", "dark:hover:bg-gray-800"],
  ["hover:bg-gray-200", "dark:hover:bg-gray-700"],
  ["text-gray-900", "dark:text-gray-100"],
  ["text-gray-800", "dark:text-gray-100"],
  ["text-gray-700", "dark:text-gray-200"],
  ["text-gray-600", "dark:text-gray-300"],
  ["text-gray-500", "dark:text-gray-400"],
  ["text-gray-400", "dark:text-gray-500"],
  ["text-gray-300", "dark:text-gray-600"],
  ["hover:text-gray-900", "dark:hover:text-gray-100"],
  ["hover:text-gray-800", "dark:hover:text-gray-100"],
  ["hover:text-gray-700", "dark:hover:text-gray-200"],
  ["hover:text-gray-600", "dark:hover:text-gray-300"],
  ["hover:text-gray-500", "dark:hover:text-gray-400"],
  ["border-gray-200", "dark:border-gray-700"],
  ["border-gray-300", "dark:border-gray-600"],
  ["border-gray-100", "dark:border-gray-800"],
  ["hover:border-gray-300", "dark:hover:border-gray-600"],
  ["hover:border-gray-200", "dark:hover:border-gray-700"],
  ["divide-gray-200", "dark:divide-gray-700"],
  ["divide-gray-100", "dark:divide-gray-800"],
];

// Match a class token within a className quoted string. We add a dark variant
// after the token if not already preceded/followed by the same dark variant.
function processClassString(str) {
  // tokens separated by whitespace
  const tokens = str.split(/(\s+)/);
  const has = new Set(tokens.filter((t) => t.trim()));
  const out = [];
  for (const tok of tokens) {
    out.push(tok);
    if (!tok.trim()) continue;
    for (const [from, to] of map) {
      if (tok === from && !has.has(to)) {
        out.push(" " + to);
        has.add(to);
        break;
      }
    }
  }
  return out.join("");
}

const classNameAttr = /className\s*=\s*"([^"]*)"/g;
const classNameTpl = /className\s*=\s*\{`([^`]*)`\}/g;
const clsxLike = /className\s*=\s*\{([^}]*)\}/g;

for (const file of files) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) continue;
  let src = fs.readFileSync(abs, "utf8");

  src = src.replace(classNameAttr, (_m, inner) => {
    return `className="${processClassString(inner)}"`;
  });

  src = src.replace(classNameTpl, (_m, inner) => {
    // Only process the static parts between ${...}
    const parts = inner.split(/(\$\{[^}]*\})/g);
    const newParts = parts.map((p) => (p.startsWith("${") ? p : processClassString(p)));
    return "className={`" + newParts.join("") + "`}";
  });

  // Handle ternaries / strings inside className={ ... } — process any "..." substrings inside
  src = src.replace(clsxLike, (m, expr) => {
    if (expr.trim().startsWith("`")) return m; // already handled above
    const newExpr = expr.replace(/"([^"]*)"/g, (_mm, s) => `"${processClassString(s)}"`);
    return `className={${newExpr}}`;
  });

  fs.writeFileSync(abs, src);
  console.log("updated", file);
}
