import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración oficial de pruebas E2E con Playwright para Atelier Digital
 * By Katherine Carroll
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Timeout por prueba individual */
  timeout: 45 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  /* Ejecución en serie para no saturar Metro / Expo dev server */
  fullyParallel: false,
  workers: 1,
  /* Reporter editorial */
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ],
  use: {
    /* URL base de la aplicación Expo en desarrollo local */
    baseURL: 'http://localhost:8081',
    /* Trazas y capturas en caso de inspección */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'msedge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },
  ],
});
