import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Simple test runner that just saves raw output
router.post('/run-simple', authenticateToken, requireAdmin, async (req, res) => {
  const { suite } = req.body;
  
  // Determine test command
  let command = 'npx playwright test --reporter=json';
  if (suite && suite !== 'all') {
    command = `npx playwright test tests/${suite}.spec.ts --reporter=json`;
  }
  
  console.log('Running command:', command);
  const projectRoot = path.join(__dirname, '../../..');
  console.log('Working directory:', projectRoot);
  
  res.json({ 
    status: 'started', 
    message: 'Tests are running...',
    suite: suite || 'all'
  });
  
  // Run tests
  exec(command, { 
    cwd: projectRoot,
    maxBuffer: 1024 * 1024 * 10
  }, async (error, stdout, stderr) => {
    console.log('Command completed');
    console.log('Exit code:', error?.code);
    console.log('Stdout length:', stdout?.length);
    console.log('Stderr length:', stderr?.length);
    
    // Save raw output for debugging
    try {
      await fs.writeFile(
        path.join(projectRoot, 'test-output-raw.json'),
        stdout || '{}',
        'utf8'
      );
      console.log('Saved raw output to test-output-raw.json');
    } catch (e) {
      console.error('Failed to save raw output:', e);
    }
    
    // Try to parse and save results
    try {
      let results = {};
      
      if (stdout) {
        // Remove npm warnings
        const cleaned = stdout.replace(/npm warn.*\n/g, '');
        
        // Find JSON
        const jsonStart = cleaned.indexOf('{');
        const jsonEnd = cleaned.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = cleaned.substring(jsonStart, jsonEnd + 1);
          const parsed = JSON.parse(jsonStr);
          
          // Extract summary
          if (parsed.stats) {
            results = {
              status: 'completed',
              lastRun: new Date().toISOString(),
              summary: {
                total: (parsed.stats.expected || 0) + (parsed.stats.unexpected || 0) + (parsed.stats.skipped || 0),
                passed: parsed.stats.expected || 0,
                failed: parsed.stats.unexpected || 0,
                skipped: parsed.stats.skipped || 0,
                duration: parsed.stats.duration || 0
              },
              suites: []
            };
          }
        }
      }
      
      if (!results.status) {
        results = {
          status: 'error',
          lastRun: new Date().toISOString(),
          message: 'No test results found',
          summary: {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0
          },
          suites: []
        };
      }
      
      await fs.writeFile(
        path.join(projectRoot, 'test-results.json'),
        JSON.stringify(results, null, 2)
      );
      console.log('Saved results to test-results.json');
      
    } catch (e) {
      console.error('Failed to process results:', e);
      
      // Save error state
      await fs.writeFile(
        path.join(projectRoot, 'test-results.json'),
        JSON.stringify({
          status: 'error',
          lastRun: new Date().toISOString(),
          message: e.message,
          summary: {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0
          },
          suites: []
        }, null, 2)
      );
    }
  });
});

export default router;