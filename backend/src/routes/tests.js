import { Router } from 'express';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Store for test run status
let testRunStatus = {
  running: false,
  startTime: null,
  process: null
};

// Get the project root directory (go up from backend/src/routes to root)
const projectRoot = path.resolve(__dirname, '..', '..', '..');
const resultsDir = path.join(projectRoot, 'test-results');
const playwrightResultsDir = path.join(projectRoot, 'playwright-report');

// Middleware to check admin role
const requireAdmin = async (req, res, next) => {
  console.log('=== ADMIN CHECK DEBUG ===');
  console.log('req.user:', JSON.stringify(req.user, null, 2));
  console.log('req.user.id:', req.user?.id);
  console.log('req.user.email:', req.user?.email);
  console.log('req.user.role:', req.user?.role);
  console.log('req.headers.authorization:', req.headers.authorization ? 'present' : 'missing');
  
  // Temporary: check database for role if not in token
  if (req.user && !req.user.role) {
    // Checking user role in database
    try {
      const { db } = await import('../db/index.js');
      const user = await db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);
      console.log('Database user role:', user?.role);
      if (user) {
        req.user.role = user.role;
      }
    } catch (dbError) {
      console.log('Database lookup error:', dbError);
    }
  }
  
  if (!req.user || req.user.role !== 'admin') {
    console.log('Admin access denied for user:', req.user);
    return res.status(403).json({ 
      error: 'Admin access required',
      debug: {
        hasUser: !!req.user,
        userRole: req.user?.role,
        userId: req.user?.id
      }
    });
  }
  console.log('Admin access granted');
  next();
};

// Create results directory if it doesn't exist
const ensureResultsDir = async () => {
  try {
    await fs.mkdir(resultsDir, { recursive: true });
  } catch (error) {
    console.log('Results directory already exists or error creating:', error.message);
  }
};

// Parse Playwright JSON results  
const parsePlaywrightResults = async () => {
  try {
    // First try to get results from the latest run saved by our process
    const latestResultsPath = path.join(resultsDir, 'latest.json');
    let rawResults;
    
    try {
      const rawData = await fs.readFile(latestResultsPath, 'utf8');
      const savedData = JSON.parse(rawData);
      
      if (savedData.stdout) {
        // Try to parse JSON from stdout
        try {
          rawResults = JSON.parse(savedData.stdout);
        } catch (parseError) {
          console.log('Could not parse JSON from stdout, will use fallback');
        }
      }
    } catch (error) {
      console.log('No latest results found, trying playwright-report');
    }
    
    // If no raw results from saved data, try the playwright-report directory
    if (!rawResults) {
      const jsonResultsPath = path.join(playwrightResultsDir, 'results.json');
      try {
        const jsonData = await fs.readFile(jsonResultsPath, 'utf8');
        rawResults = JSON.parse(jsonData);
      } catch (error) {
        console.log('No JSON results found, looking for HTML report');
        
        // If no JSON file, try to read from the HTML report directory
        const reportIndexPath = path.join(playwrightResultsDir, 'index.html');
        try {
          await fs.access(reportIndexPath);
          // HTML report exists, return basic info
          return {
            status: 'completed',
            lastRun: new Date().toISOString(),
            summary: {
              total: 0,
              passed: 0,
              failed: 0,
              skipped: 0,
              duration: 0
            },
            suites: [],
            message: 'Test results are available in HTML format. Check the Playwright HTML report.',
            htmlReportAvailable: true
          };
        } catch (htmlError) {
          throw new Error('No test results found');
        }
      }
    }

    // Parse the JSON results using new format
    const summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: rawResults.stats?.duration || 0
    };

    const suites = [];
    
    if (rawResults.suites) {
      rawResults.suites.forEach(topLevelSuite => {
        // Handle nested suites structure
        const processSpecs = (specs, parentTitle = '') => {
          specs.forEach(spec => {
            const testCase = {
              title: spec.title || 'Unknown Test',
              status: 'skipped',
              duration: 0,
              error: null
            };

            // Check if spec has tests array with results
            if (spec.tests && spec.tests.length > 0) {
              const test = spec.tests[0]; // Get first test result
              if (test.results && test.results.length > 0) {
                const result = test.results[0];
                
                if (result.status === 'passed') {
                  testCase.status = 'passed';
                } else if (result.status === 'skipped') {
                  testCase.status = 'skipped';
                } else {
                  testCase.status = 'failed';
                  if (result.errors && result.errors.length > 0) {
                    testCase.error = result.errors[0].message;
                  }
                }
                
                testCase.duration = result.duration || 0;
              }
            }

            // Update summary counts
            summary[testCase.status]++;
            summary.total++;
            
            return testCase;
          });
        };

        // Process nested suites
        if (topLevelSuite.suites) {
          topLevelSuite.suites.forEach(nestedSuite => {
            const suiteData = {
              title: nestedSuite.title || topLevelSuite.title || 'Unknown Suite',
              file: topLevelSuite.file || '',
              passed: 0,
              failed: 0,
              skipped: 0,
              duration: 0,
              tests: []
            };

            if (nestedSuite.specs) {
              nestedSuite.specs.forEach(spec => {
                const testCase = {
                  title: spec.title || 'Unknown Test',
                  status: 'skipped',
                  duration: 0,
                  error: null
                };

                if (spec.tests && spec.tests.length > 0) {
                  const test = spec.tests[0];
                  if (test.results && test.results.length > 0) {
                    const result = test.results[0];
                    
                    if (result.status === 'passed') {
                      testCase.status = 'passed';
                    } else if (result.status === 'skipped') {
                      testCase.status = 'skipped';
                    } else {
                      testCase.status = 'failed';
                      if (result.errors && result.errors.length > 0) {
                        testCase.error = result.errors[0].message;
                      }
                    }
                    
                    testCase.duration = result.duration || 0;
                    suiteData.duration += testCase.duration;
                  }
                }

                suiteData[testCase.status]++;
                suiteData.tests.push(testCase);
              });
            }

            suites.push(suiteData);
          });
        }
      });
    }

    return {
      status: 'completed',
      lastRun: new Date().toISOString(),
      summary,
      suites
    };
  } catch (error) {
    console.error('Error parsing Playwright results:', error);
    throw error;
  }
};

// Get test results
router.get('/results', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await ensureResultsDir();
    
    const results = await parsePlaywrightResults();
    res.json(results);
  } catch (error) {
    console.error('Error getting test results:', error);
    res.json({
      status: 'no_results',
      lastRun: null,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      },
      suites: [],
      message: 'No test results available. Run tests to generate results.'
    });
  }
});

// Check test run status
router.get('/status', authenticateToken, requireAdmin, async (req, res) => {
  res.json({
    running: testRunStatus.running,
    startTime: testRunStatus.startTime
  });
});

// Run tests
router.post('/run', authenticateToken, requireAdmin, async (req, res) => {
  if (testRunStatus.running) {
    return res.status(400).json({
      error: 'Tests are already running',
      running: true
    });
  }

  const { suite = 'all' } = req.body;
  
  try {
    await ensureResultsDir();
    
    // Set running status
    testRunStatus.running = true;
    testRunStatus.startTime = new Date().toISOString();
    
    // Determine which tests to run
    let testCommand = ['npx', 'playwright', 'test'];
    
    if (suite !== 'all') {
      // Map suite names to test files
      const suiteMap = {
        'auth': 'auth.spec.ts',
        'tasks': 'tasks.spec.ts',
        'admin': 'admin.spec.ts',
        'persistence': 'persistence.spec.ts',
        'demo': 'demo.spec.ts'
      };
      
      if (suiteMap[suite]) {
        testCommand.push(suiteMap[suite]);
      }
    }
    
    // Add reporter options for both JSON and HTML
    testCommand.push('--reporter=json');
    testCommand.push('--project=chromium'); // Use single browser for speed
    
    console.log(`Running command: ${testCommand.join(' ')}`);
    console.log(`Working directory: ${projectRoot}`);
    
    // Start the test process  
    console.log('Starting test process with command:', testCommand.join(' '));
    const testProcess = spawn(testCommand[0], testCommand.slice(1), {
      cwd: projectRoot,
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, CI: undefined } // Don't set CI mode for web server config
    });
    
    testRunStatus.process = testProcess;
    
    let stdout = '';
    let stderr = '';
    
    testProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('Test stdout:', data.toString());
    });
    
    testProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('Test stderr:', data.toString());
    });
    
    testProcess.on('close', async (code) => {
      console.log(`Test process exited with code ${code}`);
      testRunStatus.running = false;
      testRunStatus.process = null;
      
      // Try to save results
      try {
        const resultsFile = path.join(resultsDir, 'latest.json');
        const resultsData = {
          exitCode: code,
          timestamp: new Date().toISOString(),
          suite,
          stdout,
          stderr
        };
        
        await fs.writeFile(resultsFile, JSON.stringify(resultsData, null, 2));
        console.log('Test results saved to:', resultsFile);
      } catch (saveError) {
        console.error('Error saving test results:', saveError);
      }
    });
    
    testProcess.on('error', (error) => {
      console.error('Test process error:', error);
      testRunStatus.running = false;
      testRunStatus.process = null;
    });
    
    res.json({
      message: 'Tests started successfully',
      suite,
      running: true,
      startTime: testRunStatus.startTime
    });
    
  } catch (error) {
    console.error('Error starting tests:', error);
    testRunStatus.running = false;
    testRunStatus.process = null;
    
    res.status(500).json({
      error: 'Failed to start tests',
      details: error.message
    });
  }
});

// Stop running tests
router.post('/stop', authenticateToken, requireAdmin, async (req, res) => {
  if (!testRunStatus.running || !testRunStatus.process) {
    return res.status(400).json({
      error: 'No tests are currently running'
    });
  }
  
  try {
    // Kill the test process
    testRunStatus.process.kill('SIGTERM');
    
    setTimeout(() => {
      if (testRunStatus.process) {
        testRunStatus.process.kill('SIGKILL');
      }
    }, 5000); // Force kill after 5 seconds if needed
    
    testRunStatus.running = false;
    testRunStatus.process = null;
    
    res.json({
      message: 'Tests stopped successfully'
    });
    
  } catch (error) {
    console.error('Error stopping tests:', error);
    res.status(500).json({
      error: 'Failed to stop tests',
      details: error.message
    });
  }
});

// Get HTML report (if available)
router.get('/report', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const reportIndexPath = path.join(playwrightResultsDir, 'index.html');
    await fs.access(reportIndexPath);
    
    res.json({
      available: true,
      path: reportIndexPath,
      url: `file://${reportIndexPath}`
    });
  } catch (error) {
    res.json({
      available: false,
      message: 'HTML report not available. Run tests to generate it.'
    });
  }
});

export default router;