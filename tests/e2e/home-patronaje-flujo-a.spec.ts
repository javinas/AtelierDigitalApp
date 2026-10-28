import { test, expect } from '@playwright/test';

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getDesignerSession() {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 86400 * 7;
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = toBase64Url(
    JSON.stringify({
      sub: '262bf83b-c916-4712-bb8a-cea98a1c359b',
      email: 'prueba1@bykatherinecarroll.com',
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
      id: '262bf83b-c916-4712-bb8a-cea98a1c359b',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'prueba1@bykatherinecarroll.com',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { full_name: 'Katherine Carroll' },
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  };
}

test.describe('Navegación Home -> Patronaje (Flujo A)', () => {
  test.beforeEach(async ({ page, context }) => {
    const sessionObj = getDesignerSession();

    await context.addInitScript((sessionData) => {
      window.localStorage.setItem('sb-trgoqqvsprknswobvniu-auth-token', JSON.stringify(sessionData));
    }, sessionObj);

    await page.route('**/auth/v1/user*', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionObj.user),
      });
    });

    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionObj.user.id,
          email: sessionObj.user.email,
          full_name: 'Katherine Carroll',
          role: 'designer',
        }),
      });
    });
  });

  test('La opción "03 PATRONAJE" del Home lleva a Flujo A (Gestión de Medidas)', async ({ page }) => {
    await page.goto('/(designer)', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Localizar botón ABRIR en la tarjeta de PATRONAJE
    const patronajeCard = page.locator('text=PATRONAJE').first();
    await expect(patronajeCard).toBeVisible({ timeout: 10000 });

    const openBtn = page.getByLabel('Abrir Flujo A de Patronaje').last();
    await expect(openBtn).toBeVisible({ timeout: 10000 });
    await openBtn.click();
    await page.waitForTimeout(1500);

    // Verificar que la URL contiene workflow=measurements
    expect(page.url()).toContain('workflow=measurements');

    // Verificar que aparece el identificador de Flujo A (Gestión de Medidas / Maniquí Anatómico)
    const flujoABadge = page.locator('text=/FLUJO A|GESTIÓN DE MEDIDAS/i').first();
    await expect(flujoABadge).toBeVisible({ timeout: 10000 });

    // Verificar que NO está en Flujo D
    const flujoDText = page.locator('text=FLUJO D · PATRÓN LIBRE');
    await expect(flujoDText).toHaveCount(0);
  });
});
