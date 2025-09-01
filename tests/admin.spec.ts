import { test, expect } from '@playwright/test';

const ADMIN_USER = {
  username: 'admin',
  password: 'admin123'
};

test.describe('Admin Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Username').fill(ADMIN_USER.username);
    await page.getByPlaceholder('Password').fill(ADMIN_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForSelector('nav');
  });

  test('should navigate to admin panel', async ({ page }) => {
    await page.getByText('Admin', { exact: true }).click();
    await expect(page.locator('h1')).toContainText('Admin Panel');
    await expect(page.getByText('User Management')).toBeVisible();
    await expect(page.getByText('System Statistics')).toBeVisible();
  });

  test('should display user management section', async ({ page }) => {
    await page.getByText('Admin', { exact: true }).click();
    
    await expect(page.getByText('Total Users:')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Username")')).toBeVisible();
    await expect(page.locator('th:has-text("Email")')).toBeVisible();
    await expect(page.locator('th:has-text("Role")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Actions")')).toBeVisible();
  });

  test('should display system statistics', async ({ page }) => {
    await page.getByText('Admin', { exact: true }).click();
    
    await expect(page.getByText('Total Tasks:')).toBeVisible();
    await expect(page.getByText('Active Projects:')).toBeVisible();
    await expect(page.getByText('Completed Tasks:')).toBeVisible();
    await expect(page.getByText('Users Online:')).toBeVisible();
  });

  test('should show user details in table', async ({ page }) => {
    await page.getByText('Admin', { exact: true }).click();
    
    const adminRow = page.locator('tr').filter({ hasText: 'admin' });
    await expect(adminRow.locator('td').nth(1)).toContainText('admin@example.com');
    await expect(adminRow.locator('td').nth(2)).toContainText('admin');
    await expect(adminRow.locator('td').nth(3)).toContainText('Active');
  });

  test('should be able to change user role', async ({ page }) => {
    await page.getByText('Admin', { exact: true }).click();
    
    await page.getByText("Don't have an account? Register").click();
    
    const timestamp = Date.now();
    const testUser = {
      username: `testuser${timestamp}`,
      fullName: 'Test User',
      email: `testuser${timestamp}@example.com`,
      password: 'Password123!'
    };
    
    await page.getByPlaceholder('Username').fill(testUser.username);
    await page.getByPlaceholder('Full Name').fill(testUser.fullName);
    await page.getByPlaceholder('Email').fill(testUser.email);
    await page.getByPlaceholder('Password').fill(testUser.password);
    await page.getByRole('button', { name: 'Register' }).click();
    
    await page.getByPlaceholder('Username').fill(ADMIN_USER.username);
    await page.getByPlaceholder('Password').fill(ADMIN_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    
    await page.getByText('Admin', { exact: true }).click();
    
    const userRow = page.locator('tr').filter({ hasText: testUser.username });
    await userRow.getByRole('button', { name: 'Edit' }).click();
    
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'admin' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    
    await expect(userRow.locator('td').nth(2)).toContainText('admin');
  });

  test('should be able to deactivate user', async ({ page }) => {
    await page.goto('/');
    await page.getByText("Don't have an account? Register").click();
    
    const timestamp = Date.now();
    const testUser = {
      username: `deactivateuser${timestamp}`,
      fullName: 'Deactivate Test User',
      email: `deactivate${timestamp}@example.com`,
      password: 'Password123!'
    };
    
    await page.getByPlaceholder('Username').fill(testUser.username);
    await page.getByPlaceholder('Full Name').fill(testUser.fullName);
    await page.getByPlaceholder('Email').fill(testUser.email);
    await page.getByPlaceholder('Password').fill(testUser.password);
    await page.getByRole('button', { name: 'Register' }).click();
    
    await page.getByPlaceholder('Username').fill(ADMIN_USER.username);
    await page.getByPlaceholder('Password').fill(ADMIN_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    
    await page.getByText('Admin', { exact: true }).click();
    
    const userRow = page.locator('tr').filter({ hasText: testUser.username });
    await userRow.getByRole('button', { name: 'Deactivate' }).click();
    
    await expect(userRow.locator('td').nth(3)).toContainText('Inactive');
  });

  test('should display correct statistics counts', async ({ page }) => {
    await page.getByText('Admin', { exact: true }).click();
    
    const totalUsersText = await page.getByText('Total Users:').locator('xpath=following-sibling::*[1]').textContent();
    const totalUsers = parseInt(totalUsersText || '0');
    
    const userRows = await page.locator('tbody tr').count();
    
    expect(totalUsers).toBeGreaterThanOrEqual(userRows);
  });

  test('should filter users by role', async ({ page }) => {
    await page.getByText('Admin', { exact: true }).click();
    
    const totalRows = await page.locator('tbody tr').count();
    
    await page.getByRole('button', { name: 'Filter by Role' }).click();
    await page.getByRole('menuitem', { name: 'admin' }).click();
    
    const adminRows = await page.locator('tbody tr').count();
    
    expect(adminRows).toBeLessThanOrEqual(totalRows);
    
    const visibleRows = page.locator('tbody tr');
    for (let i = 0; i < await visibleRows.count(); i++) {
      await expect(visibleRows.nth(i).locator('td').nth(2)).toContainText('admin');
    }
  });

  test('should search users by username', async ({ page }) => {
    await page.getByText('Admin', { exact: true }).click();
    
    await page.getByPlaceholder('Search users...').fill('admin');
    
    const visibleRows = await page.locator('tbody tr').count();
    expect(visibleRows).toBeGreaterThan(0);
    
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow.locator('td').first()).toContainText('admin');
  });

  test('should refresh user list', async ({ page }) => {
    await page.getByText('Admin', { exact: true }).click();
    
    const initialCount = await page.locator('tbody tr').count();
    
    await page.getByRole('button', { name: 'Refresh' }).click();
    
    await page.waitForLoadState('networkidle');
    
    const refreshedCount = await page.locator('tbody tr').count();
    expect(refreshedCount).toBe(initialCount);
  });

  test('should handle bulk user operations', async ({ page }) => {
    await page.getByText('Admin', { exact: true }).click();
    
    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('tbody tr').first().locator('input[type="checkbox"]').check();
    
    await page.getByRole('button', { name: 'Bulk Actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Deactivate Selected' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Export Selected' })).toBeVisible();
  });
});

test.describe('Admin Dashboard Charts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Username').fill(ADMIN_USER.username);
    await page.getByPlaceholder('Password').fill(ADMIN_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForSelector('nav');
  });

  test('should display task completion chart on dashboard', async ({ page }) => {
    await page.getByText('Dashboard').click();
    
    await expect(page.getByText('Task Completion Over Time')).toBeVisible();
    await expect(page.locator('.recharts-wrapper')).toBeVisible();
  });

  test('should display priority distribution chart', async ({ page }) => {
    await page.getByText('Dashboard').click();
    
    await expect(page.getByText('Task Priority Distribution')).toBeVisible();
    await expect(page.locator('.recharts-pie')).toBeVisible();
  });

  test('should display project progress chart', async ({ page }) => {
    await page.getByText('Dashboard').click();
    
    await expect(page.getByText('Project Progress')).toBeVisible();
    await expect(page.locator('.recharts-bar')).toBeVisible();
  });

  test('should show summary cards', async ({ page }) => {
    await page.getByText('Dashboard').click();
    
    await expect(page.getByText('Total Tasks')).toBeVisible();
    await expect(page.getByText('Completed')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Overdue')).toBeVisible();
  });

  test('should display recent activity', async ({ page }) => {
    await page.getByText('Dashboard').click();
    
    await expect(page.getByText('Recent Activity')).toBeVisible();
    await expect(page.locator('.activity-item')).toBeVisible();
  });
});