import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Helper para generar sesión de Diseñadora con token no expirado
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

test.describe('Módulo 02 · Fase 2 — Creaciones de Alta Costura (/creations)', () => {

  test.beforeEach(async ({ page, context }) => {
    const sessionObj = getDesignerSession();

    // Inyectar sesión en localStorage antes de que Expo Router monte el árbol
    await context.addInitScript((sessionData) => {
      window.localStorage.setItem('sb-trgoqqvsprknswobvniu-auth-token', JSON.stringify(sessionData));
    }, sessionObj);

    // Interceptar la consulta de auth para evitar deslogueo en tests
    await page.route('**/auth/v1/user*', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionObj.user),
      });
    });

    // Interceptar la consulta de profiles de Supabase para responder inmediatamente con rol de diseñadora
    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Range': '0-0/1',
        },
        body: JSON.stringify({
          id: sessionObj.user.id,
          email: sessionObj.user.email,
          full_name: 'Katherine Carroll',
          role: 'designer',
          created_at: '2026-10-01T00:00:00Z',
          updated_at: '2026-10-01T00:00:00Z',
        }),
      });
    });

    const creationMockItem = {
      id: '141693a0-01e8-498a-bbb3-1c4f98036543',
      name: 'Chaqueta Sastre de Prueba C15',
      status: 'approved',
      creation_type: 'bespoke',
      occasion: 'Gala de Ópera / Evento Formal',
      description: 'Chaqueta sastre estructurada de alta costura con solapa de pico y manga dos piezas.',
      garment_type: 'jacket',
      client_id: '2284e882-3b61-4061-be13-553ea11f0b48',
      session_id: 'f94116ce-9e0c-4ec9-86e0-81135f606830',
      active_pattern_execution_id: 'ca808ce9-45ca-47d2-ab1b-80d621a68c40',
      patterns_count: 1,
      total_executions_count: 16,
      created_at: '2026-10-23T10:00:00Z',
      updated_at: '2026-10-23T18:00:00Z',
      client: {
        id: '2284e882-3b61-4061-be13-553ea11f0b48',
        full_name: 'Laura Martínez',
        email: 'laura.martinez@atelier.com',
        city: 'Madrid',
        phone: '+34 600 123 456',
      },
      session: {
        id: 'f94116ce-9e0c-4ec9-86e0-81135f606830',
        version_number: 1,
        status: 'completed',
        session_date: '2026-10-20T10:00:00Z',
        unit_system: 'cm',
      },
      active_pattern: {
        id: 'ca808ce9-45ca-47d2-ab1b-80d621a68c40',
        version_label: '1.1',
        status: 'approved_by_designer',
        garment_type: 'jacket',
        created_at: '2026-10-23T18:00:00Z',
      },
      pattern_executions: [
        {
          id: 'ca808ce9-45ca-47d2-ab1b-80d621a68c40',
          version_label: 'v1.1',
          status: 'approved_by_designer',
          garment_type: 'jacket',
          created_at: '2026-10-23T18:00:00Z',
          notes: 'Ajuste de sisa y solapa tras fitting con Laura Martínez',
        },
      ],
    };

    // Interceptar creations con soporte para listado (array) y detalle (single object)
    await page.route('**/rest/v1/creations*', async (route) => {
      try {
        const response = await route.fetch();
        if (response.ok()) {
          const body = await response.json();
          if (body && (Array.isArray(body) ? body.length > 0 : body.id)) {
            await route.fulfill({ response });
            return;
          }
        }
      } catch (e) {
        // fallback
      }

      const isSingle =
        route.request().headers()['accept']?.includes('vnd.pgrst.object+json') ||
        route.request().url().includes('id=eq.');

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Range': '0-0/1',
        },
        body: JSON.stringify(isSingle ? creationMockItem : [creationMockItem]),
      });
    });

    // Interceptar clients para detalle de creación
    await page.route('**/rest/v1/clients*', async (route) => {
      const isSingle =
        route.request().headers()['accept']?.includes('vnd.pgrst.object+json') ||
        route.request().url().includes('id=eq.');
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isSingle ? creationMockItem.client : [creationMockItem.client]),
      });
    });

    // Interceptar measurement_sessions
    await page.route('**/rest/v1/measurement_sessions*', async (route) => {
      const isSingle =
        route.request().headers()['accept']?.includes('vnd.pgrst.object+json') ||
        route.request().url().includes('id=eq.');
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isSingle ? creationMockItem.session : [creationMockItem.session]),
      });
    });

    // Interceptar pattern_executions
    await page.route('**/rest/v1/pattern_executions*', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creationMockItem.pattern_executions),
      });
    });
  });

  test('TEST 01: /creations responde correctamente (200 OK y carga)', async ({ page }) => {
    const response = await page.goto('/creations', { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Atelier|Katherine Carroll/i);
  });

  test('TEST 02: El título "Creaciones de Alta Costura" aparece', async ({ page }) => {
    await page.goto('/creations', { waitUntil: 'networkidle', timeout: 30000 });
    const headerTitle = page.locator('text=Creaciones de Alta Costura').first();
    await expect(headerTitle).toBeVisible({ timeout: 10000 });
  });

  test('TEST 03: Existe el CTA "+ Nueva Creación"', async ({ page }) => {
    await page.goto('/creations', { waitUntil: 'networkidle', timeout: 30000 });
    const newCreationBtn = page.locator('text=+ Nueva Creación').first();
    await expect(newCreationBtn).toBeVisible({ timeout: 10000 });
  });

  test('TEST 04: La creación C15 aparece en el archivo del Atelier', async ({ page }) => {
    await page.goto('/creations', { waitUntil: 'networkidle', timeout: 30000 });
    const c15Card = page.locator('text=Chaqueta Sastre de Prueba C15').first();
    await expect(c15Card).toBeVisible({ timeout: 10000 });
  });

  test('TEST 05: La clienta correcta aparece ("Laura Martínez")', async ({ page }) => {
    await page.goto('/creations', { waitUntil: 'networkidle', timeout: 30000 });
    const clientName = page.locator('text=Laura Martínez').first();
    await expect(clientName).toBeVisible({ timeout: 10000 });
  });

  test('TEST 06: El estado real aparece ("APROBADA")', async ({ page }) => {
    await page.goto('/creations', { waitUntil: 'networkidle', timeout: 30000 });
    const approvedBadge = page.locator('text=APROBADA').first();
    await expect(approvedBadge).toBeVisible({ timeout: 10000 });
  });

  test('TEST 07: El patrón asociado aparece ("Chaqueta Sastre de Alta Costura")', async ({ page }) => {
    await page.goto('/creations', { waitUntil: 'networkidle', timeout: 30000 });
    const patternName = page.locator('text=Chaqueta Sastre de Alta Costura').first();
    await expect(patternName).toBeVisible({ timeout: 10000 });
  });

  test('TEST 08: El número de versiones/ejecuciones utiliza la terminología correcta (ejecuciones, no patrones)', async ({ page }) => {
    await page.goto('/creations', { waitUntil: 'networkidle', timeout: 30000 });
    // Verificar que dice 16 ejecuciones y que NO confunde diciendo "16 patrones"
    const executionsText = page.locator('text=/16 ejecuciones/i').first();
    await expect(executionsText).toBeVisible({ timeout: 10000 });

    const deceptiveText = page.locator('text=16 patrones');
    await expect(deceptiveText).toHaveCount(0);
  });

  test('TEST 09: Las versiones históricas NO aparecen como nuevas creaciones (creaciones = 1)', async ({ page }) => {
    await page.goto('/creations', { waitUntil: 'networkidle', timeout: 30000 });
    // En el resumen de chips debe decir "Todos (1)"
    const allTab = page.locator('text=Todos (1)').first();
    await expect(allTab).toBeVisible({ timeout: 10000 });
  });

  test('TEST 10: Abrir una creación funciona (clic en C15 abre la ficha de detalle)', async ({ page }) => {
    await page.goto('/creations', { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('text=Chaqueta Sastre de Prueba C15').first().click();
    // Debe aparecer la vista de detalle con el botón de volver a la lista
    const backBtn = page.locator('text=← Volver a la Lista de Creaciones').first();
    await expect(backBtn).toBeVisible({ timeout: 10000 });

    // Y el detalle del concepto & descripción
    const conceptHeader = page.locator('text=CONCEPTO & DESCRIPCIÓN DEL PROYECTO').first();
    await expect(conceptHeader).toBeVisible({ timeout: 10000 });
  });

  test('TEST 11: La navegación hacia la clienta en el Directorio funciona', async ({ page }) => {
    await page.goto('/creations', { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('text=Chaqueta Sastre de Prueba C15').first().click();
    await page.waitForTimeout(1000);

    // Botón para ir al directorio de clientas
    const clientDirBtn = page.locator('text=Ver ficha de clienta →').first();
    await expect(clientDirBtn).toBeVisible({ timeout: 10000 });
    await clientDirBtn.click();
    await page.waitForTimeout(1500);

    // Verificar que la URL ahora apunta a /clients con client_id
    expect(page.url()).toContain('clients');
  });

  test('TEST 12: La navegación hacia el patrón CAD funciona (Abrir Taller CAD / Fitting)', async ({ page }) => {
    await page.goto('/creations', { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('text=Chaqueta Sastre de Prueba C15').first().click();
    await page.waitForTimeout(1000);

    // Botón para abrir el taller CAD
    const openCadBtn = page.locator('text=📐 Abrir Taller CAD / Fitting').first();
    await expect(openCadBtn).toBeVisible({ timeout: 10000 });
    await openCadBtn.click();
    await page.waitForTimeout(1500);

    // Debe mostrar la cabecera del Taller CAD
    const cadHeader = page.locator('text=/Volver a Chaqueta Sastre|Taller CAD|Patronaje/i').first();
    await expect(cadHeader).toBeVisible({ timeout: 10000 });
  });

  test('TEST 13: Recargar la página no rompe el estado', async ({ page }) => {
    await page.goto('/creations', { waitUntil: 'networkidle', timeout: 30000 });
    await page.reload({ waitUntil: 'networkidle' });
    const headerTitle = page.locator('text=Creaciones de Alta Costura').first();
    await expect(headerTitle).toBeVisible({ timeout: 10000 });
    const c15Card = page.locator('text=Chaqueta Sastre de Prueba C15').first();
    await expect(c15Card).toBeVisible({ timeout: 10000 });
  });

  test('TEST 15: La tarjeta de creación muestra la fotografía editorial de la prenda', async ({ page }) => {
    await page.goto('/creations', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);
    const c15Card = page.locator('text=Chaqueta Sastre de Prueba C15').first();
    await expect(c15Card).toBeVisible({ timeout: 10000 });

    // Verificar que la fotografía editorial alusiva a la prenda está presente en el DOM
    const photoImg = page.locator('img[src*="jacket.jpg"], [style*="jacket.jpg"]').first();
    await expect(photoImg).toBeVisible({ timeout: 10000 });

    const screenshotPath = 'scratch/creations_live_photo_verified.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
  });

});

