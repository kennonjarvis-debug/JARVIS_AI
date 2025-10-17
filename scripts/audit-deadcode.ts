#!/usr/bin/env tsx
/**
 * Dead Code Audit Script (Simplified)
 *
 * Uses grep-based analysis to detect:
 * - Exported functions/classes that may be unused
 * - Files with very few imports
 * - Potentially orphaned modules
 *
 * Usage: npm run audit:deadcode
 */

import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, relative, resolve } from 'path';
import { execSync } from 'child_process';

const projectRoot = resolve('.');

interface ExportInfo {
  file: string;
  name: string;
  line: number;
  type: string;
}

interface DeadCodeReport {
  suspiciousExports: ExportInfo[];
  lowImportFiles: Array<{ file: string; importCount: number }>;
  summary: {
    totalFiles: number;
    totalExports: number;
    suspiciousExportsCount: number;
    lowImportFilesCount: number;
  };
}

/**
 * Get all TypeScript files in src/
 */
function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      // Skip test directories
      if (!file.includes('test') && !file.includes('spec')) {
        getAllTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.spec.ts')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

/**
 * Parse exports from a file using regex
 */
function parseExports(filePath: string): ExportInfo[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const exports: ExportInfo[] = [];

  // Patterns to match various export formats
  const exportPatterns = [
    /export\s+(class|interface|type|enum)\s+(\w+)/,
    /export\s+(async\s+)?function\s+(\w+)/,
    /export\s+const\s+(\w+)/,
    /export\s+\{([^}]+)\}/,
  ];

  lines.forEach((line, index) => {
    for (const pattern of exportPatterns) {
      const match = line.match(pattern);
      if (match) {
        // Handle export { foo, bar } format
        if (match[0].includes('{')) {
          const names = match[1]
            .split(',')
            .map((n) => n.trim())
            .filter((n) => n && !n.includes('type'));
          names.forEach((name) => {
            exports.push({
              file: relative(projectRoot, filePath),
              name: name.replace(/\s+as\s+.+/, ''), // Remove 'as' aliases
              line: index + 1,
              type: 'unknown',
            });
          });
        } else {
          const name = match[2] || match[1];
          const type =
            match[1] === 'class'
              ? 'class'
              : match[1] === 'interface'
              ? 'interface'
              : match[1] === 'type'
              ? 'type'
              : match[1] === 'enum'
              ? 'enum'
              : match[0].includes('function')
              ? 'function'
              : match[0].includes('const')
              ? 'const'
              : 'unknown';

          exports.push({
            file: relative(projectRoot, filePath),
            name,
            line: index + 1,
            type,
          });
        }
        break;
      }
    }
  });

  return exports;
}

/**
 * Count how many times a symbol is imported across the codebase
 */
function countImportUsage(symbolName: string, excludeFile: string): number {
  try {
    // Use grep to count imports (faster than parsing each file)
    const grepCommand = `grep -r "import.*${symbolName}" src/ --include="*.ts" | grep -v "${excludeFile}" | wc -l`;
    const result = execSync(grepCommand, { cwd: projectRoot, encoding: 'utf-8' });
    return parseInt(result.trim(), 10);
  } catch (error) {
    // Grep returns non-zero exit code when no matches found
    return 0;
  }
}

/**
 * Count how many imports a file has
 */
function countFileImports(filePath: string): number {
  const content = readFileSync(filePath, 'utf-8');
  const importLines = content.match(/^import\s+/gm) || [];
  return importLines.length;
}

async function auditDeadCode(): Promise<DeadCodeReport> {
  console.log('🔍 Starting dead code audit (simplified)...\n');

  const srcPath = join(projectRoot, 'src');
  if (!existsSync(srcPath)) {
    throw new Error('src/ directory not found');
  }

  const allFiles = getAllTsFiles(srcPath);
  console.log(`📁 Analyzing ${allFiles.length} TypeScript files...\n`);

  const report: DeadCodeReport = {
    suspiciousExports: [],
    lowImportFiles: [],
    summary: {
      totalFiles: allFiles.length,
      totalExports: 0,
      suspiciousExportsCount: 0,
      lowImportFilesCount: 0,
    },
  };

  // Analyze each file
  for (const filePath of allFiles) {
    // Skip entry points
    if (filePath.includes('main.ts') || filePath.includes('gateway.ts')) {
      continue;
    }

    // Count imports in this file
    const importCount = countFileImports(filePath);
    if (importCount === 0) {
      report.lowImportFiles.push({
        file: relative(projectRoot, filePath),
        importCount: 0,
      });
      report.summary.lowImportFilesCount++;
    }

    // Find exports
    const exports = parseExports(filePath);
    report.summary.totalExports += exports.length;

    // Check usage of each export (sample a few to avoid being too slow)
    if (exports.length > 0 && exports.length <= 5) {
      for (const exp of exports) {
        const usageCount = countImportUsage(exp.name, exp.file);
        if (usageCount === 0) {
          report.suspiciousExports.push(exp);
          report.summary.suspiciousExportsCount++;
        }
      }
    }
  }

  return report;
}

// Main execution
(async () => {
  try {
    const report = await auditDeadCode();

    console.log('📊 Dead Code Audit Report\n');
    console.log('═'.repeat(60));
    console.log('\n📈 Summary:');
    console.log(`   Total files analyzed:    ${report.summary.totalFiles}`);
    console.log(`   Total exports found:     ${report.summary.totalExports}`);
    console.log(`   Suspicious exports:      ${report.summary.suspiciousExportsCount}`);
    console.log(`   Files with 0 imports:    ${report.summary.lowImportFilesCount}`);

    if (report.suspiciousExports.length > 0) {
      console.log('\n\n⚠️  Potentially Unused Exports:\n');
      report.suspiciousExports
        .sort((a, b) => a.file.localeCompare(b.file))
        .slice(0, 20) // Limit output
        .forEach((exp) => {
          console.log(`   ${exp.file}:${exp.line}`);
          console.log(`      └─ ${exp.type} "${exp.name}"`);
        });

      if (report.suspiciousExports.length > 20) {
        console.log(`\n   ... and ${report.suspiciousExports.length - 20} more`);
      }
    }

    if (report.lowImportFiles.length > 0) {
      console.log('\n\n🏝️  Files with Zero Imports (potentially orphaned):\n');
      report.lowImportFiles
        .sort((a, b) => a.file.localeCompare(b.file))
        .slice(0, 15) // Limit output
        .forEach((file) => {
          console.log(`   ${file.file}`);
        });

      if (report.lowImportFiles.length > 15) {
        console.log(`\n   ... and ${report.lowImportFiles.length - 15} more`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Audit complete!\n');
    console.log('💡 Note: This is a heuristic analysis. Manual review recommended.');
    console.log('   Some exports may be used dynamically or in ways grep cannot detect.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
})();
