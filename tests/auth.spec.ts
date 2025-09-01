import { test, expect, Page } from '@playwright/test';

const TEST_USER = {
  username: 'testuser',
  email: 'testuser@example.com',
  password: 'TestPassword123!',
  fullName: 'Test User'
};

const ADMIN_USER = {
  username: 'admin',
  password: 'admin123'
};

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page by default', async ({ page }) => {
    await expect(page).toHaveTitle(/Task Manager/);
    await expect(page.locator('h2')).toContainText('Login');
    await expect(page.getByPlaceholder('Username')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('should navigate between login and register pages', async ({ page }) => {
    await page.getByText("Don't have an account? Register").click();
    await expect(page.locator('h2')).toContainText('Register');
    await expect(page.getByPlaceholder('Full Name')).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    
    await page.getByText('Already have an account? Login').click();
    await expect(page.locator('h2')).toContainText('Login');
  });

  test('should register a new user', async ({ page }) => {
    await page.getByText("Don't have an account? Register").click();
    
    const timestamp = Date.now();
    const uniqueUser = {
      ...TEST_USER,
      username: `user${timestamp}`,
      email: `user${timestamp}@example.com`
    };
    
    await page.getByPlaceholder('Username').fill(uniqueUser.username);
    await page.getByPlaceholder('Full Name').fill(uniqueUser.fullName);
    await page.getByPlaceholder('Email').fill(uniqueUser.email);
    await page.getByPlaceholder('Password').fill(uniqueUser.password);
    
    await page.getByRole('button', { name: 'Register' }).click();
    
    await expect(page.locator('h2')).toContainText('Login');
    await expect(page.getByText('Registration successful')).toBeVisible();
  });

  test('should show error for duplicate username', async ({ page }) => {
    await page.getByText("Don't have an account? Register").click();
    
    await page.getByPlaceholder('Username').fill(ADMIN_USER.username);
    await page.getByPlaceholder('Full Name').fill('Another Admin');
    await page.getByPlaceholder('Email').fill('admin2@example.com');
    await page.getByPlaceholder('Password').fill('Password123!');
    
    await page.getByRole('button', { name: 'Register' }).click();
    
    await expect(page.getByText(/Username already exists/i)).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.getByPlaceholder('Username').fill(ADMIN_USER.username);
    await page.getByPlaceholder('Password').fill(ADMIN_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.getByText('Dashboard')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByPlaceholder('Username').fill('invaliduser');
    await page.getByPlaceholder('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Login' }).click();
    
    await expect(page.getByText(/Invalid username or password/i)).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await page.getByPlaceholder('Username').fill(ADMIN_USER.username);
    await page.getByPlaceholder('Password').fill(ADMIN_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    
    await expect(page.locator('nav')).toBeVisible();
    
    await page.getByRole('button', { name: 'Logout' }).click();
    
    await expect(page.locator('h2')).toContainText('Login');
    await expect(page.getByPlaceholder('Username')).toBeVisible();
  });

  test('should persist login on page refresh', async ({ page }) => {
    await page.getByPlaceholder('Username').fill(ADMIN_USER.username);
    await page.getByPlaceholder('Password').fill(ADMIN_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    
    await expect(page.locator('nav')).toBeVisible();
    
    await page.reload();
    
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h2')).toContainText('Login');
  });
});

test.describe('User Roles', () => {
  test('admin should see admin menu', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Username').fill(ADMIN_USER.username);
    await page.getByPlaceholder('Password').fill(ADMIN_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    
    await expect(page.getByText('Admin', { exact: true })).toBeVisible();
  });

  test('regular user should not see admin menu', async ({ page }) => {
    await page.goto('/');
    
    await page.getByText("Don't have an account? Register").click();
    
    const timestamp = Date.now();
    const regularUser = {
      username: `regular${timestamp}`,
      fullName: 'Regular User',
      email: `regular${timestamp}@example.com`,
      password: 'Password123!'
    };
    
    await page.getByPlaceholder('Username').fill(regularUser.username);
    await page.getByPlaceholder('Full Name').fill(regularUser.fullName);
    await page.getByPlaceholder('Email').fill(regularUser.email);
    await page.getByPlaceholder('Password').fill(regularUser.password);
    await page.getByRole('button', { name: 'Register' }).click();
    
    await page.getByPlaceholder('Username').fill(regularUser.username);
    await page.getByPlaceholder('Password').fill(regularUser.password);
    await page.getByRole('button', { name: 'Login' }).click();
    
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.getByText('Admin', { exact: true })).not.toBeVisible();
  });
});