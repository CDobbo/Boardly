#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// List of route files to fix
const routeFiles = [
  'backend/src/routes/admin.js',
  'backend/src/routes/auth.js', 
  'backend/src/routes/boards.js',
  'backend/src/routes/diary.js',
  'backend/src/routes/events.js',
  'backend/src/routes/goals.js',
  'backend/src/routes/projects.js',
  'backend/src/routes/tasks.js',
  'backend/src/routes/tests.js'
];

function fixAsyncAwait(content) {
  let fixed = content;
  
  // Fix route handlers to be async
  // Match patterns like: router.get('/path', (req, res, next) => {
  // But NOT: router.get('/path', async (req, res, next) => {
  fixed = fixed.replace(
    /router\.(get|post|put|delete|patch)\((.*?),\s*(?<!async\s+)\((req|request),\s*(res|response)(?:,\s*(next))?\)\s*=>\s*\{/g,
    'router.$1($2, async ($3, $4$5) => {'
  );
  
  // Also fix middleware patterns with checkTaskAccess etc
  fixed = fixed.replace(
    /,\s*(?<!async\s+)\((req|request),\s*(res|response)(?:,\s*(next))?\)\s*=>\s*\{/g,
    ', async ($1, $2$3) => {'
  );
  
  // Add await to all db.prepare calls that don't already have it
  // Match: db.prepare(...).get/all/run(...)
  // But NOT: await db.prepare(...).get/all/run(...)
  fixed = fixed.replace(
    /(?<!await\s+)db\.prepare\(([\s\S]*?)\)\.(get|all|run)\(/g,
    'await db.prepare($1).$2('
  );
  
  // Fix checkTaskAccess and similar middleware functions
  fixed = fixed.replace(
    /const checkTaskAccess = \((req|request),\s*(res|response),\s*(next)\)\s*=>\s*\{/g,
    'const checkTaskAccess = async ($1, $2, $3) => {'
  );
  
  fixed = fixed.replace(
    /const checkProjectAccess = \((req|request),\s*(res|response),\s*(next)\)\s*=>\s*\{/g,
    'const checkProjectAccess = async ($1, $2, $3) => {'
  );
  
  // Fix db.exec calls
  fixed = fixed.replace(
    /(?<!await\s+)db\.exec\(/g,
    'await db.exec('
  );
  
  // Fix db.transaction calls
  fixed = fixed.replace(
    /(?<!await\s+)db\.transaction\(/g,
    'await db.transaction('
  );
  
  return fixed;
}

// Process each file
for (const file of routeFiles) {
  const filePath = path.join(__dirname, file);
  
  try {
    console.log(`Processing ${file}...`);
    
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Apply fixes
    const fixed = fixAsyncAwait(content);
    
    // Write back if changed
    if (fixed !== content) {
      fs.writeFileSync(filePath, fixed);
      console.log(`✅ Fixed ${file}`);
    } else {
      console.log(`✓ No changes needed for ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

console.log('\nDone! All route files have been processed.');