import { test as base } from '@playwright/test';
import { TestUtils } from './test-utils';

type TestFixtures = {
  testUtils: TestUtils;
  authenticatedPage: void;
};

export const test = base.extend<TestFixtures>({
  testUtils: async ({ page }, use) => {
    const utils = new TestUtils(page);
    await use(utils);
  },
  
  authenticatedPage: async ({ page, testUtils }, use) => {
    // Automatically register and login before each test
    await testUtils.registerAndLogin();
    await use();
    // Cleanup if needed
  },
});

export { expect } from '@playwright/test';