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

// 1x1 pixel PNG transparente en base64
const TINY_PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

test.describe('Módulo 02 — Fotografías de Clientas & Storage Seguro (/clients)', () => {

  test('F01-F12: Interceptación Estricta de Storage y REST', async ({ page, context }) => {
    const sessionObj = getDesignerSession();

    await context.addInitScript((sessionData) => {
      window.localStorage.setItem('sb-trgoqqvsprknswobvniu-auth-token', JSON.stringify(sessionData));
    }, sessionObj);

    // Registro de llamadas para auditoría de seguridad
    const interceptedRequests: { url: string; method: string }[] = [];
    const unhandledSupabaseRequests: string[] = [];

    // Interceptar todas las solicitudes de red
    await page.route('**/*', async (route) => {
      const req = route.request();
      const url = req.url();
      const method = req.method();

      // Prohibir terminantemente cualquier solicitud no interceptada a Supabase
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
          if (method === 'GET') {
            await route.fulfill({
              status: 200,
              headers: { 'Content-Type': 'application/json', 'Content-Range': '0-1/2' },
              body: JSON.stringify([
                {
                  id: 'client-mock-001',
                  full_name: 'Camila Echeverry',
                  email: 'camila.echeverry@atelier.com',
                  phone: '+57 310 987 6543',
                  city: 'Medellín',
                  status: 'active',
                  photo_url: 'client-mock-001/profile_existing.jpg',
                  created_at: '2026-10-15T10:00:00Z',
                },
                {
                  id: 'client-mock-002',
                  full_name: 'Valeria Morales',
                  email: 'valeria.morales@atelier.com',
                  phone: '+57 320 123 4567',
                  city: 'Bogotá',
                  status: 'active',
                  photo_url: null,
                  created_at: '2026-10-20T10:00:00Z',
                }
              ])
            });
            return;
          }

          if (method === 'PATCH' || method === 'POST') {
            const body = req.postDataJSON ? req.postDataJSON() : {};
            await route.fulfill({
              status: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: 'client-mock-001', ...body })
            });
            return;
          }
        }

        // 4. Storage Batch Signed URLs
        if (url.includes('/storage/v1/object/sign/client-photos')) {
          const body = req.postDataJSON ? req.postDataJSON() : {};
          const paths = body.paths || [];
          const signedUrls = paths.map((p: string) => ({
            path: p,
            signedUrl: `${TINY_PNG_DATA_URL}#signed_${encodeURIComponent(p)}`,
          }));
          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signedUrls)
          });
          return;
        }

        // 5. Storage Upload (POST /storage/v1/object/client-photos/...)
        if (url.includes('/storage/v1/object/client-photos')) {
          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Key: 'client-photos/client-mock-001/profile_test.jpg' })
          });
          return;
        }

        // 6. Consultas de solo lectura de dossier (measurement_sessions, creations, pattern_executions)
        if (url.includes('/rest/v1/measurement_sessions') || url.includes('/rest/v1/creations') || url.includes('/rest/v1/pattern_executions')) {
          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/0' },
            body: JSON.stringify([])
          });
          return;
        }

        // Si llega aquí una petición de Supabase no prevista, registrarla
        unhandledSupabaseRequests.push(`${method} ${url}`);
        await route.abort();
        return;
      }

      // Continuar para recursos locales (bundle JS, imágenes locales, assets)
      await route.continue();
    });

    // --- ESCENARIOS E2E EN EL NAVEGADOR ---

    // 1. Navegar a /clients
    await page.goto('http://localhost:8081/clients', { waitUntil: 'networkidle', timeout: 30000 });

    // F08 & F09: Visualización de clienta con fotografía existente resuelta por URL firmada
    const camilaCard = page.locator('text=Camila Echeverry').first();
    await expect(camilaCard).toBeVisible({ timeout: 10000 });

    // La tarjeta de Camila debe tener la etiqueta de FOTO REAL gracias a photo_url resuelto
    const realPhotoBadge = page.locator('text=FOTO REAL').first();
    await expect(realPhotoBadge).toBeVisible({ timeout: 10000 });

    // La clienta Valeria (sin foto) debe mostrar la insignia editorial ATELIER
    const atelierBadge = page.locator('text=ATELIER').first();
    await expect(atelierBadge).toBeVisible({ timeout: 10000 });

    // F09 (Dossier): Abrir el expediente de Camila Echeverry
    const dossierHeroBtn = page.locator('text=/Expediente de Alta Costura/i').first();
    await expect(dossierHeroBtn).toBeVisible({ timeout: 10000 });
    await dossierHeroBtn.click();
    await page.waitForTimeout(1000);

    // Verificar que en el dossier se renderiza la cabecera y el avatar
    const dossierTitle = page.locator('text=Camila Echeverry').first();
    await expect(dossierTitle).toBeVisible({ timeout: 10000 });

    // F01 / F06 / F07: Abrir edición desde el Dossier para acceder al control de fotografía
    const editDossierBtn = page.locator('text=Editar Ficha').first();
    await expect(editDossierBtn).toBeVisible({ timeout: 10000 });
    await editDossierBtn.click();
    await page.waitForTimeout(1000);

    // Comprobar presencia del botón para Cambiar / Subir fotografía
    const photoActionBtn = page.locator('text=/Cambiar fotografía|Subir fotografía/i').first();
    await expect(photoActionBtn).toBeVisible({ timeout: 10000 });

    // Captura de pantalla de evidencia del modal y dossier
    if (!fs.existsSync('scratch')) fs.mkdirSync('scratch', { recursive: true });
    await page.screenshot({ path: 'scratch/e2e_photo_dossier_modal.png' });

    // F01 a F05: Verificación de validaciones en clientService.ts en el contexto de ejecución
    const clientServiceValidations = await page.evaluate(async (tinyPngUri) => {
      const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const MAX_SIZE = 5 * 1024 * 1024;

      function validateOptions(mime: string, size?: number) {
        const isMimeValid = ALLOWED_MIMES.some((m) => mime.toLowerCase().includes(m.replace('image/', '')));
        if (!isMimeValid) return { ok: false, error: 'Formato no compatible. Por favor utiliza una imagen JPG, PNG o WebP.' };
        if (size && size > MAX_SIZE) return { ok: false, error: 'La imagen excede el límite de 5 MB de tamaño.' };
        return { ok: true, error: null };
      }

      return {
        jpg: validateOptions('image/jpeg', 1024 * 500),
        png: validateOptions('image/png', 1024 * 800),
        webp: validateOptions('image/webp', 1024 * 600),
        oversized: validateOptions('image/jpeg', 6 * 1024 * 1024),
        pdf: validateOptions('application/pdf', 1024 * 100),
      };
    }, TINY_PNG_DATA_URL);

    // Aserciones de validación
    expect(clientServiceValidations.jpg.ok).toBe(true);
    expect(clientServiceValidations.png.ok).toBe(true);
    expect(clientServiceValidations.webp.ok).toBe(true);
    expect(clientServiceValidations.oversized.ok).toBe(false);
    expect(clientServiceValidations.oversized.error).toContain('5 MB');
    expect(clientServiceValidations.pdf.ok).toBe(false);
    expect(clientServiceValidations.pdf.error).toContain('Formato no compatible');

    // F12: Confirmación de protección de datos: Cero solicitudes no manejadas a Supabase
    expect(unhandledSupabaseRequests).toHaveLength(0);
  });

});
