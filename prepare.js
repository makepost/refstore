// @ts-ignore
const { readFileSync, writeFileSync } = require("fs");
// @ts-ignore
const { join } = require("path");
// @ts-ignore
const _ = __dirname;
const { ScriptTarget, transpileModule } = require("typescript");
const { outputText } = transpileModule(
  readFileSync(join(_, "index.js"), "utf8"),
  { compilerOptions: { target: ScriptTarget.ES5 } }
);
writeFileSync(join(_, "index.dist.js"), outputText);
writeFileSync(join(_, "index.dist.d.ts"), readFileSync(join(_, "index.d.ts")));
writeFileSync(
  join(_, "index.dist.test.js"),
  readFileSync(join(_, "index.test.js"), "utf8").replace(/"\.\/index"/, '"."')
);
