import { Page } from '@playwright/test';

export class TestUtils {
  constructor(private page: Page) {}

  async registerAndLogin(username?: string) {
    const timestamp = Date.now();
    const email = username || `test${timestamp}@example.com`;
    const password = 'TestPassword123!';
    
    await this.page.goto('/register');
    await this.page.fill('input[placeholder="John Doe"]', 'Test User');
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL(/\/$/);
    
    return { email, password };
  }

  async login(email: string, password: string) {
    await this.page.goto('/login');
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL(/\/$/);
  }

  async logout() {
    await this.page.click('button:has-text("Logout")');
    await this.page.waitForURL(/\/login/);
  }

  async createTask(title: string, description: string, priority?: string) {
    await this.page.click('button:has-text("Create Task")');
    await this.page.fill('input[placeholder="Enter task title"]', title);
    await this.page.fill('textarea[placeholder="Enter task description"]', description);
    
    if (priority) {
      await this.page.selectOption('select:has-text("Priority")', priority);
    }
    
    await this.page.click('button:has-text("Create")');
    await this.page.waitForSelector(`text=${title}`);
  }

  async createProject(name: string, description: string) {
    await this.page.click('button:has-text("New Project")');
    await this.page.fill('input[placeholder="Project name"]', name);
    await this.page.fill('textarea[placeholder="Project description"]', description);
    await this.page.click('button:has-text("Create")');
    await this.page.waitForSelector(`text=${name}`);
  }

  async createEvent(title: string, description: string, startTime?: string, endTime?: string) {
    const newEventButton = this.page.locator('button:has-text("New Event"), button:has-text("Add Event")');
    
    if (await newEventButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await newEventButton.click();
    } else {
      const today = new Date().getDate().toString();
      await this.page.locator(`.rbc-date-cell:has-text("${today}")`).first().click();
    }
    
    await this.page.fill('input[placeholder*="title"], input[placeholder*="Title"]', title);
    await this.page.fill('textarea[placeholder*="description"], textarea[placeholder*="Description"]', description);
    
    if (startTime) {
      const startTimeInput = this.page.locator('input[type="time"]').first();
      if (await startTimeInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await startTimeInput.fill(startTime);
      }
    }
    
    if (endTime) {
      const endTimeInput = this.page.locator('input[type="time"]').nth(1);
      if (await endTimeInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await endTimeInput.fill(endTime);
      }
    }
    
    await this.page.click('button:has-text("Save"), button:has-text("Create")');
    await this.page.waitForSelector(`text=${title}`);
  }

  async deleteItem(itemText: string) {
    const item = this.page.locator(`text=${itemText}`).locator('..');
    await item.hover();
    await item.locator('button[aria-label="Delete"]').click();
    
    // Handle confirmation dialog if present
    const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Delete")').last();
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }
    
    await this.page.waitForSelector(`text=${itemText}`, { state: 'hidden' });
  }

  async dragAndDrop(sourceText: string, targetSelector: string) {
    const source = this.page.locator(`text=${sourceText}`);
    const target = this.page.locator(targetSelector).first();
    
    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();
    
    if (sourceBox && targetBox) {
      await this.page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 100, { steps: 5 });
      await this.page.mouse.up();
    }
  }

  async waitForNotification(text: string) {
    const notification = this.page.locator(`text=${text}`);
    await notification.waitFor({ state: 'visible', timeout: 5000 });
    await notification.waitFor({ state: 'hidden', timeout: 10000 });
  }

  async checkAccessibility() {
    // Basic accessibility checks
    const buttons = await this.page.locator('button').all();
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      if (!ariaLabel && !text) {
        console.warn('Button without aria-label or text content found');
      }
    }
    
    const inputs = await this.page.locator('input').all();
    for (const input of inputs) {
      const label = await input.getAttribute('aria-label');
      const id = await input.getAttribute('id');
      if (!label && id) {
        const labelElement = this.page.locator(`label[for="${id}"]`);
        if (!(await labelElement.isVisible().catch(() => false))) {
          console.warn('Input without associated label found');
        }
      }
    }
  }
}