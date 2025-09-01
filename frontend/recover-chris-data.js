#!/usr/bin/env node

/**
 * Emergency Data Recovery Script for chris@chris.com
 * This script will:
 * 1. Create "Daily Tasks" and "AI Tasks" projects
 * 2. Find all tasks and assign them to chris@chris.com
 * 3. Categorize tasks into appropriate projects
 * 4. Remove other projects without deleting tasks
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  "type": "service_account",
  "project_id": "boardly-95104",
  "private_key_id": "YOUR_PRIVATE_KEY_ID",
  "private_key": "YOUR_PRIVATE_KEY",
  "client_email": "firebase-adminsdk@boardly-95104.iam.gserviceaccount.com",
  "client_id": "YOUR_CLIENT_ID",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "YOUR_CERT_URL"
};

// Initialize the app
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'boardly-95104'
});

const db = admin.firestore();

async function recoverChrisData() {
  console.log('🚨 Starting Emergency Data Recovery for chris@chris.com');
  console.log('================================================');
  
  try {
    // Step 1: Get Chris's user ID
    console.log('\n📋 Step 1: Finding chris@chris.com user...');
    const auth = admin.auth();
    let chrisUser;
    try {
      chrisUser = await auth.getUserByEmail('chris@chris.com');
      console.log('✅ Found user:', chrisUser.uid);
    } catch (error) {
      console.error('❌ User not found, please ensure chris@chris.com exists');
      return;
    }

    // Step 2: Create the two required projects
    console.log('\n📋 Step 2: Creating required projects...');
    
    const dailyTasksProject = {
      name: 'Daily Tasks',
      description: 'Everyday tasks and personal activities',
      userId: chrisUser.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      members: [chrisUser.uid],
      owner: 'chris@chris.com',
      owner_email: 'chris@chris.com',
      owner_name: 'Chris',
      role: 'owner',
      color: '#3B82F6' // Blue
    };

    const aiTasksProject = {
      name: 'AI Tasks',
      description: 'AI development and programming tasks',
      userId: chrisUser.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      members: [chrisUser.uid],
      owner: 'chris@chris.com',
      owner_email: 'chris@chris.com',
      owner_name: 'Chris',
      role: 'owner',
      color: '#8B5CF6' // Purple
    };

    // Check if projects already exist
    const existingProjects = await db.collection('projects')
      .where('userId', '==', chrisUser.uid)
      .get();
    
    let dailyTasksId = null;
    let aiTasksId = null;
    
    // Find existing or create new projects
    existingProjects.forEach(doc => {
      const data = doc.data();
      if (data.name === 'Daily Tasks') {
        dailyTasksId = doc.id;
        console.log('📌 Found existing Daily Tasks project:', doc.id);
      } else if (data.name === 'AI Tasks') {
        aiTasksId = doc.id;
        console.log('📌 Found existing AI Tasks project:', doc.id);
      }
    });

    if (!dailyTasksId) {
      const dailyRef = await db.collection('projects').add(dailyTasksProject);
      dailyTasksId = dailyRef.id;
      console.log('✅ Created Daily Tasks project:', dailyTasksId);
    }

    if (!aiTasksId) {
      const aiRef = await db.collection('projects').add(aiTasksProject);
      aiTasksId = aiRef.id;
      console.log('✅ Created AI Tasks project:', aiTasksId);
    }

    // Step 3: Create boards for each project if they don't exist
    console.log('\n📋 Step 3: Creating boards for projects...');
    
    const boardTemplate = {
      columns: [
        { id: '1', name: 'To Do', order: 0, color: '#94a3b8' },
        { id: '2', name: 'In Progress', order: 1, color: '#3b82f6' },
        { id: '3', name: 'Review', order: 2, color: '#f59e0b' },
        { id: '4', name: 'Done', order: 3, color: '#10b981' }
      ]
    };

    // Check/create board for Daily Tasks
    const dailyBoard = await db.collection('boards')
      .where('projectId', '==', String(dailyTasksId))
      .get();
    
    if (dailyBoard.empty) {
      await db.collection('boards').add({
        ...boardTemplate,
        projectId: String(dailyTasksId),
        userId: chrisUser.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Created board for Daily Tasks');
    }

    // Check/create board for AI Tasks
    const aiBoard = await db.collection('boards')
      .where('projectId', '==', String(aiTasksId))
      .get();
    
    if (aiBoard.empty) {
      await db.collection('boards').add({
        ...boardTemplate,
        projectId: String(aiTasksId),
        userId: chrisUser.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Created board for AI Tasks');
    }

    // Step 4: Find all tasks and reassign them
    console.log('\n📋 Step 4: Finding and reassigning all tasks...');
    
    const allTasks = await db.collection('tasks').get();
    console.log(`Found ${allTasks.size} total tasks`);
    
    let tasksUpdated = 0;
    let aiTasksCount = 0;
    let dailyTasksCount = 0;

    // Keywords for categorization
    const aiKeywords = [
      'ai', 'api', 'backend', 'frontend', 'code', 'programming', 
      'debug', 'deploy', 'build', 'test', 'component', 'function',
      'react', 'javascript', 'typescript', 'database', 'firebase',
      'netlify', 'node', 'npm', 'git', 'development', 'bug', 'fix',
      'implement', 'feature', 'update', 'refactor', 'optimize',
      'task manager', 'boardly', 'kanban', 'auth', 'user', 'project board'
    ];

    for (const doc of allTasks.docs) {
      const task = doc.data();
      const taskId = doc.id;
      
      // Determine which project this task belongs to
      let targetProjectId = dailyTasksId;
      const taskText = `${task.title || ''} ${task.description || ''}`.toLowerCase();
      
      // Check if task contains AI/programming related keywords
      const isAiTask = aiKeywords.some(keyword => taskText.includes(keyword));
      
      if (isAiTask) {
        targetProjectId = aiTasksId;
        aiTasksCount++;
      } else {
        dailyTasksCount++;
      }

      // Update task with new project and user assignment
      await db.collection('tasks').doc(taskId).update({
        userId: chrisUser.uid,
        assigneeId: chrisUser.uid,
        assignee_id: chrisUser.uid,
        assignee_name: 'Chris',
        projectId: targetProjectId,
        project_id: targetProjectId,
        project_name: isAiTask ? 'AI Tasks' : 'Daily Tasks',
        columnId: '1', // To Do column
        column_name: 'To Do',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      tasksUpdated++;
      console.log(`✅ Updated task: "${task.title || 'Untitled'}" -> ${isAiTask ? 'AI Tasks' : 'Daily Tasks'}`);
    }

    console.log(`\n📊 Task Assignment Summary:`);
    console.log(`   Total tasks updated: ${tasksUpdated}`);
    console.log(`   AI Tasks: ${aiTasksCount}`);
    console.log(`   Daily Tasks: ${dailyTasksCount}`);

    // Step 5: Remove other projects (but keep the tasks)
    console.log('\n📋 Step 5: Removing other projects...');
    
    let projectsDeleted = 0;
    const projectsToDelete = await db.collection('projects')
      .where('userId', '==', chrisUser.uid)
      .get();
    
    for (const doc of projectsToDelete.docs) {
      const project = doc.data();
      if (project.name !== 'Daily Tasks' && project.name !== 'AI Tasks') {
        await db.collection('projects').doc(doc.id).delete();
        console.log(`🗑️ Deleted project: ${project.name}`);
        projectsDeleted++;
        
        // Also delete associated boards
        const boards = await db.collection('boards')
          .where('projectId', '==', doc.id)
          .get();
        
        for (const boardDoc of boards.docs) {
          await db.collection('boards').doc(boardDoc.id).delete();
        }
      }
    }
    
    console.log(`\n✅ Cleanup complete: Deleted ${projectsDeleted} other projects`);
    
    // Step 6: Final verification
    console.log('\n📋 Step 6: Final verification...');
    
    const finalProjects = await db.collection('projects')
      .where('userId', '==', chrisUser.uid)
      .get();
    
    console.log('\n✅ Final Project List:');
    finalProjects.forEach(doc => {
      const project = doc.data();
      console.log(`   - ${project.name} (ID: ${doc.id})`);
    });
    
    const finalTasks = await db.collection('tasks')
      .where('userId', '==', chrisUser.uid)
      .get();
    
    console.log(`\n✅ Final Task Count: ${finalTasks.size}`);
    
    console.log('\n🎉 Recovery Complete!');
    console.log('================================================');
    console.log('All tasks have been:');
    console.log('1. Assigned to chris@chris.com');
    console.log('2. Categorized into "Daily Tasks" or "AI Tasks"');
    console.log('3. Preserved (no tasks were deleted)');
    console.log('4. Other projects removed');
    
  } catch (error) {
    console.error('❌ Recovery failed:', error);
    console.error('Error details:', error.message);
  } finally {
    // Clean up
    await admin.app().delete();
    process.exit(0);
  }
}

// Run the recovery
recoverChrisData();