import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 30 * 1000,
  retries: 0,
  reporter: 'html',
  use: {
    trace: 'retain-on-failure',
    screenshot: { mode: 'on', fullPage: true },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        headless: false,
      },
    },
  ],
});
