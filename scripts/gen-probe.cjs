const fs = require("fs");
const path = require("path");
function walk(d, acc) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name === "__tests__" || e.name === "docs") continue;
      walk(p, acc);
    } else if (/\.(vue|ts)$/.test(e.name) && !/\.spec\.|\.test\.|\.bench\./.test(e.name)) acc.push(p);
  }
  return acc;
}
const files = [...walk("src/components/ui", []), ...walk("src/components/grid", [])].filter((f) => f.endsWith(".vue"));
let i = 0;
const lines = files.map((f) => {
  const v = "/" + f.split(path.sep).join("/").replace(/^src\//, "src/").replace(/\.vue$/, "");
  return `import Comp${i++} from "${v}"`;
});
fs.writeFileSync("src/__resolve_probe.ts", lines.join("\n") + "\nexport default {}\n");
console.log(files.length, "files");
