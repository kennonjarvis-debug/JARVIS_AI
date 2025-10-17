#!/usr/bin/env node
/**
 * Size Audit Script
 *
 * Analyzes project size and identifies:
 * - Largest files in the codebase
 * - Heaviest dependencies
 * - Total bundle impact
 *
 * Usage: npm run audit:size
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Configuration
const CONFIG = {
  maxFilesToReport: 20,
  minFileSizeKB: 10, // Only report files larger than this
  excludeDirs: ['node_modules', 'dist', '.git', 'coverage', 'build', 'backup', 'migrations'],
};

/**
 * Recursively get all files in directory
 */
function getAllFiles(dir, fileList = []) {
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      // Skip excluded directories
      const dirName = relative(projectRoot, filePath).split('/')[0];
      if (!CONFIG.excludeDirs.includes(dirName)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      fileList.push({
        path: relative(projectRoot, filePath),
        size: stat.size,
      });
    }
  });

  return fileList;
}

/**
 * Get dependency sizes from node_modules
 */
function getDependencySizes() {
  const nodeModulesPath = join(projectRoot, 'node_modules');
  const dependencies = [];

  try {
    const dirs = readdirSync(nodeModulesPath);

    for (const dir of dirs) {
      // Skip hidden and special directories
      if (dir.startsWith('.') || dir === '.bin') continue;

      const depPath = join(nodeModulesPath, dir);
      const stat = statSync(depPath);

      if (stat.isDirectory()) {
        // Calculate total size recursively
        let totalSize = 0;
        const files = getAllFiles(depPath);
        files.forEach((file) => {
          totalSize += file.size;
        });

        dependencies.push({
          name: dir,
          size: totalSize,
        });
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not analyze node_modules:', error.message);
  }

  return dependencies;
}

/**
 * Analyze package.json for dependency metadata
 */
function analyzePackageJson() {
  try {
    const packagePath = join(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

    return {
      dependencies: Object.keys(packageJson.dependencies || {}),
      devDependencies: Object.keys(packageJson.devDependencies || {}),
      totalDeps: Object.keys(packageJson.dependencies || {}).length,
      totalDevDeps: Object.keys(packageJson.devDependencies || {}).length,
    };
  } catch (error) {
    console.warn('⚠️  Could not read package.json:', error.message);
    return null;
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Main execution
(async () => {
  console.log('📊 Starting size audit...\n');
  console.log('═'.repeat(70));

  // 1. Analyze source files
  console.log('\n📁 Source Files Analysis\n');
  const srcPath = join(projectRoot, 'src');
  const sourceFiles = getAllFiles(srcPath);

  // Filter and sort by size
  const largeFiles = sourceFiles
    .filter((file) => file.size > CONFIG.minFileSizeKB * 1024)
    .sort((a, b) => b.size - a.size)
    .slice(0, CONFIG.maxFilesToReport);

  const totalSrcSize = sourceFiles.reduce((sum, file) => sum + file.size, 0);

  console.log(`   Total source files:      ${formatNumber(sourceFiles.length)}`);
  console.log(`   Total source size:       ${formatBytes(totalSrcSize)}`);
  console.log(`   Average file size:       ${formatBytes(totalSrcSize / sourceFiles.length)}`);

  console.log(`\n   🔝 Top ${largeFiles.length} Largest Source Files:\n`);
  largeFiles.forEach((file, index) => {
    console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${formatBytes(file.size).padStart(10, ' ')}  ${file.path}`);
  });

  // 2. Analyze dependencies
  console.log('\n\n📦 Dependencies Analysis\n');
  const packageInfo = analyzePackageJson();

  if (packageInfo) {
    console.log(`   Production dependencies: ${packageInfo.totalDeps}`);
    console.log(`   Dev dependencies:        ${packageInfo.totalDevDeps}`);
    console.log(`   Total dependencies:      ${packageInfo.totalDeps + packageInfo.totalDevDeps}`);
  }

  console.log('\n   Analyzing node_modules sizes (this may take a moment)...');
  const dependencies = getDependencySizes();
  const totalDepSize = dependencies.reduce((sum, dep) => sum + dep.size, 0);

  const heaviestDeps = dependencies
    .sort((a, b) => b.size - a.size)
    .slice(0, CONFIG.maxFilesToReport);

  console.log(`\n   Total node_modules size: ${formatBytes(totalDepSize)}`);
  console.log(`\n   🔝 Top ${heaviestDeps.length} Heaviest Dependencies:\n`);
  heaviestDeps.forEach((dep, index) => {
    const percentage = ((dep.size / totalDepSize) * 100).toFixed(1);
    console.log(
      `   ${(index + 1).toString().padStart(2, ' ')}. ${formatBytes(dep.size).padStart(10, ' ')}  (${percentage.padStart(5, ' ')}%)  ${dep.name}`
    );
  });

  // 3. Analyze scripts directory
  console.log('\n\n📜 Scripts Directory Analysis\n');
  const scriptsPath = join(projectRoot, 'scripts');
  const scriptFiles = getAllFiles(scriptsPath);
  const totalScriptsSize = scriptFiles.reduce((sum, file) => sum + file.size, 0);

  console.log(`   Total scripts:           ${formatNumber(scriptFiles.length)}`);
  console.log(`   Total scripts size:      ${formatBytes(totalScriptsSize)}`);

  const largeScripts = scriptFiles
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  console.log(`\n   🔝 Largest Scripts:\n`);
  largeScripts.forEach((file, index) => {
    console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${formatBytes(file.size).padStart(10, ' ')}  ${file.path}`);
  });

  // 4. Overall summary
  console.log('\n\n📊 Overall Project Size\n');
  const projectFiles = getAllFiles(projectRoot).filter(
    (file) => !file.path.startsWith('node_modules/')
  );
  const totalProjectSize = projectFiles.reduce((sum, file) => sum + file.size, 0);

  console.log(`   Source code:             ${formatBytes(totalSrcSize)}`);
  console.log(`   Scripts:                 ${formatBytes(totalScriptsSize)}`);
  console.log(`   Other files:             ${formatBytes(totalProjectSize - totalSrcSize - totalScriptsSize)}`);
  console.log(`   ─────────────────────────────────────`);
  console.log(`   Total (excl. deps):      ${formatBytes(totalProjectSize)}`);
  console.log(`   Dependencies:            ${formatBytes(totalDepSize)}`);
  console.log(`   ─────────────────────────────────────`);
  console.log(`   Grand total:             ${formatBytes(totalProjectSize + totalDepSize)}`);

  // 5. Recommendations
  console.log('\n\n💡 Recommendations\n');

  const recommendations = [];

  // Check for very large files
  const veryLargeFiles = sourceFiles.filter((file) => file.size > 100 * 1024); // > 100KB
  if (veryLargeFiles.length > 0) {
    recommendations.push(`   • Consider splitting ${veryLargeFiles.length} files larger than 100KB`);
  }

  // Check for heavy dependencies
  const veryHeavyDeps = dependencies.filter((dep) => dep.size > 10 * 1024 * 1024); // > 10MB
  if (veryHeavyDeps.length > 0) {
    recommendations.push(`   • Review ${veryHeavyDeps.length} dependencies larger than 10MB: ${veryHeavyDeps.map(d => d.name).join(', ')}`);
  }

  // Check dependency count
  if (packageInfo && packageInfo.totalDeps > 50) {
    recommendations.push(`   • Consider auditing ${packageInfo.totalDeps} production dependencies for unused packages`);
  }

  if (recommendations.length > 0) {
    recommendations.forEach((rec) => console.log(rec));
  } else {
    console.log('   ✅ No major size concerns detected!');
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n✅ Size audit complete!\n');
})();
