import React, { useState } from 'react';
import { tasksAPI, projectsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

interface DebugStep {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: any;
  error?: string;
}

export const TaskUpdateDebugger: React.FC = () => {
  const [taskId, setTaskId] = useState('We10MhRs7rOTfsCQu2l2');
  const [projectId, setProjectId] = useState('OFMdnuTRVcIWyG4bPQ2l');
  const [assigneeId, setAssigneeId] = useState('1');
  const [steps, setSteps] = useState<DebugStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateStep = (stepName: string, status: DebugStep['status'], result?: any, error?: string) => {
    setSteps(prev => {
      const existing = prev.find(s => s.step === stepName);
      if (existing) {
        existing.status = status;
        existing.result = result;
        existing.error = error;
        return [...prev];
      } else {
        return [...prev, { step: stepName, status, result, error }];
      }
    });
  };

  const runDebugTest = async () => {
    setIsRunning(true);
    setSteps([]);

    try {
      // Step 1: Get current task
      updateStep('Get Current Task', 'running');
      const currentTaskResponse = await tasksAPI.getOne(taskId);
      const currentTask = currentTaskResponse.data;
      updateStep('Get Current Task', 'success', {
        id: currentTask.id,
        projectId: currentTask.projectId,
        assigneeId: currentTask.assigneeId,
        title: currentTask.title
      });

      // Step 2: Get projects list
      updateStep('Get Projects', 'running');
      const projectsResponse = await projectsAPI.getAll();
      const targetProject = projectsResponse.data.find((p: any) => p.id == projectId);
      updateStep('Get Projects', 'success', {
        totalProjects: projectsResponse.data.length,
        targetProject: targetProject ? { id: targetProject.id, name: targetProject.name } : 'NOT FOUND'
      });

      // Step 3: Update task
      updateStep('Update Task', 'running');
      const updatePayload = {
        title: currentTask.title,
        description: currentTask.description || '',
        priority: currentTask.priority,
        dueDate: currentTask.due_date || undefined,
        assigneeId: assigneeId,
        projectId: parseInt(projectId)
      };

      console.log('🔍 Debug Update Payload:', updatePayload);
      
      const updateResponse = await tasksAPI.update(taskId, updatePayload);
      updateStep('Update Task', 'success', updateResponse.data);

      // Step 4: Verify task was updated
      updateStep('Verify Update', 'running');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const verifyResponse = await tasksAPI.getOne(taskId);
      const updatedTask = verifyResponse.data;
      
      const isProjectUpdated = updatedTask.projectId == projectId;
      const isAssigneeUpdated = updatedTask.assigneeId == assigneeId;
      
      updateStep('Verify Update', isProjectUpdated && isAssigneeUpdated ? 'success' : 'error', {
        projectId: updatedTask.projectId,
        assigneeId: updatedTask.assigneeId,
        columnId: updatedTask.columnId,
        projectMatch: isProjectUpdated,
        assigneeMatch: isAssigneeUpdated
      }, isProjectUpdated && isAssigneeUpdated ? undefined : 'Task was not updated correctly');

    } catch (error: any) {
      console.error('Debug test error:', error);
      updateStep('ERROR', 'error', null, error.message);
    }

    setIsRunning(false);
  };

  const getStepIcon = (status: DebugStep['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  return (
    <Card className="max-w-4xl mx-auto m-4">
      <CardHeader>
        <CardTitle>🧪 Task Update Debugger</CardTitle>
        <p className="text-sm text-muted-foreground">
          Debug tool to test task project assignment functionality
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Task ID</label>
            <Input
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              placeholder="Task ID to test"
              disabled={isRunning}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Project ID</label>
            <Input
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Target project ID"
              disabled={isRunning}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Assignee ID</label>
            <Input
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              placeholder="Target assignee ID"
              disabled={isRunning}
            />
          </div>
        </div>

        <Button
          onClick={runDebugTest}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? '🔄 Running Debug Test...' : '🧪 Run Debug Test'}
        </Button>

        {steps.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Test Results:</h3>
            {steps.map((step, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  step.status === 'error'
                    ? 'border-red-200 bg-red-50'
                    : step.status === 'success'
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{getStepIcon(step.status)}</span>
                  <span className="font-medium">{step.step}</span>
                </div>
                {step.result && (
                  <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto">
                    {JSON.stringify(step.result, null, 2)}
                  </pre>
                )}
                {step.error && (
                  <div className="mt-2 text-sm text-red-600">
                    Error: {step.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};