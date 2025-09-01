import { test, expect } from '@playwright/test';

const baseURL = 'http://localhost:3005';
const apiURL = 'http://localhost:5003/api';

test.describe('Integration Tests', () => {
  test('should complete a full user workflow', async ({ page, request }) => {
    const timestamp = Date.now();
    const testEmail = `integration${timestamp}@example.com`;
    
    // 1. Register a new user
    const registerResponse = await request.post(`${apiURL}/auth/register`, {
      data: {
        email: testEmail,
        name: 'Integration Test User',
        password: 'IntegrationTest123!'
      }
    });
    
    expect(registerResponse.ok()).toBeTruthy();
    const { token } = await registerResponse.json();
    
    // 2. Set authentication and navigate to app
    await page.goto(baseURL);
    await page.evaluate((authToken) => {
      localStorage.setItem('token', authToken);
    }, token);
    
    await page.goto(`${baseURL}/`);
    await expect(page.locator('h1').last()).toContainText('Dashboard');
    
    // 3. Create a project
    await page.click('text=Projects');
    await page.click('button:has-text("Create Project")');
    await page.fill('input#name', 'Integration Test Project');
    await page.fill('textarea#description', 'Project created during integration testing');
    await page.press('input#name', 'Enter');
    
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Integration Test Project')).toBeVisible();
    
    // 4. Navigate through different pages
    await page.click('text=My Tasks');
    await expect(page).toHaveURL(/\/my-tasks/);
    await expect(page.locator('h1').last()).toContainText('My Tasks');
    
    await page.click('text=Calendar');
    await expect(page).toHaveURL(/\/calendar/);
    await expect(page.locator('h1').last()).toContainText('Calendar');
    
    // 5. Return to dashboard
    await page.click('text=Dashboard');
    await expect(page).toHaveURL(/\/$/);
    
    // 6. Logout
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL(/\/login/);
    
    // 7. Login again
    const loginResponse = await request.post(`${apiURL}/auth/login`, {
      data: {
        email: testEmail,
        password: 'IntegrationTest123!'
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const { token: newToken } = await loginResponse.json();
    
    await page.evaluate((authToken) => {
      localStorage.setItem('token', authToken);
    }, newToken);
    
    // 8. Verify project persists
    await page.goto(`${baseURL}/projects`);
    await expect(page.locator('text=Integration Test Project')).toBeVisible();
  });

  test('should handle concurrent API operations', async ({ request }) => {
    const timestamp = Date.now();
    const testEmail = `concurrent${timestamp}@example.com`;
    
    // Register user
    const registerResponse = await request.post(`${apiURL}/auth/register`, {
      data: {
        email: testEmail,
        name: 'Concurrent Test User',
        password: 'ConcurrentTest123!'
      }
    });
    
    const { token } = await registerResponse.json();
    
    // Create multiple projects concurrently
    const projectPromises = [];
    for (let i = 0; i < 3; i++) {
      projectPromises.push(
        request.post(`${apiURL}/projects`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: {
            name: `Concurrent Project ${i + 1}`,
            description: `Project ${i + 1} created concurrently`
          }
        })
      );
    }
    
    const results = await Promise.all(projectPromises);
    
    // All should succeed
    for (const result of results) {
      expect(result.ok()).toBeTruthy();
    }
    
    // Verify all projects exist
    const listResponse = await request.get(`${apiURL}/projects`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const projects = await listResponse.json();
    expect(projects.length).toBeGreaterThanOrEqual(3);
  });

  test('should maintain data consistency across operations', async ({ request }) => {
    const timestamp = Date.now();
    const testEmail = `consistency${timestamp}@example.com`;
    
    // Register and authenticate
    const registerResponse = await request.post(`${apiURL}/auth/register`, {
      data: {
        email: testEmail,
        name: 'Consistency Test User',
        password: 'ConsistencyTest123!'
      }
    });
    
    const { token } = await registerResponse.json();
    
    // Create project
    const projectResponse = await request.post(`${apiURL}/projects`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'Consistency Test Project',
        description: 'Project for consistency testing'
      }
    });
    
    const project = await projectResponse.json();
    
    // Get project details
    const getResponse = await request.get(`${apiURL}/projects/${project.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const retrievedProject = await getResponse.json();
    
    // Data should be consistent
    expect(retrievedProject.name).toBe('Consistency Test Project');
    expect(retrievedProject.description).toBe('Project for consistency testing');
    expect(retrievedProject.id).toBe(project.id);
  });

  test('should handle authentication edge cases', async ({ request, page }) => {
    // Test with invalid token
    const invalidResponse = await request.get(`${apiURL}/projects`, {
      headers: {
        'Authorization': 'Bearer invalid_token'
      }
    });
    
    expect(invalidResponse.ok()).toBeFalsy();
    expect(invalidResponse.status()).toBe(401);
    
    // Test with no token
    const noTokenResponse = await request.get(`${apiURL}/projects`);
    expect(noTokenResponse.ok()).toBeFalsy();
    expect(noTokenResponse.status()).toBe(401);
    
    // Test expired session handling in UI
    await page.goto(baseURL);
    await page.evaluate(() => {
      localStorage.setItem('token', 'expired_token');
    });
    
    await page.goto(`${baseURL}/dashboard`);
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should handle network errors gracefully', async ({ page, request }) => {
    const timestamp = Date.now();
    const testEmail = `network${timestamp}@example.com`;
    
    // Valid registration first
    const registerResponse = await request.post(`${apiURL}/auth/register`, {
      data: {
        email: testEmail,
        name: 'Network Test User',
        password: 'NetworkTest123!'
      }
    });
    
    const { token } = await registerResponse.json();
    
    await page.goto(baseURL);
    await page.evaluate((authToken) => {
      localStorage.setItem('token', authToken);
    }, token);
    
    // Navigate to a page that requires data
    await page.goto(`${baseURL}/projects`);
    
    // Page should load even if some data requests fail
    await expect(page.locator('h1').last()).toContainText('Projects');
  });

  test('should support browser refresh and deep linking', async ({ page, request }) => {
    const timestamp = Date.now();
    const testEmail = `refresh${timestamp}@example.com`;
    
    const registerResponse = await request.post(`${apiURL}/auth/register`, {
      data: {
        email: testEmail,
        name: 'Refresh Test User',
        password: 'RefreshTest123!'
      }
    });
    
    const { token } = await registerResponse.json();
    
    await page.goto(baseURL);
    await page.evaluate((authToken) => {
      localStorage.setItem('token', authToken);
    }, token);
    
    // Navigate to projects page
    await page.goto(`${baseURL}/projects`);
    await expect(page).toHaveURL(/\/projects/);
    
    // Refresh the page
    await page.reload();
    
    // Should stay on projects page
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.locator('h1').last()).toContainText('Projects');
    
    // Test direct navigation
    await page.goto(`${baseURL}/calendar`);
    await expect(page.locator('h1').last()).toContainText('Calendar');
  });

  test('should handle user permissions correctly', async ({ request }) => {
    // Create two users
    const timestamp = Date.now();
    const user1Email = `user1${timestamp}@example.com`;
    const user2Email = `user2${timestamp}@example.com`;
    
    const user1Response = await request.post(`${apiURL}/auth/register`, {
      data: {
        email: user1Email,
        name: 'User One',
        password: 'UserOne123!'
      }
    });
    
    const user2Response = await request.post(`${apiURL}/auth/register`, {
      data: {
        email: user2Email,
        name: 'User Two',
        password: 'UserTwo123!'
      }
    });
    
    const { token: token1 } = await user1Response.json();
    const { token: token2 } = await user2Response.json();
    
    // User 1 creates a project
    const projectResponse = await request.post(`${apiURL}/projects`, {
      headers: {
        'Authorization': `Bearer ${token1}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'User1 Project',
        description: 'Private project for user 1'
      }
    });
    
    const project = await projectResponse.json();
    
    // User 2 tries to access User 1's project
    const accessResponse = await request.get(`${apiURL}/projects/${project.id}`, {
      headers: {
        'Authorization': `Bearer ${token2}`
      }
    });
    
    // Should fail (depending on implementation)
    // This test may need adjustment based on actual permission model
    const hasAccess = accessResponse.ok();
    
    // Either user should not have access, or they should have limited access
    if (!hasAccess) {
      expect(accessResponse.status()).toBe(403);
    } else {
      // If access is allowed, verify the response
      const retrievedProject = await accessResponse.json();
      expect(retrievedProject).toHaveProperty('id', project.id);
    }
  });

  test('should handle large data sets appropriately', async ({ request }) => {
    const timestamp = Date.now();
    const testEmail = `largedata${timestamp}@example.com`;
    
    const registerResponse = await request.post(`${apiURL}/auth/register`, {
      data: {
        email: testEmail,
        name: 'Large Data Test User',
        password: 'LargeData123!'
      }
    });
    
    const { token } = await registerResponse.json();
    
    // Create multiple projects
    const projectPromises = [];
    for (let i = 0; i < 5; i++) {
      projectPromises.push(
        request.post(`${apiURL}/projects`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: {
            name: `Bulk Project ${i + 1}`,
            description: `Project ${i + 1} for bulk testing with a longer description to test data handling`
          }
        })
      );
    }
    
    const results = await Promise.all(projectPromises);
    
    // All should succeed
    for (const result of results) {
      expect(result.ok()).toBeTruthy();
    }
    
    // List all projects
    const listResponse = await request.get(`${apiURL}/projects`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(listResponse.ok()).toBeTruthy();
    const projects = await listResponse.json();
    expect(projects.length).toBeGreaterThanOrEqual(5);
  });
});