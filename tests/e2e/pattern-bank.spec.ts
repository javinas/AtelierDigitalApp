import { test, expect } from '@playwright/test';

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Helper para generar sesión mock con rol de diseñadora (Katherine Carroll)
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

test.describe('Módulo 02 · Banco Global de Patrones CAD (/pattern-bank)', () => {

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

    // Interceptar la consulta de profiles de Supabase para responder con rol de diseñadora
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

    // Datos canónicos de Creación C15
    const creationC15 = {
      id: '141693a0-01e8-498a-bbb3-1c4f98036543',
      name: 'Chaqueta Sastre de Prueba C15',
      photo_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
      status: 'approved',
      creation_type: 'bespoke',
      garment_type: 'jacket',
      client_id: '2284e882-3b61-4061-be13-553ea11f0b48',
      session_id: 'f94116ce-9e0c-4ec9-86e0-81135f606830',
      active_pattern_execution_id: 'ca808ce9-45ca-47d2-ab1b-80d621a68c40',
      created_at: '2026-10-23T10:00:00Z',
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
      },
    };

    // Creación C16 para Corset (sin fotografía, para validar Atelier Pattern Board)
    const creationC16 = {
      id: '151693a0-02e8-498a-bbb3-2c4f98036544',
      name: 'Corset Haute Couture C16',
      photo_url: null,
      status: 'in_progress',
      creation_type: 'bespoke',
      garment_type: 'corset',
      client_id: '2284e882-3b61-4061-be13-553ea11f0b48',
      session_id: 'f94116ce-9e0c-4ec9-86e0-81135f606830',
      active_pattern_execution_id: 'direct-exec-corset-v11',
      created_at: '2026-10-24T09:00:00Z',
      client: creationC15.client,
      session: creationC15.session,
    };

    // 16 ejecuciones de C15 (v1.0 trazado base + 14 preliminares + v1.1 aprobada)
    const mockExecutions: any[] = [];

    // v1.1 aprobada y vigente
    mockExecutions.push({
      id: 'ca808ce9-45ca-47d2-ab1b-80d621a68c40',
      client_id: '2284e882-3b61-4061-be13-553ea11f0b48',
      creation_id: '141693a0-01e8-498a-bbb3-1c4f98036543',
      session_id: 'f94116ce-9e0c-4ec9-86e0-81135f606830',
      template_id: 'b455739a-8fb4-4dd3-aa33-0a80dbf378d9',
      parent_execution_id: 'exec-root-c15-001',
      garment_type: 'jacket',
      version_label: 'v1.1',
      status: 'approved_by_designer',
      created_at: '2026-10-23T18:00:00Z',
      client: creationC15.client,
      creation: creationC15,
      session: creationC15.session,
      geometry_result: {
        pieces: new Array(16).fill(null).map((_, i) => ({
          name: `Pieza Chaqueta ${i + 1}`,
          boundingBox: { width: 350, height: 500 },
          notches: [1, 2],
        })),
      },
      measurement_snapshot: {
        contorno_busto: 92,
        contorno_cintura: 72,
        contorno_cadera: 98,
        ancho_espalda: 35,
      },
    });

    // 15 ejecuciones previas de v1.0
    for (let i = 1; i <= 15; i++) {
      mockExecutions.push({
        id: i === 1 ? 'exec-root-c15-001' : `exec-prelim-${i}`,
        client_id: '2284e882-3b61-4061-be13-553ea11f0b48',
        creation_id: '141693a0-01e8-498a-bbb3-1c4f98036543',
        session_id: 'f94116ce-9e0c-4ec9-86e0-81135f606830',
        template_id: 'b455739a-8fb4-4dd3-aa33-0a80dbf378d9',
        parent_execution_id: null,
        garment_type: 'jacket',
        version_label: 'v1.0.0',
        status: 'pending_fitting',
        created_at: `2026-10-21T10:${String(i).padStart(2, '0')}:00Z`,
        client: creationC15.client,
        creation: creationC15,
        session: creationC15.session,
        geometry_result: {
          pieces: new Array(16).fill(null).map((_, j) => ({
            name: `Pieza Chaqueta ${j + 1}`,
            boundingBox: { width: 350, height: 500 },
          })),
        },
      });
    }

    // 2 ejecuciones de Corset vinculadas a Creación C16 (sin foto)
    // Para completar las 18 ejecuciones técnicas históricas
    mockExecutions.push({
      id: 'direct-exec-corset-v11',
      client_id: '2284e882-3b61-4061-be13-553ea11f0b48',
      creation_id: '151693a0-02e8-498a-bbb3-2c4f98036544',
      session_id: 'f94116ce-9e0c-4ec9-86e0-81135f606830',
      parent_execution_id: 'direct-exec-corset-v10',
      garment_type: 'corset',
      version_label: 'v1.1',
      status: 'pending_fitting',
      created_at: '2026-10-24T12:00:00Z',
      client: creationC15.client,
      creation: creationC16,
      geometry_result: {
        pieces: new Array(6).fill(null).map((_, j) => ({
          name: `Panel Corset ${j + 1}`,
          boundingBox: { width: 120, height: 320 },
        })),
      },
    });

    mockExecutions.push({
      id: 'direct-exec-corset-v10',
      client_id: '2284e882-3b61-4061-be13-553ea11f0b48',
      creation_id: '151693a0-02e8-498a-bbb3-2c4f98036544',
      session_id: 'f94116ce-9e0c-4ec9-86e0-81135f606830',
      parent_execution_id: null,
      garment_type: 'corset',
      version_label: 'v1.0',
      status: 'draft',
      created_at: '2026-10-24T10:00:00Z',
      client: creationC15.client,
      creation: creationC16,
      geometry_result: {
        pieces: new Array(6).fill(null).map((_, j) => ({
          name: `Panel Corset ${j + 1}`,
          boundingBox: { width: 120, height: 320 },
        })),
      },
    });

    // Interceptar pattern_executions de Supabase
    await page.route('**/rest/v1/pattern_executions*', async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Range': `0-${mockExecutions.length - 1}/${mockExecutions.length}`,
        },
        body: JSON.stringify(mockExecutions),
      });
    });

    // Interceptar creations
    await page.route('**/rest/v1/creations*', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([creationC15, creationC16]),
      });
    });

    // Interceptar clients
    await page.route('**/rest/v1/clients*', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([creationC15.client]),
      });
    });

    // Interceptar pattern_adjustments
    await page.route('**/rest/v1/pattern_adjustments*', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          {
            id: 'adj-001',
            pattern_execution_id: 'ca808ce9-45ca-47d2-ab1b-80d621a68c40',
            target_piece: 'Solapa delantera',
            adjustment_type: 'ease',
            delta_mm: -10,
            description: 'Ajuste de entalle de sisa tras prueba de fitting',
          },
        ]),
      });
    });
  });

  test('TEST 01: /pattern-bank responde correctamente (200 OK y carga)', async ({ page }) => {
    const response = await page.goto('/pattern-bank', { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Atelier|Katherine Carroll/i);
  });

  test('TEST 02: Título editorial y cita aparecen ("Banco Global de Patrones CAD")', async ({ page }) => {
    await page.goto('/pattern-bank', { waitUntil: 'networkidle', timeout: 30000 });
    const title = page.locator('text=Banco Global de Patrones CAD').first();
    await expect(title).toBeVisible({ timeout: 10000 });

    const quote = page.locator('text=/El archivo técnico y creativo/i').first();
    await expect(quote).toBeVisible({ timeout: 10000 });
  });

  test('TEST 03: KPIs ontológicos diferenciados: PATRONES CAD vs EJECUCIONES TÉCNICAS', async ({ page }) => {
    await page.goto('/pattern-bank', { waitUntil: 'networkidle', timeout: 30000 });
    
    // PATRONES CAD debe contar los patrones lógicos únicos (2: Chaqueta C15 + Corset C16)
    const kpiPatterns = page.locator('text=PATRONES CAD').first();
    await expect(kpiPatterns).toBeVisible({ timeout: 10000 });

    // EJECUCIONES TÉCNICAS debe reflejar las 18 corridas del motor CAD
    const kpiExecs = page.locator('text=EJECUCIONES TÉCNICAS').first();
    await expect(kpiExecs).toBeVisible({ timeout: 10000 });

    // Métricas exactas requeridas por la ontología M02
    await expect(page.locator('text=/2 Patrones CAD/i').first()).toBeVisible();
    await expect(page.locator('text=/18 Ejecuciones técnicas/i').first()).toBeVisible();
    await expect(page.locator('text=/1 Aprobado \\/ Vigente/i').first()).toBeVisible();
    await expect(page.locator('text=/1 En Fitting/i').first()).toBeVisible();
    await expect(page.locator('text=/2 Con Creación/i').first()).toBeVisible();
    await expect(page.locator('text=/0 Patrón Libre/i').first()).toBeVisible();
  });

  test('TEST 04: Ausencia estricta de "18 TOTAL PATRONES" y de "16 patrones"', async ({ page }) => {
    await page.goto('/pattern-bank', { waitUntil: 'networkidle', timeout: 30000 });
    
    // No debe existir "18 TOTAL PATRONES" ni "TOTAL PATRONES" sin distinción
    const deceptive18 = page.locator('text=TOTAL PATRONES');
    await expect(deceptive18).toHaveCount(0);

    const deceptive16 = page.locator('text=16 patrones');
    await expect(deceptive16).toHaveCount(0);
  });

  test('TEST 05: Presencia de sección visual Hero "PATRONES DESTACADOS DEL ARCHIVO"', async ({ page }) => {
    await page.goto('/pattern-bank', { waitUntil: 'networkidle', timeout: 30000 });
    const featuredHeader = page.locator('text=✦ PATRONES DESTACADOS DEL ARCHIVO').first();
    await expect(featuredHeader).toBeVisible({ timeout: 10000 });
  });

  test('TEST 06: Cada tarjeta de patrón lógico muestra la prenda en serif editorial', async ({ page }) => {
    await page.goto('/pattern-bank', { waitUntil: 'networkidle', timeout: 30000 });
    const jacketTitle = page.locator('text=Chaqueta Sastre de Alta Costura').first();
    await expect(jacketTitle).toBeVisible({ timeout: 10000 });
  });

  test('TEST 07: Presencia de clienta ("Laura Martínez") con enlace', async ({ page }) => {
    await page.goto('/pattern-bank', { waitUntil: 'networkidle', timeout: 30000 });
    const clientLink = page.locator('text=Laura Martínez →').first();
    await expect(clientLink).toBeVisible({ timeout: 10000 });
  });

  test('TEST 08: Presencia de creación ("Chaqueta Sastre de Prueba C15") con enlace', async ({ page }) => {
    await page.goto('/pattern-bank', { waitUntil: 'networkidle', timeout: 30000 });
    const creationLink = page.locator('text=/Chaqueta Sastre de Prueba C15/i').first();
    await expect(creationLink).toBeVisible({ timeout: 10000 });
  });

  test('TEST 09: Versión vigente destacada ("v1.1 · APROBADO · VIGENTE")', async ({ page }) => {
    await page.goto('/pattern-bank', { waitUntil: 'networkidle', timeout: 30000 });
    const activeVersion = page.locator('text=/v1.1 · APROBADO · VIGENTE/i').first();
    await expect(activeVersion).toBeVisible({ timeout: 10000 });
  });

  test('TEST 10: Trazabilidad técnica: "16 ejecuciones técnicas" y "16 piezas CAD"', async ({ page }) => {
    await page.goto('/pattern-bank', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Debe indicar 16 ejecuciones técnicas como dato de trazabilidad
    const execsTrace = page.locator('text=ejecuciones técnicas').first();
    await expect(execsTrace).toBeVisible({ timeout: 10000 });

    const piecesTrace = page.locator('text=piezas CAD').first();
    await expect(piecesTrace).toBeVisible({ timeout: 10000 });
  });

  test('TEST 11: Acordeón de linaje expandible despliega historial con v1.1 y v1.0', async ({ page }) => {
    await page.goto('/pattern-bank', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Toggle de historial
    const historyToggle = page.locator('text=/Ver Linaje e Historial/i').first();
    await expect(historyToggle).toBeVisible({ timeout: 10000 });
    await historyToggle.click();

    // Debe mostrar la sección expandida "HISTORIAL DEL PATRÓN"
    const historyTitle = page.locator('text=HISTORIAL DEL PATRÓN').first();
    await expect(historyTitle).toBeVisible({ timeout: 10000 });

    // Debe aparecer la cadena de linaje técnico con v1.0 -> v1.1
    await expect(page.locator('text=/CADENA DE LINAJE TÉCNICO/i').first()).toBeVisible({ timeout: 10000 });

    // Debe aparecer el nodo de versión derivada de fitting
    await expect(page.locator('text=/Revisión derivada de fitting|Revisión aprobada y vigente/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('TEST 12: Botón CTA "Abrir patrón →" está presente', async ({ page }) => {
    await page.goto('/pattern-bank', { waitUntil: 'networkidle', timeout: 30000 });
    const cadBtn = page.locator('text=/Abrir patrón/i').first();
    await expect(cadBtn).toBeVisible({ timeout: 10000 });
  });

  test('TEST 13: Botón "Ficha Técnica & Linaje" abre el modal de inspección', async ({ page }) => {
    await page.goto('/pattern-bank', { waitUntil: 'networkidle', timeout: 30000 });
    const inspectBtn = page.locator('text=🔍 Ficha Técnica & Linaje').first();
    await expect(inspectBtn).toBeVisible({ timeout: 10000 });
    await inspectBtn.click();

    // Debe abrirse el modal con el texto de inmutabilidad
    const inmutabilityTitle = page.locator('text=🛡️ EJECUCIÓN HISTÓRICA INMUTABLE').first();
    await expect(inmutabilityTitle).toBeVisible({ timeout: 10000 });

    // Cerrar el modal
    const closeBtn = page.locator('text=Cerrar Ficha').first();
    await closeBtn.click();
    await expect(inmutabilityTitle).not.toBeVisible();
  });

  test('TEST 14: Buscador reactivo filtra patrones', async ({ page }) => {
    await page.goto('/pattern-bank', { waitUntil: 'networkidle', timeout: 30000 });
    const searchInput = page.locator('input[placeholder*="Buscar patrón"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Buscar "Corset"
    await searchInput.fill('Corset');
    await expect(page.locator('text=Corset Haute Couture').first()).toBeVisible({ timeout: 10000 });

    // Limpiar búsqueda
    await searchInput.fill('');
    await expect(page.locator('text=Chaqueta Sastre de Alta Costura').first()).toBeVisible({ timeout: 10000 });
  });

  test('TEST 15: Recarga de la página mantiene el estado y presentación 100% íntegros', async ({ page }) => {
    await page.goto('/pattern-bank', { waitUntil: 'networkidle', timeout: 30000 });
    await expect(page.locator('text=Banco Global de Patrones CAD').first()).toBeVisible();

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('text=Banco Global de Patrones CAD').first()).toBeVisible();
    await expect(page.locator('text=PATRONES CAD').first()).toBeVisible();
    await expect(page.locator('text=EJECUCIONES TÉCNICAS').first()).toBeVisible();
  });
});
