import { existsSync } from "node:fs";
import { extname, resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith("@/")) {
    return nextResolve(specifier, context);
  }

  const basePath = resolvePath(process.cwd(), "src", specifier.slice(2));
  const resolvedPath = extname(basePath) || existsSync(basePath)
    ? basePath
    : `${basePath}.js`;
  return nextResolve(pathToFileURL(resolvedPath).href, context);
}
