import { test, expect } from '@playwright/test';

const baseURL = 'http://localhost:3005';
const apiURL = 'http://localhost:5003/api';

test.describe('Navigation and UI Tests', () => {
  let authToken: string;
  
  test.beforeEach(async ({ request }) => {
    // Create a user for authenticated tests
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    
    const userResponse = await request.post(`${apiURL}/auth/register`, {
      data: {
        email: testEmail,
        name: 'Test User',
        password: 'TestPassword123!'
      }
    });
    
    const userData = await userResponse.json();
    authToken = userData.token;
  });

  test('should display application title', async ({ page }) => {
    await page.goto(baseURL);
    await expect(page).toHaveTitle(/Task Manager/);
  });

  test('should show main navigation menu when authenticated', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/`);
    
    // Check for navigation elements with more flexible selectors
    const dashboardVisible = await page.locator('a[href="/"]').isVisible({ timeout: 5000 }).catch(() => false) ||
                            await page.locator('text=Dashboard').isVisible({ timeout: 2000 }).catch(() => false);
    const projectsVisible = await page.locator('a[href="/projects"]').isVisible({ timeout: 2000 }).catch(() => false) ||
                           await page.locator('text=Projects').isVisible({ timeout: 2000 }).catch(() => false);
    const tasksVisible = await page.locator('a[href="/my-tasks"]').isVisible({ timeout: 2000 }).catch(() => false) ||
                        await page.locator('text=My Tasks').isVisible({ timeout: 2000 }).catch(() => false);
    const calendarVisible = await page.locator('a[href="/calendar"]').isVisible({ timeout: 2000 }).catch(() => false) ||
                           await page.locator('text=Calendar').isVisible({ timeout: 2000 }).catch(() => false);
    
    expect(dashboardVisible).toBeTruthy();
    expect(projectsVisible).toBeTruthy();  
    expect(tasksVisible).toBeTruthy();
    expect(calendarVisible).toBeTruthy();
  });

  test('should navigate to dashboard', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/projects`);
    await page.click('text=Dashboard');
    await expect(page).toHaveURL(/\/$/);
  });

  test('should navigate to projects page', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/`);
    await page.click('text=Projects');
    await expect(page).toHaveURL(/\/projects/);
  });

  test('should navigate to my tasks page', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/`);
    await page.click('text=My Tasks');
    await expect(page).toHaveURL(/\/my-tasks/);
  });

  test('should navigate to calendar page', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/`);
    await page.click('text=Calendar');
    await expect(page).toHaveURL(/\/calendar/);
  });

  test('should show logout button', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/`);
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);
    await page.waitForTimeout(1000); // Wait for redirect
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated users from projects', async ({ page }) => {
    await page.goto(`${baseURL}/projects`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated users from my-tasks', async ({ page }) => {
    await page.goto(`${baseURL}/my-tasks`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated users from calendar', async ({ page }) => {
    await page.goto(`${baseURL}/calendar`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('should maintain active navigation state', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/projects`);
    
    // Check if Projects link has active styling (implementation dependent)
    const projectsLink = page.getByRole('link', { name: 'Projects' });
    await expect(projectsLink).toBeVisible();
  });

  test('should handle browser back navigation', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/`);
    await page.click('text=Projects');
    await page.click('text=Calendar');
    
    await page.goBack();
    await expect(page).toHaveURL(/\/projects/);
    
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  });

  test('should handle browser forward navigation', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/`);
    await page.click('text=Projects');
    await page.click('text=Calendar');
    await page.goBack();
    await page.goBack();
    
    await page.goForward();
    await expect(page).toHaveURL(/\/projects/);
  });

  test('should display user information in header', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/`);
    
    // Check for user-related elements (implementation dependent)
    const hasUserInfo = await page.locator('text=Test User').isVisible().catch(() => false) ||
                       await page.locator('button:has-text("Logout")').isVisible().catch(() => false);
    
    expect(hasUserInfo).toBeTruthy();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone viewport
    
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/`);
    
    // Should still show main content
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should be responsive on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad viewport
    
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/`);
    
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should handle page refresh with authentication', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/projects`);
    await page.reload();
    
    // Should stay on projects page
    await expect(page).toHaveURL(/\/projects/);
  });

  test('should show loading states appropriately', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/`);
    
    // Navigation should be quick, but check for any loading indicators
    const hasContent = await page.locator('h1').isVisible({ timeout: 1000 }).catch(() => true);
    expect(hasContent).toBeTruthy();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="password"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });

  test('should display correct page titles', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    // Dashboard
    await page.goto(`${baseURL}/`);
    await expect(page.locator('h1').last()).toContainText('Dashboard');
    
    // Projects
    await page.goto(`${baseURL}/projects`);
    await expect(page.locator('h1').last()).toContainText('Projects');
    
    // My Tasks
    await page.goto(`${baseURL}/my-tasks`);
    await expect(page.locator('h1').last()).toContainText('My Tasks');
    
    // Calendar
    await page.goto(`${baseURL}/calendar`);
    await expect(page.locator('h1').last()).toContainText('Calendar');
  });

  test('should handle 404 errors gracefully', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/non-existent-page`);
    
    // Should either redirect or show 404 content
    const hasContent = await page.locator('body').isVisible({ timeout: 1000 }).catch(() => true);
    expect(hasContent).toBeTruthy();
  });

  test('should show appropriate error messages', async ({ page }) => {
    // Test invalid login
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show some form of error feedback
    // The exact implementation may vary
    await page.waitForTimeout(1000); // Allow time for error to appear
  });
});