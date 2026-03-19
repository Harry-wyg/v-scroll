import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { transform } from "lightningcss";

const VIRTUAL_ID = "\0css:v-scroll";

const minifyCss = (file) => {
  const raw = readFileSync(file, "utf-8"),
    { code } = transform({ filename: "v-scroll.css", code: Buffer.from(raw), minify: true });
  return code.toString();
};

const writeCssModule = (root, css) => {
  const dir = resolve(root, "public/theme");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "v-scroll.js"), `export default ${JSON.stringify(css)};`);
};

const cssToJs = () => {
  let css_str;
  return {
    name: "css-to-js",
    configResolved(config) {
      css_str = minifyCss(resolve(config.root, "src/v-scroll.css"));
      writeCssModule(config.root, css_str);
    },
    resolveId(id) {
      if (id === "$/v-scroll.js") return VIRTUAL_ID;
    },
    load(id) {
      if (id === VIRTUAL_ID) return `export default ${JSON.stringify(css_str)};`;
    },
    handleHotUpdate({ file, server }) {
      if (!file.endsWith("v-scroll.css")) return;
      css_str = minifyCss(file);
      writeCssModule(server.config.root, css_str);
      const mod = server.moduleGraph.getModuleById(VIRTUAL_ID);
      if (mod) {
        server.moduleGraph.invalidateModule(mod);
        return [mod];
      }
    }
  };
};

export default { plugins: [cssToJs()] };
