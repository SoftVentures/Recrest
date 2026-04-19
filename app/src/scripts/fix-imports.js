import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Recursively get all TypeScript/JavaScript files in a directory
 */
const SKIP_DIRS = new Set(["scripts", "node_modules", "dist", "storybook-static"]);

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(file)) return;
      getAllFiles(filePath, fileList);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Fix relative imports in a file by converting them to @ path aliases
 */
function fixImportsInFile(filePath, srcDir) {
  let content = fs.readFileSync(filePath, "utf8");
  const fileDir = path.dirname(filePath);

  // Regex patterns for different import styles
  const patterns = [
    // Standard imports: import Something from './path'
    // Named imports: import { Something } from './path'
    // Type imports: import type { Something } from './path'
    // Mixed imports: import Something, { Other } from './path'
    /^(\s*import\s+(?:type\s+)?(?:[\w*\s{},]*\s+from\s+)?['"])(\.[^'"]*?)(['"])/gm,

    // Export from: export { Something } from './path'
    // Re-exports: export * from './path'
    /^(\s*export\s+(?:\*|{[^}]*})\s+from\s+['"])(\.[^'"]*?)(['"])/gm,

    // Dynamic imports: import('./path') or import("../path")
    /(import\s*\(\s*['"])(\.[^'"]*?)(['"])/g,
  ];

  let modified = false;
  let newContent = content;

  patterns.forEach((pattern) => {
    newContent = newContent.replace(pattern, (match, prefix, importPath, suffix) => {
      // Skip if it's already using @ alias
      if (importPath.startsWith("@/") || importPath.startsWith("@nexyfi/")) {
        return match;
      }

      // Skip if it's not a relative import
      if (!importPath.startsWith("./") && !importPath.startsWith("../") && importPath !== ".") {
        return match;
      }

      try {
        // Extract the actual path (without query params like ?react)
        const [actualPath, queryParams] = importPath.split("?");
        const queryString = queryParams ? `?${queryParams}` : "";

        // Resolve the absolute path
        let absolutePath = path.resolve(fileDir, actualPath);

        // If it resolves to a directory, verify an index file exists so the
        // alias stays valid — but keep the path without "/index" since
        // bundlers resolve directory imports to index files automatically.
        if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
          const indexExtensions = ["ts", "tsx", "js", "jsx"];
          const hasIndex = indexExtensions.some((ext) =>
            fs.existsSync(path.join(absolutePath, `index.${ext}`)),
          );
          if (!hasIndex) {
            return match;
          }
        }

        const relativePath = path.relative(srcDir, absolutePath);

        // If the resolved path is outside src/, skip it
        if (relativePath.startsWith("..")) {
          return match;
        }

        // Convert to @ alias (use forward slashes for consistency)
        const aliasPath = "@/" + relativePath.replace(/\\/g, "/") + queryString;

        modified = true;
        return prefix + aliasPath + suffix;
      } catch (error) {
        console.warn(`Warning: Could not resolve import in ${filePath}: ${importPath}`);
        return match;
      }
    });
  });

  if (modified) {
    fs.writeFileSync(filePath, newContent, "utf8");
    const relativeFilePath = path.relative(process.cwd(), filePath);
    console.log(`✓ Fixed: ${relativeFilePath}`);
  }

  return modified;
}

/**
 * Main execution
 */
function main() {
  console.log("🔍 Scanning for files with relative imports...\n");

  // This script lives at app/src/scripts/, so srcDir is one level up.
  const srcDir = path.join(__dirname, "..");

  // Verify src directory exists
  if (!fs.existsSync(srcDir)) {
    console.error(`Error: src directory not found at ${srcDir}`);
    process.exit(1);
  }

  // Get all files
  const files = getAllFiles(srcDir);
  console.log(`Found ${files.length} files to process\n`);

  // Process each file
  let totalFixed = 0;
  files.forEach((file) => {
    if (fixImportsInFile(file, srcDir)) {
      totalFixed++;
    }
  });

  console.log(`\n✅ Complete! Fixed imports in ${totalFixed} file(s)`);
}

// Run the script
main();
