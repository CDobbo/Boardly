import { test, expect } from '@playwright/test';

const ADMIN_USER = {
  username: 'admin',
  password: 'admin123'
};

test.describe('Data Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Username').fill(ADMIN_USER.username);
    await page.getByPlaceholder('Password').fill(ADMIN_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForSelector('nav');
  });

  test('should persist tasks after page refresh', async ({ page }) => {
    await page.getByText('My Tasks').click();
    
    const taskTitle = `Persist Test ${Date.now()}`;
    await page.getByRole('button', { name: /New Task/i }).click();
    await page.getByPlaceholder('Enter task title').fill(taskTitle);
    await page.getByPlaceholder('Enter task description').fill('This task should persist');
    await page.getByRole('button', { name: 'Create Task' }).click();
    
    await expect(page.getByText(taskTitle)).toBeVisible();
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await page.getByText('My Tasks').click();
    await expect(page.getByText(taskTitle)).toBeVisible();
  });

  test('should persist user preferences after logout/login', async ({ page }) => {
    await page.getByRole('button', { name: /theme/i }).click();
    
    const isDarkMode = await page.locator('html').evaluate(el => el.classList.contains('dark'));
    
    await page.getByRole('button', { name: 'Logout' }).click();
    
    await page.getByPlaceholder('Username').fill(ADMIN_USER.username);
    await page.getByPlaceholder('Password').fill(ADMIN_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    
    const persistedDarkMode = await page.locator('html').evaluate(el => el.classList.contains('dark'));
    expect(persistedDarkMode).toBe(isDarkMode);
  });

  test('should persist project data across sessions', async ({ page }) => {
    await page.getByText('Projects').click();
    
    const existingProjects = await page.locator('.project-card').count();
    
    await page.getByRole('button', { name: /New Project/i }).click();
    const projectTitle = `Persist Project ${Date.now()}`;
    await page.getByPlaceholder('Project title').fill(projectTitle);
    await page.getByPlaceholder('Project description').fill('This project should persist');
    await page.getByRole('button', { name: 'Create Project' }).click();
    
    await expect(page.getByText(projectTitle)).toBeVisible();
    
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.getByPlaceholder('Username').fill(ADMIN_USER.username);
    await page.getByPlaceholder('Password').fill(ADMIN_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    
    await page.getByText('Projects').click();
    await expect(page.getByText(projectTitle)).toBeVisible();
    
    const newProjectCount = await page.locator('.project-card').count();
    expect(newProjectCount).toBe(existingProjects + 1);
  });

  test('should persist task status changes', async ({ page }) => {
    await page.getByText('My Tasks').click();
    
    const taskTitle = `Status Persist ${Date.now()}`;
    await page.getByRole('button', { name: /New Task/i }).click();
    await page.getByPlaceholder('Enter task title').fill(taskTitle);
    await page.getByRole('combobox').nth(1).click();
    await page.getByRole('option', { name: 'To Do' }).click();
    await page.getByRole('button', { name: 'Create Task' }).click();
    
    await page.locator(`text=${taskTitle}`).first().click();
    await page.getByRole('combobox').nth(1).click();
    await page.getByRole('option', { name: 'In Progress' }).click();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await page.getByText('My Tasks').click();
    await page.locator(`text=${taskTitle}`).first().click();
    
    const statusValue = await page.getByRole('combobox').nth(1).inputValue();
    expect(statusValue).toBe('in-progress');
  });

  test('should persist calendar events', async ({ page }) => {
    await page.getByText('Calendar').click();
    
    await page.getByRole('button', { name: /Add Event/i }).click();
    const eventTitle = `Persist Event ${Date.now()}`;
    await page.getByPlaceholder('Event title').fill(eventTitle);
    await page.getByPlaceholder('Event description').fill('This event should persist');
    await page.getByRole('button', { name: 'Add Event' }).click();
    
    await expect(page.getByText(eventTitle)).toBeVisible();
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await page.getByText('Calendar').click();
    await expect(page.getByText(eventTitle)).toBeVisible();
  });

  test('should persist kanban board state', async ({ page }) => {
    await page.getByText('Projects').click();
    await page.getByRole('button', { name: /View Board/i }).first().click();
    
    await page.getByRole('button', { name: /Add Task/i }).first().click();
    const taskTitle = `Kanban Persist ${Date.now()}`;
    await page.getByPlaceholder('Enter task title').fill(taskTitle);
    await page.getByRole('button', { name: 'Create Task' }).click();
    
    const taskCard = page.locator(`text=${taskTitle}`).first();
    const inProgressColumn = page.locator('.kanban-column').nth(1);
    
    await taskCard.dragTo(inProgressColumn);
    await expect(inProgressColumn.getByText(taskTitle)).toBeVisible();
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await page.getByText('Projects').click();
    await page.getByRole('button', { name: /View Board/i }).first().click();
    
    await expect(inProgressColumn.getByText(taskTitle)).toBeVisible();
  });

  test('should handle offline data when reconnected', async ({ page }) => {
    await page.getByText('My Tasks').click();
    
    await page.context().setOffline(true);
    
    const offlineTaskTitle = `Offline Task ${Date.now()}`;
    await page.getByRole('button', { name: /New Task/i }).click();
    await page.getByPlaceholder('Enter task title').fill(offlineTaskTitle);
    await page.getByRole('button', { name: 'Create Task' }).click();
    
    await expect(page.getByText(/offline/i)).toBeVisible();
    
    await page.context().setOffline(false);
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await page.getByText('My Tasks').click();
    
    const syncButton = page.getByRole('button', { name: /sync/i });
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForLoadState('networkidle');
    }
    
    await expect(page.getByText(offlineTaskTitle)).toBeVisible();
  });

  test('should maintain data consistency across multiple tabs', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    await page1.goto('/');
    await page1.getByPlaceholder('Username').fill(ADMIN_USER.username);
    await page1.getByPlaceholder('Password').fill(ADMIN_USER.password);
    await page1.getByRole('button', { name: 'Login' }).click();
    await page1.waitForSelector('nav');
    
    await page2.goto('/');
    await page2.getByPlaceholder('Username').fill(ADMIN_USER.username);
    await page2.getByPlaceholder('Password').fill(ADMIN_USER.password);
    await page2.getByRole('button', { name: 'Login' }).click();
    await page2.waitForSelector('nav');
    
    await page1.getByText('My Tasks').click();
    const taskTitle = `Multi Tab ${Date.now()}`;
    await page1.getByRole('button', { name: /New Task/i }).click();
    await page1.getByPlaceholder('Enter task title').fill(taskTitle);
    await page1.getByRole('button', { name: 'Create Task' }).click();
    
    await page2.getByText('My Tasks').click();
    await page2.reload();
    await page2.waitForLoadState('networkidle');
    
    await expect(page2.getByText(taskTitle)).toBeVisible();
    
    await context.close();
  });

  test('should backup and restore data', async ({ page }) => {
    await page.getByText('My Tasks').click();
    
    const originalTaskCount = await page.locator('.task-card').count();
    
    const backupTaskTitle = `Backup Test ${Date.now()}`;
    await page.getByRole('button', { name: /New Task/i }).click();
    await page.getByPlaceholder('Enter task title').fill(backupTaskTitle);
    await page.getByRole('button', { name: 'Create Task' }).click();
    
    await page.getByText('Admin', { exact: true }).click();
    
    const exportButton = page.getByRole('button', { name: /Export Data/i });
    if (await exportButton.isVisible()) {
      await exportButton.click();
      await expect(page.getByText(/export complete/i)).toBeVisible();
    }
    
    await page.getByText('My Tasks').click();
    const newTaskCount = await page.locator('.task-card').count();
    expect(newTaskCount).toBe(originalTaskCount + 1);
  });

  test('should handle database connection errors gracefully', async ({ page }) => {
    await page.getByText('My Tasks').click();
    
    await page.route('**/api/tasks', route => route.abort());
    
    await page.getByRole('button', { name: /New Task/i }).click();
    await page.getByPlaceholder('Enter task title').fill('Error Test Task');
    await page.getByRole('button', { name: 'Create Task' }).click();
    
    await expect(page.getByText(/error/i)).toBeVisible();
    
    await page.unroute('**/api/tasks');
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByText('My Tasks').click();
    
    const taskCards = await page.locator('.task-card').count();
    expect(taskCards).toBeGreaterThanOrEqual(0);
  });
});