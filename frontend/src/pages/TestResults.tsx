import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  RotateCw,
  TestTube,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface TestSuite {
  title: string;
  file: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  tests: TestCase[];
}

interface TestCase {
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string | null;
}

interface TestResultsData {
  status: string;
  lastRun: string | null;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  suites: TestSuite[];
  message?: string;
  rawOutput?: string;
}

const TestResults: React.FC = () => {
  const [results, setResults] = useState<TestResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<string>('all');
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [runningTime, setRunningTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchResults = async () => {
    try {
      const token = localStorage.getItem('token');
      // Fetching test results
      
      const response = await fetch('http://localhost:5002/api/tests/results', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Response received
      
      if (response.ok) {
        const data = await response.json();
        // Results fetched
        setResults(data);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch results:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching test results:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5002/api/tests/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Status check complete
        setRunning(data.running);
        
        if (!data.running && pollingInterval) {
          console.log('Tests completed, stopping polling and fetching results');
          clearInterval(pollingInterval);
          setPollingInterval(null);
          if (timerInterval) {
            clearInterval(timerInterval);
            setTimerInterval(null);
          }
          await fetchResults();
        }
      } else {
        console.error('Status check failed:', response.status);
      }
    } catch (error) {
      console.error('Error checking test status:', error);
    }
  };

  const runTests = async (suite: string = 'all') => {
    console.log('=== Running Tests Debug ===');
    console.log('Suite:', suite);
    
    const token = localStorage.getItem('token');
    // Checking authentication token
    
    if (!token) {
      console.error('No authentication token found');
      alert('Authentication token not found. Please log in again.');
      return;
    }
    
    // Clear existing results and polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    setResults(null);
    setRunning(true);
    setRunningTime(0);
    setSelectedSuite(suite);
    
    // Start timer
    const timer = setInterval(() => {
      setRunningTime(prev => prev + 1);
    }, 1000);
    setTimerInterval(timer);
    
    try {
      console.log('Making request to:', 'http://localhost:5002/api/tests/run');
      
      const response = await fetch('http://localhost:5002/api/tests/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ suite })
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Test run started successfully:', data);
        
        // Start polling for results every 2 seconds
        const interval = setInterval(async () => {
          console.log('Polling for test status...');
          await checkStatus();
        }, 2000);
        setPollingInterval(interval);
      } else {
        const errorText = await response.text();
        console.error('Failed to start tests:', response.status, errorText);
        alert(`Failed to start tests: ${response.status} - ${errorText}`);
        setRunning(false);
        if (timerInterval) {
          clearInterval(timerInterval);
          setTimerInterval(null);
        }
      }
    } catch (error) {
      console.error('Error running tests:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error running tests: ${errorMessage}`);
      setRunning(false);
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }
  };

  useEffect(() => {
    fetchResults();
    checkStatus();
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup polling interval when component unmounts or pollingInterval changes
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Cleanup timer interval when component unmounts or timerInterval changes
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  const toggleSuite = (suite: string) => {
    const newExpanded = new Set(expandedSuites);
    if (newExpanded.has(suite)) {
      newExpanded.delete(suite);
    } else {
      newExpanded.add(suite);
    }
    setExpandedSuites(newExpanded);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'skipped':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-green-100 text-green-800">Passed</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'skipped':
        return <Badge className="bg-yellow-100 text-yellow-800">Skipped</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RotateCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          @keyframes progress {
            0% {
              transform: translateX(-100%);
            }
            50% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(100%);
            }
          }
        `}
      </style>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TestTube className="w-8 h-8" />
          Test Results
        </h1>
        
        <div className="flex gap-2">
          <select
            className="px-3 py-2 border rounded-lg"
            value={selectedSuite}
            onChange={(e) => setSelectedSuite(e.target.value)}
            disabled={running}
          >
            <option value="all">All Tests</option>
            <option value="auth">Authentication</option>
            <option value="tasks">Tasks</option>
            <option value="admin">Admin</option>
            <option value="persistence">Persistence</option>
            <option value="demo">Demo Tests</option>
          </select>
          
          <button
            onClick={() => runTests(selectedSuite)}
            disabled={running}
            style={{
              padding: '8px 16px',
              backgroundColor: running ? '#6b7280' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: running ? 'not-allowed' : 'pointer'
            }}
          >
            {running ? '🔄 Running Tests...' : '▶️ Run Tests'}
          </button>
          
          <button
            onClick={async () => {
              try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:5002/api/tests/report', {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.available) {
                  // Since we can't open local files from web, show a message
                  alert(`HTML report is available at: playwright-report/index.html\n\nRun 'npx playwright show-report' in terminal to view it.`);
                } else {
                  alert('No HTML report available. Run tests first to generate a report.');
                }
              } catch (error) {
                console.error('Error checking report:', error);
                alert('Error checking HTML report availability.');
              }
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📊 View HTML Report
          </button>
        </div>
      </div>

      {/* Test Running Progress Indicator */}
      {running && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="relative">
              <RotateCw className="w-12 h-12 text-blue-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <TestTube className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-blue-900">
                Tests in Progress
              </h2>
              <p className="text-blue-700 mt-1">
                Running {selectedSuite === 'all' ? 'all test suites' : `${selectedSuite} tests`}...
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Clock className="w-4 h-4" />
                  <span>Executing Playwright tests</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Results will appear automatically when complete</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-600 font-semibold">
                  <RotateCw className="w-4 h-4" />
                  <span>Running for: {Math.floor(runningTime / 60)}:{(runningTime % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>
              
              {/* Progress bar animation */}
              <div className="mt-4 w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full animate-pulse"
                  style={{
                    width: '100%',
                    animation: 'progress 2s ease-in-out infinite'
                  }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {results && results.lastRun && (
        <div className="text-sm text-gray-500">
          Last run: {new Date(results.lastRun).toLocaleString()}
        </div>
      )}

      {results?.status === 'no_results' ? (
        <Card className="p-6">
          <div className="text-center text-gray-500">
            <TestTube className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">No test results available</p>
            <p className="text-sm">Run tests to see results</p>
          </div>
        </Card>
      ) : results ? (
        <>
          {/* Summary Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Test Summary</h2>
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{results?.summary?.total || 0}</div>
                <div className="text-sm text-gray-500">Total Tests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {results?.summary?.passed || 0}
                </div>
                <div className="text-sm text-gray-500">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {results?.summary?.failed || 0}
                </div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {results?.summary?.skipped || 0}
                </div>
                <div className="text-sm text-gray-500">Skipped</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatDuration(results?.summary?.duration || 0)}
                </div>
                <div className="text-sm text-gray-500">Duration</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div className="flex h-full">
                  {(results?.summary?.passed || 0) > 0 && (
                    <div
                      className="bg-green-500"
                      style={{
                        width: `${((results?.summary?.passed || 0) / (results?.summary?.total || 1)) * 100}%`
                      }}
                    />
                  )}
                  {(results?.summary?.failed || 0) > 0 && (
                    <div
                      className="bg-red-500"
                      style={{
                        width: `${((results?.summary?.failed || 0) / (results?.summary?.total || 1)) * 100}%`
                      }}
                    />
                  )}
                  {(results?.summary?.skipped || 0) > 0 && (
                    <div
                      className="bg-yellow-500"
                      style={{
                        width: `${((results?.summary?.skipped || 0) / (results?.summary?.total || 1)) * 100}%`
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Test Suites */}
          {results?.suites && results.suites.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Test Suites</h2>
              {results.suites.map((suite, index) => (
                <Card key={index} className="overflow-hidden">
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleSuite(suite.title)}
                  >
                    <div className="flex items-center gap-2">
                      {expandedSuites.has(suite.title) ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                      <h3 className="font-semibold">{suite.title}</h3>
                      <span className="text-sm text-gray-500">
                        {suite.file}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2">
                        {suite.passed > 0 && (
                          <Badge className="bg-green-100 text-green-800">
                            {suite.passed} passed
                          </Badge>
                        )}
                        {suite.failed > 0 && (
                          <Badge className="bg-red-100 text-red-800">
                            {suite.failed} failed
                          </Badge>
                        )}
                        {suite.skipped > 0 && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            {suite.skipped} skipped
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDuration(suite.duration)}
                      </span>
                    </div>
                  </div>
                  
                  {expandedSuites.has(suite.title) && suite.tests && (
                    <div className="border-t">
                      {suite.tests.map((test, testIndex) => (
                        <div
                          key={testIndex}
                          className="p-4 border-b last:border-b-0 hover:bg-gray-50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2">
                              {getStatusIcon(test.status)}
                              <div>
                                <div className="font-medium">{test.title}</div>
                                {test.error && (
                                  <pre className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded overflow-x-auto">
                                    {test.error}
                                  </pre>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(test.status)}
                              <span className="text-sm text-gray-500">
                                {formatDuration(test.duration)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Raw Output (if no structured results) */}
          {results?.rawOutput && !results.suites?.length && (
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Test Output</h3>
              <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
                {results.rawOutput}
              </pre>
            </Card>
          )}
        </>
      ) : null}
      </div>
    </>
  );
};

export default TestResults;