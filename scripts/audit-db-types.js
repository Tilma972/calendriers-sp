#!/usr/bin/env node
// scripts/audit-db-types.js
const fs = require('fs');
const path = require('path');

// Patterns problématiques à rechercher
const issues = {
  numericAsNumber: {
    pattern: /(amount|total_amount):\s*number/g,
    description: 'Champ numeric traité comme number au lieu de string',
    fix: 'Remplacer par string'
  },
  wrongNullable: {
    pattern: /(is_active|calendars_target|color|status|calendars_distributed|total_transactions|calendars_given).*\|\s*null/g,
    description: 'Champ avec DEFAULT traité comme nullable',
    fix: 'Supprimer | null'
  },
  wrongParseFloat: {
    pattern: /(parseFloat|parseInt)\s*\(\s*[^)]*\.(amount|total_amount)/g,
    description: 'Parsing inutile sur champ déjà string',
    fix: 'Supprimer parseFloat/parseInt'
  },
  stringToNumber: {
    pattern: /\+\s*[^+]*\.(amount|total_amount)/g,
    description: 'Conversion string vers number avec +',
    fix: 'Utiliser parseFloat() explicitement'
  }
};

function scanFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  
  const content = fs.readFileSync(filePath, 'utf8');
  const found = [];
  
  Object.entries(issues).forEach(([key, config]) => {
    const matches = [...content.matchAll(config.pattern)];
    matches.forEach(match => {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      found.push({
        file: filePath,
        line: lineNumber,
        issue: key,
        match: match[0],
        description: config.description,
        fix: config.fix
      });
    });
  });
  
  return found;
}

function scanDirectory(dir) {
  const allIssues = [];
  
  function scanRecursive(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.includes('node_modules') && !item.startsWith('.')) {
        scanRecursive(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        allIssues.push(...scanFile(fullPath));
      }
    });
  }
  
  scanRecursive(dir);
  return allIssues;
}

// Exécuter l'audit
const srcPath = path.join(process.cwd(), 'src');
const issues = scanDirectory(srcPath);

console.log('\n=== AUDIT DES TYPES DATABASE ===\n');

if (issues.length === 0) {
  console.log('✅ Aucun problème détecté !');
} else {
  console.log(`⚠️  ${issues.length} problème(s) détecté(s):\n`);
  
  // Grouper par fichier
  const byFile = issues.reduce((acc, issue) => {
    if (!acc[issue.file]) acc[issue.file] = [];
    acc[issue.file].push(issue);
    return acc;
  }, {});
  
  Object.entries(byFile).forEach(([file, fileIssues]) => {
    console.log(`📄 ${file.replace(process.cwd(), '')}`);
    fileIssues.forEach(issue => {
      console.log(`   Line ${issue.line}: ${issue.description}`);
      console.log(`   Code: ${issue.match}`);
      console.log(`   Fix:  ${issue.fix}\n`);
    });
  });
}

console.log('\n=== FICHIERS PRIORITAIRES ===\n');
const priority = [
  'src/types/database.types.ts',
  'src/shared/lib/supabase.ts', 
  'src/shared/stores/auth.ts',
  'src/app/admin/settings/page.tsx'
];

priority.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});