import generateTypeScriptFile from "./generateTypeScriptFile";

import chokidar from "chokidar";
import fs from "fs";
import mkdirp from "mkdirp";
import path from "path";

const packageName = "next-type-safe-routes";
const defaultTypeFolder = path.join("@types", packageName);

const log = (message: string) => {
  console.log(`\x1b[36m${packageName}\x1b[0m: ${message}`);
};

const writeTypesToDisc = (nextPagesDirectory: string, typesDestination?: string) => {
  // we assume the src directory is the directory containing the pages directory
  const srcDir = path.dirname(nextPagesDirectory);
  const typeFolderPath = typesDestination || path.join(srcDir, defaultTypeFolder);
  const typeScriptFile = generateTypeScriptFile(nextPagesDirectory);

  mkdirp.sync(typeFolderPath);
  fs.writeFileSync(path.join(typeFolderPath, "index.ts"), typeScriptFile);

  log(`types written to ${typeFolderPath}`);
};

interface NextTypeSafeRoutesConfig {
  typesDestination?: string;
}

const run = (nextConfig: any = {}, pluginConfig: NextTypeSafeRoutesConfig = {}) => {
  return Object.assign({}, nextConfig, {
    webpack(config, options) {
      // This seems to be the way to get the path to the pages
      // directory in a Next.js app. Since it's possible to have a
      // `/src` folder (https://nextjs.org/docs/advanced-features/src-directory)
      // we cannot assume that it just in a `/pages` folder directly
      // in the root of the project
      const pagesDir = config.resolve.alias["private-next-pages"];
      // Generate the types file when the app is being compiled
      writeTypesToDisc(pagesDir, pluginConfig.typesDestination);
      // Generate the types file again when page files are added/removed
      const watcher = chokidar.watch(pagesDir, { ignoreInitial: true });
      watcher.on("add", () => writeTypesToDisc(pagesDir, pluginConfig.typesDestination));
      watcher.on("unlink", () => writeTypesToDisc(pagesDir, pluginConfig.typesDestination));

      // if other webpack customizations exist, run them
      if (typeof nextConfig.webpack === "function") {
        return nextConfig.webpack(config, options);
      }

      // Return the un-modified config
      return config;
    },
  });
};

export default run;
