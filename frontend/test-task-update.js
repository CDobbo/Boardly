#!/usr/bin/env node

/**
 * Test script to verify task project update functionality
 * This simulates the full flow: Frontend -> Backend -> Database
 */

const https = require('https');
const fs = require('fs');

// Test configuration
const API_BASE = 'https://boardlytasks.netlify.app/.netlify/functions/api-final';
const TEST_CONFIG = {
  // You'll need to replace these with actual values from your app
  authToken: process.env.TEST_AUTH_TOKEN || 'YOUR_AUTH_TOKEN_HERE',
  testTaskId: process.env.TEST_TASK_ID || 'We10MhRs7rOTfsCQu2l2',
  testProjectId: process.env.TEST_PROJECT_ID || 'OFMdnuTRVcIWyG4bPQ2l',
  testAssigneeId: process.env.TEST_ASSIGNEE_ID || '1'
};

console.log('🧪 Starting Task Project Update Test');
console.log('====================================');

// Helper function to make API requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'boardlytasks.netlify.app',
      port: 443,
      path: `/.netlify/functions/api-final${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_CONFIG.authToken}`,
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ statusCode: res.statusCode, data: parsed, raw: responseData });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: null, raw: responseData });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test Step 1: Get current task state
async function getCurrentTaskState() {
  console.log('📋 Step 1: Getting current task state...');
  try {
    const response = await makeRequest('GET', `/tasks/${TEST_CONFIG.testTaskId}`);
    console.log(`   Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log('   ✅ Task retrieved successfully');
      console.log(`   Current projectId: ${response.data.projectId || 'null'}`);
      console.log(`   Current assigneeId: ${response.data.assigneeId || 'null'}`);
      return response.data;
    } else {
      console.log('   ❌ Failed to retrieve task');
      console.log(`   Response: ${response.raw}`);
      return null;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return null;
  }
}

// Test Step 2: Update task project
async function updateTaskProject(currentTask) {
  console.log('📝 Step 2: Updating task project...');
  
  const updatePayload = {
    title: currentTask.title,
    description: currentTask.description || '',
    priority: currentTask.priority,
    dueDate: currentTask.due_date || undefined,
    assigneeId: parseInt(TEST_CONFIG.testAssigneeId),
    projectId: parseInt(TEST_CONFIG.testProjectId),
    columnId: null // Let backend assign default column
  };

  console.log('   Payload:', JSON.stringify(updatePayload, null, 2));

  try {
    const response = await makeRequest('PUT', `/tasks/${TEST_CONFIG.testTaskId}`, updatePayload);
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response: ${response.raw}`);
    
    if (response.statusCode === 200) {
      console.log('   ✅ Task update request completed');
      return response.data;
    } else {
      console.log('   ❌ Task update failed');
      return null;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return null;
  }
}

// Test Step 3: Verify task was updated
async function verifyTaskUpdate() {
  console.log('🔍 Step 3: Verifying task was updated...');
  
  // Wait a moment for database to update
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    const response = await makeRequest('GET', `/tasks/${TEST_CONFIG.testTaskId}`);
    console.log(`   Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const task = response.data;
      console.log('   Task state after update:');
      console.log(`     projectId: ${task.projectId}`);
      console.log(`     assigneeId: ${task.assigneeId}`);
      console.log(`     columnId: ${task.columnId}`);
      
      // Check if updates were applied
      const projectUpdated = task.projectId == TEST_CONFIG.testProjectId;
      const assigneeUpdated = task.assigneeId == TEST_CONFIG.testAssigneeId;
      
      if (projectUpdated && assigneeUpdated) {
        console.log('   ✅ Task was updated successfully in database');
        return task;
      } else {
        console.log('   ❌ Task was not updated properly');
        console.log(`     Expected projectId: ${TEST_CONFIG.testProjectId}, got: ${task.projectId}`);
        console.log(`     Expected assigneeId: ${TEST_CONFIG.testAssigneeId}, got: ${task.assigneeId}`);
        return null;
      }
    } else {
      console.log('   ❌ Failed to retrieve updated task');
      return null;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return null;
  }
}

// Test Step 4: Check if task appears in project's kanban board
async function checkKanbanBoard(task) {
  console.log('📋 Step 4: Checking if task appears in project kanban board...');
  
  try {
    const response = await makeRequest('GET', `/boards/project/${TEST_CONFIG.testProjectId}`);
    console.log(`   Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const boardData = response.data;
      console.log('   Board data received');
      
      // Look for our task in the board columns
      const taskFound = boardData.columns?.some(column => 
        column.tasks?.some(boardTask => boardTask.id === TEST_CONFIG.testTaskId)
      );
      
      if (taskFound) {
        console.log('   ✅ Task found in project kanban board');
        return true;
      } else {
        console.log('   ❌ Task NOT found in project kanban board');
        console.log('   Board structure:', JSON.stringify(boardData, null, 2));
        return false;
      }
    } else {
      console.log('   ❌ Failed to retrieve board data');
      console.log(`   Response: ${response.raw}`);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

// Run the full test suite
async function runTest() {
  console.log(`Testing with configuration:`);
  console.log(`  Task ID: ${TEST_CONFIG.testTaskId}`);
  console.log(`  Project ID: ${TEST_CONFIG.testProjectId}`);
  console.log(`  Assignee ID: ${TEST_CONFIG.testAssigneeId}`);
  console.log(`  Auth Token: ${TEST_CONFIG.authToken ? 'Set' : 'NOT SET'}`);
  console.log('');

  if (TEST_CONFIG.authToken === 'YOUR_AUTH_TOKEN_HERE') {
    console.log('❌ Please set environment variables or update TEST_CONFIG');
    console.log('   export TEST_AUTH_TOKEN=your_actual_token');
    console.log('   export TEST_TASK_ID=actual_task_id');
    console.log('   export TEST_PROJECT_ID=actual_project_id');
    return;
  }

  // Step 1: Get current state
  const currentTask = await getCurrentTaskState();
  if (!currentTask) {
    console.log('\n❌ TEST FAILED: Could not retrieve current task');
    return;
  }

  console.log('');

  // Step 2: Update task
  const updateResult = await updateTaskProject(currentTask);
  if (!updateResult) {
    console.log('\n❌ TEST FAILED: Could not update task');
    return;
  }

  console.log('');

  // Step 3: Verify update
  const updatedTask = await verifyTaskUpdate();
  if (!updatedTask) {
    console.log('\n❌ TEST FAILED: Task was not updated in database');
    return;
  }

  console.log('');

  // Step 4: Check kanban board
  const inKanbanBoard = await checkKanbanBoard(updatedTask);
  
  console.log('\n' + '='.repeat(50));
  if (inKanbanBoard) {
    console.log('✅ ALL TESTS PASSED: Task project update is working correctly!');
  } else {
    console.log('❌ TEST FAILED: Task updated in database but not visible in kanban board');
  }
  console.log('='.repeat(50));
}

// Run if called directly
if (require.main === module) {
  runTest().catch(console.error);
}

module.exports = { runTest };