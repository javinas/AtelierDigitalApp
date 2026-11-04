import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function toBase64Url(str: string): string {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getDesignerSession() {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 86400 * 7;
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = toBase64Url(
    JSON.stringify({
      sub: '0b57041f-3a3e-40c5-8dc9-74300484a974',
      email: 'katherine.carroll@atelier.com',
      aud: 'authenticated',
      role: 'authenticated',
      exp,
      iat: now,
    })
  );
  const jwt = `${header}.${payload}.signature_atelier_couture`;

  return {
    access_token: jwt,
    token_type: 'bearer',
    expires_in: 86400 * 7,
    expires_at: exp,
    refresh_token: 'mock_refresh_token_atelier',
    user: {
      id: '0b57041f-3a3e-40c5-8dc9-74300484a974',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'katherine.carroll@atelier.com',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { full_name: 'Katherine Carroll' },
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  };
}

test.describe('Módulo 02 — Regresión E2E: Creaciones & Selector de Personas (/creations)', () => {

  test('F01-F08: Apertura, selector reactivo, aislamiento de personas y asignación titular', async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const sessionObj = getDesignerSession();

    await context.addInitScript((sessionData) => {
      window.localStorage.setItem('sb-trgoqqvsprknswobvniu-auth-token', JSON.stringify(sessionData));
    }, sessionObj);

    const interceptedRequests: { url: string; method: string }[] = [];
    const unhandledSupabaseRequests: string[] = [];

    // Interceptación de red estricta
    await page.route('**/*', async (route) => {
      const req = route.request();
      const url = req.url();
      const method = req.method();

      if (url.includes('trgoqqvsprknswobvniu.supabase.co')) {
        interceptedRequests.push({ url, method });

        // 1. Auth user
        if (url.includes('/auth/v1/user')) {
          await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sessionObj.user) });
          return;
        }

        // 2. Profiles
        if (url.includes('/rest/v1/profiles')) {
          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' },
            body: JSON.stringify({ id: sessionObj.user.id, email: sessionObj.user.email, full_name: 'Katherine Carroll', role: 'designer' })
          });
          return;
        }

        // 3. Clients REST
        if (url.includes('/rest/v1/clients')) {
          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Content-Range': '0-1/2' },
            body: JSON.stringify([
              { id: 'cli_multi', full_name: 'Isabella de la Torre', email: 'isabella@atelier.com', city: 'Madrid' },
              { id: 'cli_solo', full_name: 'Clara Domínguez', email: 'clara@atelier.com', city: 'Sevilla' }
            ])
          });
          return;
        }

        // 4. Persons REST (asociadas por client_id)
        if (url.includes('/rest/v1/persons')) {
          if (url.includes('cli_multi')) {
            await route.fulfill({
              status: 200,
              headers: { 'Content-Type': 'application/json', 'Content-Range': '0-1/2' },
              body: JSON.stringify([
                { id: 'per_sofia', client_id: 'cli_multi', full_name: 'Sofía de la Torre', demographic_category: 'girl' },
                { id: 'per_mateo', client_id: 'cli_multi', full_name: 'Mateo de la Torre', demographic_category: 'boy' }
              ])
            });
            return;
          } else {
            await route.fulfill({
              status: 200,
              headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/0' },
              body: JSON.stringify([])
            });
            return;
          }
        }

        // 5. Creaciones previas
        if (url.includes('/rest/v1/creations')) {
          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/0' },
            body: JSON.stringify([])
          });
          return;
        }

        // 6. Otras entidades del dossier
        if (url.includes('/rest/v1/measurement_sessions') || url.includes('/rest/v1/pattern_executions')) {
          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/0' },
            body: JSON.stringify([])
          });
          return;
        }

        unhandledSupabaseRequests.push(`${method} ${url}`);
        await route.abort();
        return;
      }

      await route.continue();
    });

    // 1. Navegar a /creations
    await page.goto('http://localhost:8081/creations', { waitUntil: 'networkidle', timeout: 30000 });

    // 2. Abrir modal "+ Nueva Creación"
    const newBtn = page.locator('text=+ Nueva Creación').first();
    await expect(newBtn).toBeVisible({ timeout: 10000 });
    await newBtn.click();

    // 3. Verificar modal y campo ¿Para quién es la prenda?
    const modalTitle = page.locator('text=Nueva Creación de Alta Costura').first();
    await expect(modalTitle).toBeVisible({ timeout: 10000 });
    const personSectionLabel = page.locator('text=¿Para quién es la prenda? (Opcional)').first();
    await expect(personSectionLabel).toBeVisible({ timeout: 5000 });

    // 4. Seleccionar clienta con personas (Isabella de la Torre)
    const cliMultiChip = page.locator('text=Isabella de la Torre').first();
    await cliMultiChip.click();
    await page.waitForTimeout(800);

    // 5. Verificar que aparecen sus personas exclusivas
    const sofiaChip = page.locator('text=/Sofía de la Torre/').first();
    const mateoChip = page.locator('text=/Mateo de la Torre/').first();
    await expect(sofiaChip).toBeVisible({ timeout: 5000 });
    await expect(mateoChip).toBeVisible({ timeout: 5000 });

    // 6. Seleccionar a Sofía
    await sofiaChip.click();
    await page.waitForTimeout(400);

    // 7. Cambiar a clienta sin personas (Clara Domínguez) y verificar limpieza reactiva
    const cliSoloChip = page.locator('text=Clara Domínguez').first();
    await cliSoloChip.click();
    await page.waitForTimeout(800);

    // Los chips de la clienta anterior deben desaparecer
    const sofiaCount = await page.locator('text=/Sofía de la Torre/').count();
    expect(sofiaCount).toBe(0);

    // Mensaje de clienta sin personas adicionales
    const emptyHint = page.locator('text=/Sin personas adicionales registradas/').first();
    await expect(emptyHint).toBeVisible({ timeout: 5000 });

    // 8. Volver a Isabella y seleccionar "Para la Clienta Titular"
    await cliMultiChip.click();
    await page.waitForTimeout(800);
    const titularChip = page.locator('text=Para la Clienta Titular').first();
    await expect(titularChip).toBeVisible({ timeout: 5000 });
    await titularChip.click();
    await page.waitForTimeout(400);

    // Evidencia visual
    if (!fs.existsSync('scratch')) fs.mkdirSync('scratch', { recursive: true });
    await page.screenshot({ path: 'scratch/e2e_m02_creations_person_selector.png' });

    // Auditoría de aislamiento: Cero solicitudes no manejadas hacia Supabase
    expect(unhandledSupabaseRequests).toHaveLength(0);
  });

});
