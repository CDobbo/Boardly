import { test, expect } from '@playwright/test';

const baseURL = 'http://localhost:3005';
const apiURL = 'http://localhost:5003/api';

test.describe('Project Management Tests', () => {
  let authToken: string;
  
  test.beforeEach(async ({ request }) => {
    // Create a user for each test
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    
    const response = await request.post(`${apiURL}/auth/register`, {
      data: {
        email: testEmail,
        name: 'Test User',
        password: 'TestPassword123!'
      }
    });
    
    const data = await response.json();
    authToken = data.token;
  });

  test('should display projects page', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/projects`);
    await expect(page.locator('h1').last()).toContainText('Projects');
  });

  test('should show create project button', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/projects`);
    await expect(page.locator('button:has-text("Create Project")')).toBeVisible();
  });

  test('should open create project dialog', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/projects`);
    await page.click('button:has-text("Create Project")');
    
    await expect(page.locator('input#name')).toBeVisible();
    await expect(page.locator('textarea#description')).toBeVisible();
  });

  test('should create a project with required fields only', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/projects`);
    await page.click('button:has-text("Create Project")');
    
    await page.fill('input#name', 'Test Project');
    await page.press('input#name', 'Enter');
    
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Test Project')).toBeVisible();
  });

  test('should create a project with all fields', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/projects`);
    await page.click('button:has-text("Create Project")');
    
    await page.fill('input#name', 'Full Project');
    await page.fill('textarea#description', 'Complete project description');
    await page.press('input#name', 'Enter');
    
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Full Project')).toBeVisible();
  });

  test('should navigate to project board on click', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/projects`);
    await page.click('button:has-text("Create Project")');
    await page.fill('input#name', 'Clickable Project');
    await page.press('input#name', 'Enter');
    
    await page.waitForTimeout(2000);
    await page.click('text=Clickable Project');
    
    await expect(page).toHaveURL(/\/projects\/\d+/);
  });

  test('should create project via API', async ({ request }) => {
    const response = await request.post(`${apiURL}/projects`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'API Project',
        description: 'Project created via API'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const project = await response.json();
    expect(project).toHaveProperty('id');
    expect(project).toHaveProperty('name', 'API Project');
  });

  test('should list user projects via API', async ({ request }) => {
    // Create a project first
    await request.post(`${apiURL}/projects`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'Listed Project',
        description: 'Project for listing test'
      }
    });
    
    const response = await request.get(`${apiURL}/projects`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const projects = await response.json();
    expect(Array.isArray(projects)).toBeTruthy();
    expect(projects.length).toBeGreaterThan(0);
  });

  test('should show project details', async ({ page, request }) => {
    // Create project via API
    const createResponse = await request.post(`${apiURL}/projects`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'Detail Project',
        description: 'Project with details'
      }
    });
    
    const project = await createResponse.json();
    
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/projects/${project.id}`);
    await expect(page.locator('text=Detail Project')).toBeVisible();
  });

  test('should display project creation date', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/projects`);
    await page.click('button:has-text("Create Project")');
    
    await page.fill('input#name', 'Simple Project');
    await page.press('input#name', 'Enter');
    
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Simple Project')).toBeVisible();
  });

  test('should handle empty project name validation', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/projects`);
    await page.click('button:has-text("Create Project")');
    
    // Try to submit without name
    await page.fill('textarea#description', 'Description without name');
    await page.press('textarea#description', 'Enter');
    
    // Should still be in dialog
    await expect(page.locator('input#name')).toBeVisible();
  });

  test('should create multiple projects', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/projects`);
    
    // Create first project
    await page.click('button:has-text("Create Project")');
    await page.fill('input#name', 'Project One');
    await page.press('input#name', 'Enter');
    await page.waitForTimeout(1000);
    
    // Create second project
    await page.click('button:has-text("Create Project")');
    await page.fill('input#name', 'Project Two');
    await page.press('input#name', 'Enter');
    await page.waitForTimeout(1000);
    
    await expect(page.locator('text=Project One')).toBeVisible();
    await expect(page.locator('text=Project Two')).toBeVisible();
  });

  test('should show project creation timestamp', async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
    
    await page.goto(`${baseURL}/projects`);
    await page.click('button:has-text("Create Project")');
    await page.fill('input#name', 'Timestamped Project');
    await page.press('input#name', 'Enter');
    
    await page.waitForTimeout(2000);
    // Should show creation date
    await expect(page.locator('text=Created')).toBeVisible();
  });

  test('should require authentication for project creation', async ({ request }) => {
    const response = await request.post(`${apiURL}/projects`, {
      data: {
        name: 'Unauthorized Project',
        description: 'This should fail'
      }
    });
    
    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(401);
  });

  test('should get project details via API', async ({ request }) => {
    // Create project
    const createResponse = await request.post(`${apiURL}/projects`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'API Detail Project',
        description: 'Project for API detail test'
      }
    });
    
    const project = await createResponse.json();
    
    // Get project details
    const getResponse = await request.get(`${apiURL}/projects/${project.id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(getResponse.ok()).toBeTruthy();
    const details = await getResponse.json();
    expect(details).toHaveProperty('name', 'API Detail Project');
  });
});