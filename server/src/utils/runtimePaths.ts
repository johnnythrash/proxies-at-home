import path from "path";
import { fileURLToPath } from "url";

function findServerRoot(startDir: string): string {
  let current = startDir;

  while (true) {
    const parent = path.dirname(current);
    if (
      path.basename(current).toLowerCase() === "server" &&
      path.basename(parent).toLowerCase() !== "dist"
    ) {
      return current;
    }

    if (parent === current) break;
    current = parent;
  }

  throw new Error("Unable to locate the Proxxied server root from " + startDir);
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export const serverRootDir = findServerRoot(moduleDir);
export const serverDataDir = process.env.PROXXIED_DATA_DIR
  ? path.resolve(process.env.PROXXIED_DATA_DIR)
  : path.join(serverRootDir, "data");
