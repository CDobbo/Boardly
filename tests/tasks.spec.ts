import { test, expect } from '@playwright/test';

const ADMIN_USER = {
  username: 'admin',
  password: 'admin123'
};

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Username').fill(ADMIN_USER.username);
    await page.getByPlaceholder('Password').fill(ADMIN_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForSelector('nav');
  });

  test('should navigate to My Tasks page', async ({ page }) => {
    await page.getByText('My Tasks').click();
    await expect(page.locator('h1')).toContainText('My Tasks');
    await expect(page.getByRole('button', { name: /New Task/i })).toBeVisible();
  });

  test('should create a new task', async ({ page }) => {
    await page.getByText('My Tasks').click();
    await page.getByRole('button', { name: /New Task/i }).click();
    
    const taskTitle = `Test Task ${Date.now()}`;
    const taskDescription = 'This is a test task description';
    
    await page.getByPlaceholder('Enter task title').fill(taskTitle);
    await page.getByPlaceholder('Enter task description').fill(taskDescription);
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Medium' }).click();
    
    await page.getByRole('button', { name: 'Create Task' }).click();
    
    await expect(page.getByText(taskTitle)).toBeVisible();
    await expect(page.getByText(taskDescription)).toBeVisible();
  });

  test('should edit an existing task', async ({ page }) => {
    await page.getByText('My Tasks').click();
    
    await page.getByRole('button', { name: /New Task/i }).click();
    const taskTitle = `Edit Test ${Date.now()}`;
    await page.getByPlaceholder('Enter task title').fill(taskTitle);
    await page.getByPlaceholder('Enter task description').fill('Original description');
    await page.getByRole('button', { name: 'Create Task' }).click();
    
    await page.locator(`text=${taskTitle}`).first().click();
    
    const newTitle = `${taskTitle} - Updated`;
    const newDescription = 'Updated description';
    
    await page.getByPlaceholder('Enter task title').clear();
    await page.getByPlaceholder('Enter task title').fill(newTitle);
    await page.getByPlaceholder('Enter task description').clear();
    await page.getByPlaceholder('Enter task description').fill(newDescription);
    
    await page.getByRole('button', { name: 'Save Changes' }).click();
    
    await expect(page.getByText(newTitle)).toBeVisible();
    await expect(page.getByText(newDescription)).toBeVisible();
  });

  test('should delete a task', async ({ page }) => {
    await page.getByText('My Tasks').click();
    
    await page.getByRole('button', { name: /New Task/i }).click();
    const taskTitle = `Delete Test ${Date.now()}`;
    await page.getByPlaceholder('Enter task title').fill(taskTitle);
    await page.getByRole('button', { name: 'Create Task' }).click();
    
    await page.locator(`text=${taskTitle}`).first().click();
    await page.getByRole('button', { name: 'Delete' }).click();
    
    await expect(page.getByText(taskTitle)).not.toBeVisible();
  });

  test('should filter tasks by status', async ({ page }) => {
    await page.getByText('My Tasks').click();
    
    const todoTask = `Todo Task ${Date.now()}`;
    await page.getByRole('button', { name: /New Task/i }).click();
    await page.getByPlaceholder('Enter task title').fill(todoTask);
    await page.getByRole('combobox').nth(1).click();
    await page.getByRole('option', { name: 'To Do' }).click();
    await page.getByRole('button', { name: 'Create Task' }).click();
    
    const inProgressTask = `In Progress Task ${Date.now()}`;
    await page.getByRole('button', { name: /New Task/i }).click();
    await page.getByPlaceholder('Enter task title').fill(inProgressTask);
    await page.getByRole('combobox').nth(1).click();
    await page.getByRole('option', { name: 'In Progress' }).click();
    await page.getByRole('button', { name: 'Create Task' }).click();
    
    await page.getByRole('button', { name: /All Status/i }).click();
    await page.getByRole('menuitem', { name: 'To Do' }).click();
    
    await expect(page.getByText(todoTask)).toBeVisible();
    await expect(page.getByText(inProgressTask)).not.toBeVisible();
    
    await page.getByRole('button', { name: /To Do/i }).click();
    await page.getByRole('menuitem', { name: 'In Progress' }).click();
    
    await expect(page.getByText(todoTask)).not.toBeVisible();
    await expect(page.getByText(inProgressTask)).toBeVisible();
  });

  test('should sort tasks by priority', async ({ page }) => {
    await page.getByText('My Tasks').click();
    
    const highTask = `High Priority ${Date.now()}`;
    await page.getByRole('button', { name: /New Task/i }).click();
    await page.getByPlaceholder('Enter task title').fill(highTask);
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'High' }).click();
    await page.getByRole('button', { name: 'Create Task' }).click();
    
    const lowTask = `Low Priority ${Date.now()}`;
    await page.getByRole('button', { name: /New Task/i }).click();
    await page.getByPlaceholder('Enter task title').fill(lowTask);
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Low' }).click();
    await page.getByRole('button', { name: 'Create Task' }).click();
    
    await page.getByRole('button', { name: /Sort by/i }).click();
    await page.getByRole('menuitem', { name: 'Priority' }).click();
    
    const tasks = await page.locator('.task-card').allTextContents();
    const highIndex = tasks.findIndex(t => t.includes(highTask));
    const lowIndex = tasks.findIndex(t => t.includes(lowTask));
    
    expect(highIndex).toBeLessThan(lowIndex);
  });

  test('should display task count', async ({ page }) => {
    await page.getByText('My Tasks').click();
    
    const taskCount = await page.locator('.task-card').count();
    const displayedCount = await page.getByText(/\d+ task\(s\)/i).textContent();
    
    expect(displayedCount).toContain(taskCount.toString());
  });
});

test.describe('Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Username').fill(ADMIN_USER.username);
    await page.getByPlaceholder('Password').fill(ADMIN_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForSelector('nav');
    await page.getByText('Projects').click();
  });

  test('should display kanban board columns', async ({ page }) => {
    await page.getByRole('button', { name: /View Board/i }).first().click();
    
    await expect(page.getByText('To Do')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Done')).toBeVisible();
  });

  test('should add task to kanban board', async ({ page }) => {
    await page.getByRole('button', { name: /View Board/i }).first().click();
    
    await page.getByRole('button', { name: /Add Task/i }).first().click();
    
    const taskTitle = `Kanban Task ${Date.now()}`;
    await page.getByPlaceholder('Enter task title').fill(taskTitle);
    await page.getByPlaceholder('Enter task description').fill('Kanban task description');
    
    await page.getByRole('button', { name: 'Create Task' }).click();
    
    await expect(page.locator('.kanban-column').first().getByText(taskTitle)).toBeVisible();
  });

  test('should drag task between columns', async ({ page }) => {
    await page.getByRole('button', { name: /View Board/i }).first().click();
    
    await page.getByRole('button', { name: /Add Task/i }).first().click();
    const taskTitle = `Drag Task ${Date.now()}`;
    await page.getByPlaceholder('Enter task title').fill(taskTitle);
    await page.getByRole('button', { name: 'Create Task' }).click();
    
    const taskCard = page.locator(`text=${taskTitle}`).first();
    const inProgressColumn = page.locator('.kanban-column').nth(1);
    
    await taskCard.dragTo(inProgressColumn);
    
    await expect(inProgressColumn.getByText(taskTitle)).toBeVisible();
  });
});

test.describe('Calendar View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Username').fill(ADMIN_USER.username);
    await page.getByPlaceholder('Password').fill(ADMIN_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForSelector('nav');
  });

  test('should navigate to calendar view', async ({ page }) => {
    await page.getByText('Calendar').click();
    await expect(page.locator('h1')).toContainText('Calendar');
    await expect(page.locator('.rbc-calendar')).toBeVisible();
  });

  test('should display current month', async ({ page }) => {
    await page.getByText('Calendar').click();
    
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    await expect(page.locator('.rbc-toolbar-label')).toContainText(currentMonth.split(' ')[0]);
  });

  test('should navigate between months', async ({ page }) => {
    await page.getByText('Calendar').click();
    
    const currentLabel = await page.locator('.rbc-toolbar-label').textContent();
    
    await page.getByRole('button', { name: 'Next' }).click();
    const nextLabel = await page.locator('.rbc-toolbar-label').textContent();
    
    expect(currentLabel).not.toBe(nextLabel);
    
    await page.getByRole('button', { name: 'Back' }).click();
    const backLabel = await page.locator('.rbc-toolbar-label').textContent();
    
    expect(backLabel).toBe(currentLabel);
  });

  test('should switch calendar views', async ({ page }) => {
    await page.getByText('Calendar').click();
    
    await page.getByRole('button', { name: 'Week' }).click();
    await expect(page.locator('.rbc-time-view')).toBeVisible();
    
    await page.getByRole('button', { name: 'Day' }).click();
    await expect(page.locator('.rbc-time-view')).toBeVisible();
    
    await page.getByRole('button', { name: 'Month' }).click();
    await expect(page.locator('.rbc-month-view')).toBeVisible();
  });

  test('should add event from calendar', async ({ page }) => {
    await page.getByText('Calendar').click();
    
    await page.getByRole('button', { name: /Add Event/i }).click();
    
    const eventTitle = `Calendar Event ${Date.now()}`;
    await page.getByPlaceholder('Event title').fill(eventTitle);
    await page.getByPlaceholder('Event description').fill('Test event description');
    
    await page.getByRole('button', { name: 'Add Event' }).click();
    
    await expect(page.getByText(eventTitle)).toBeVisible();
  });
});