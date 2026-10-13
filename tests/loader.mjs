import { resolve as pathResolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith('.') || specifier.startsWith('..')) {
    const parentURL = context.parentURL;
    if (parentURL) {
      const parentDir = fileURLToPath(new URL('.', parentURL));
      const targetPath = pathResolve(parentDir, specifier);
      if (existsSync(targetPath + '.js')) {
        return {
          shortCircuit: true,
          url: pathToFileURL(targetPath + '.js').href,
        };
      }
      if (existsSync(targetPath + '.jsx')) {
        return {
          shortCircuit: true,
          url: pathToFileURL(targetPath + '.jsx').href,
        };
      }
    }
  }
  return defaultResolve(specifier, context);
}
