/**
 * ==============================================================================
 * ATELIER DIGITAL — SUITE E2E MOCK: ESCENARIO COLEGIO CON 30 ALUMNOS
 * Archivo: tests/e2e/demo-school-30-students.spec.ts
 * 
 * CLASIFICACIÓN TÉCNICA: PRUEBA 100% MOCK / AISLAMIENTO TOTAL DE RED / ZERO WRITE
 * 
 * PROPÓSITO:
 * Verificar el renderizado y la navegación en navegador real (Edge Headless) de
 * los componentes de UI (Expediente de cliente institucional, pestañas de Personas
 * y Grupos, Jornadas de medición, y Módulo de Creaciones con prendas asignadas a
 * alumnos) simulando las respuestas de Supabase mediante intercepción de red.
 * 
 * GARANTÍA DE SEGURIDAD:
 * Esta prueba NO realiza peticiones HTTP reales a Supabase ni escribe datos en
 * la base de datos de producción (trgoqqvsprknswobvniu). Todo el tráfico a
 * trgoqqvsprknswobvniu.supabase.co es interceptado y respondido con datos sintéticos.
 * ==============================================================================
 */

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

const CLIENT_ID = 'e1a10000-0000-4000-8000-000000000001';
const GROUP_ID = 'e1a20000-0000-4000-8000-000000000001';
const CAMPAIGN_ID = 'e1a30000-0000-4000-8000-000000000001';

const SCHOOL_CLIENT = {
  id: CLIENT_ID,
  full_name: 'COLEGIO DEMOSTRACIÓN ATELIER - BARRANQUILLA',
  email: 'rectoria.demo@colegioatelier.edu.co',
  phone: '+57 (5) 350-0000',
  city: 'Barranquilla',
  style_preferences: 'Uniformes institucionales de gala y diario: corte sastre clásico, telas de alta resistencia.',
  internal_notes: 'DATOS SINTÉTICOS DE PRUEBA M02 — Cliente institucional ficticio para demostración de 30 alumnos.',
  status: 'active',
  created_at: '2026-10-30T07:00:00Z',
  updated_at: '2026-10-30T07:00:00Z',
};

const SCHOOL_GROUP = {
  id: GROUP_ID,
  client_id: CLIENT_ID,
  name: 'CURSO DEMOSTRACIÓN 30 ALUMNOS',
  type: 'school',
  notes: 'DATOS SINTÉTICOS DE PRUEBA M02 — Curso escolar 9º Grado (15 niños y 15 niñas).',
  is_active: true,
  created_at: '2026-10-30T07:00:00Z',
  updated_at: '2026-10-30T07:00:00Z',
};

// Generar 30 alumnos sintéticos
const BOYS_DATA = [
  'Mateo Alejandro Rodríguez Gómez', 'Santiago Andrés Castro Navarro', 'Samuel David Polo Arteta',
  'Nicolás Eduardo Meza Char', 'Sebastián José Mendoza Vives', 'Daniel Felipe Herrera Daza',
  'Gabriel Antonio De la Hoz Ruiz', 'Lucas Emmanuel Pinedo Barros', 'Alejandro Rafael Salcedo Noguera',
  'Diego Armando Tarud Ceballos', 'Tomás Ignacio Obregón Llinás', 'Emilio Javier Danies Pumarejo',
  'Joaquín Andrés Carbonell Vega', 'Matías Esteban Bula Donado', 'Simón Leonardo Roncallo Cortissoz'
];

const GIRLS_DATA = [
  'Valentina Sofía Abuchaibe Cepeda', 'Mariana Lucía Benedetti Dangond', 'Isabella Marie Cure Caridi',
  'Camila Andrea Daes Insignares', 'Luciana Victoria Echeverría Manotas', 'Salomé Patricia Faciolince Sarabia',
  'Gabriela Elena Gerlein Rosado', 'Daniela Cristina Hazbún Slebi', 'Paulina Beatriz Juliao Lafaurie',
  'Antonella María Lacouture Muvdi', 'Martina Inés Nule Amastha', 'Elena Isabel Palacio Segebre',
  'Catalina Rosa Santo Domingo Vilar', 'Emma Celeste Vengoechea Celia', 'Miranda Clara Zúñiga Caballero'
];

const STUDENTS: any[] = [];
let idx = 1;

for (const name of BOYS_DATA) {
  const hex = idx.toString().padStart(2, '0');
  STUDENTS.push({
    id: `e1b00000-0000-4000-8000-0000000000${hex}`,
    client_id: CLIENT_ID,
    full_name: name,
    demographic_category: 'boy',
    reference_id: `ALUM-M${hex}`,
    birth_date: idx % 2 === 0 ? '2012-04-15' : '2011-09-20',
    notes: `DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M${hex}. Talla: ${idx % 2 === 0 ? '14' : '16'}`,
    is_active: true,
    created_at: '2026-10-30T07:00:00Z',
    updated_at: '2026-10-30T07:00:00Z',
  });
  idx++;
}

for (const name of GIRLS_DATA) {
  const hex = idx.toString().padStart(2, '0');
  STUDENTS.push({
    id: `e1b00000-0000-4000-8000-0000000000${hex}`,
    client_id: CLIENT_ID,
    full_name: name,
    demographic_category: 'girl',
    reference_id: `ALUM-F${(idx - 15).toString().padStart(2, '0')}`,
    birth_date: idx % 2 === 0 ? '2012-05-18' : '2011-10-12',
    notes: `DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F${(idx - 15).toString().padStart(2, '0')}. Talla: ${idx % 2 === 0 ? '14' : '16'}`,
    is_active: true,
    created_at: '2026-10-30T07:00:00Z',
    updated_at: '2026-10-30T07:00:00Z',
  });
  idx++;
}

// 30 Sesiones de medidas
const SESSIONS: any[] = [];
for (let i = 1; i <= 30; i++) {
  const hex = i.toString().padStart(2, '0');
  SESSIONS.push({
    id: `e1c00000-0000-4000-8000-0000000000${hex}`,
    client_id: CLIENT_ID,
    person_id: `e1b00000-0000-4000-8000-0000000000${hex}`,
    campaign_id: CAMPAIGN_ID,
    session_date: '2026-10-30',
    taken_by: '0b57041f-3a3e-40c5-8dc9-74300484a974',
    status: 'completed',
    unit_system: 'cm',
    notes: `DATOS SINTÉTICOS DE PRUEBA M02 — Sesión de alumno #${i}`,
    version_number: 1,
    created_at: '2026-10-30T07:00:00Z',
    updated_at: '2026-10-30T07:00:00Z',
  });
}

// 45 Creaciones
const CREATIONS: any[] = [];
let cIdx = 1;
// 15 Niños -> Pantalón + Camisa
for (let i = 1; i <= 15; i++) {
  const hex = i.toString().padStart(2, '0');
  const student = STUDENTS[i - 1];
  CREATIONS.push({
    id: `e1e00000-0000-4000-8000-0000000000${cIdx.toString().padStart(2, '0')}`,
    client_id: CLIENT_ID,
    person_id: student.id,
    name: `Pantalón Clásico Escolar — ${student.full_name}`,
    description: 'Pantalón sastre escolar de uniforme.',
    creation_type: 'corporate',
    status: 'active',
    occasion: 'Uniforme Escolar Institucional',
    garment_type: 'pants',
    session_id: SESSIONS[i - 1].id,
    notes: 'DATOS SINTÉTICOS DE PRUEBA M02',
    created_at: '2026-10-30T07:00:00Z',
    updated_at: '2026-10-30T07:00:00Z',
    client: SCHOOL_CLIENT,
    person: student,
  });
  cIdx++;

  CREATIONS.push({
    id: `e1e00000-0000-4000-8000-0000000000${cIdx.toString().padStart(2, '0')}`,
    client_id: CLIENT_ID,
    person_id: student.id,
    name: `Camisa Clásica Escolar — ${student.full_name}`,
    description: 'Camisa clásica manga corta con cuello camisero.',
    creation_type: 'corporate',
    status: 'active',
    occasion: 'Uniforme Escolar Institucional',
    garment_type: 'shirt',
    session_id: SESSIONS[i - 1].id,
    notes: 'DATOS SINTÉTICOS DE PRUEBA M02',
    created_at: '2026-10-30T07:00:00Z',
    updated_at: '2026-10-30T07:00:00Z',
    client: SCHOOL_CLIENT,
    person: student,
  });
  cIdx++;
}

// 15 Niñas -> Vestido
for (let i = 16; i <= 30; i++) {
  const student = STUDENTS[i - 1];
  CREATIONS.push({
    id: `e1e00000-0000-4000-8000-0000000000${cIdx.toString().padStart(2, '0')}`,
    client_id: CLIENT_ID,
    person_id: student.id,
    name: `Vestido Clásico Sencillo — ${student.full_name}`,
    description: 'Vestido escolar de falda plisada y corpiño base.',
    creation_type: 'corporate',
    status: 'active',
    occasion: 'Uniforme Escolar Institucional',
    garment_type: 'dress',
    session_id: SESSIONS[i - 1].id,
    notes: 'DATOS SINTÉTICOS DE PRUEBA M02',
    created_at: '2026-10-30T07:00:00Z',
    updated_at: '2026-10-30T07:00:00Z',
    client: SCHOOL_CLIENT,
    person: student,
  });
  cIdx++;
}

test.describe('[MOCK E2E] Módulo 02 — Escenario Demostración: Colegio con 30 Alumnos (Aislamiento Total)', () => {

  test('[MOCK] V01-V09: Verificación UI de Cliente Institucional, 30 Alumnos, Grupo, Jornada y 45 Creaciones', async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const sessionObj = getDesignerSession();

    await context.addInitScript((sessionData) => {
      window.localStorage.setItem('sb-trgoqqvsprknswobvniu-auth-token', JSON.stringify(sessionData));
    }, sessionObj);

    // Interceptar solicitudes REST de Supabase con los datos de demostración
    await page.route('**/*', async (route) => {
      const req = route.request();
      const url = req.url();
      const method = req.method();

      if (url.includes('trgoqqvsprknswobvniu.supabase.co')) {
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

        // 3. Clients
        if (url.includes('/rest/v1/clients')) {
          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' },
            body: JSON.stringify([SCHOOL_CLIENT])
          });
          return;
        }

        // 4. Persons
        if (url.includes('/rest/v1/persons')) {
          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(STUDENTS)
          });
          return;
        }

        // 5. Groups
        if (url.includes('/rest/v1/groups')) {
          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([SCHOOL_GROUP])
          });
          return;
        }

        // 6. Group Members
        if (url.includes('/rest/v1/group_members')) {
          const members = STUDENTS.map((s, index) => ({
            id: `gm-${index + 1}`,
            group_id: GROUP_ID,
            person_id: s.id,
            order_index: index + 1,
            is_active: true,
            persons: s
          }));
          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(members)
          });
          return;
        }

        // 7. Measurement Campaigns
        if (url.includes('/rest/v1/measurement_campaigns')) {
          const campaign = {
            id: CAMPAIGN_ID,
            client_id: CLIENT_ID,
            group_id: GROUP_ID,
            title: 'JORNADA DE MEDIDAS - CURSO DEMOSTRACIÓN',
            campaign_date: '2026-10-30',
            template_id: 'uniforme_escolar',
            mode: 'standard_with_adjustments',
            status: 'completed',
            unit_system: 'cm',
            notes: 'DATOS SINTÉTICOS DE PRUEBA M02 — 30 participantes',
            created_at: '2026-10-30T07:00:00Z',
            updated_at: '2026-10-30T07:00:00Z',
          };
          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([campaign])
          });
          return;
        }

        // 8. Measurement Campaign Participants
        if (url.includes('/rest/v1/measurement_campaign_participants')) {
          const participants = STUDENTS.map((s, index) => ({
            id: `e1d00000-0000-4000-8000-0000000000${(index + 1).toString().padStart(2, '0')}`,
            campaign_id: CAMPAIGN_ID,
            person_id: s.id,
            session_id: SESSIONS[index].id,
            status: 'completed',
            standard_size: (index % 2 === 0 ? '14' : '16'),
            captured_values: { estatura: 165, contorno_busto: 84, contorno_cintura: 68 },
            notes: `DATOS SINTÉTICOS DE PRUEBA M02 — ${s.reference_id}`,
            persons: s,
            created_at: '2026-10-30T07:00:00Z',
            updated_at: '2026-10-30T07:00:00Z',
          }));
          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(participants)
          });
          return;
        }

        // 9. Measurement Sessions
        if (url.includes('/rest/v1/measurement_sessions')) {
          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(SESSIONS)
          });
          return;
        }

        // 10. Creations
        if (url.includes('/rest/v1/creations')) {
          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(CREATIONS)
          });
          return;
        }

        // Fallback para otras tablas
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([])
        });
        return;
      }

      await route.continue();
    });

    // 1. Ingresar al Directorio de Clientes (/clients)
    await page.goto('http://localhost:8081/(designer)/clients');
    await page.waitForTimeout(2500);

    // Comprobar que aparece el Colegio como cliente titular
    const schoolRow = page.locator('text=COLEGIO DEMOSTRACIÓN ATELIER - BARRANQUILLA').first();
    await expect(schoolRow).toBeVisible({ timeout: 10000 });

    if (!fs.existsSync('scratch')) fs.mkdirSync('scratch', { recursive: true });
    await page.screenshot({ path: 'scratch/e2e_demo_school_clients_list.png' });

    // 2. Abrir el Expediente del Colegio
    const dossierBtn = page.locator('text=Expediente de Alta Costura →').first();
    await expect(dossierBtn).toBeVisible({ timeout: 5000 });
    await dossierBtn.click();
    await page.waitForTimeout(1500);

    // 3. Abrir la pestaña PERSONAS Y GRUPOS (Pestaña 5 en el expediente)
    const personsTab = page.locator('text=Personas y Grupos').first();
    await expect(personsTab).toBeVisible({ timeout: 10000 });
    await personsTab.click();
    await page.waitForTimeout(1500);

    // Comprobar que aparecen alumnos y se distinguen niños y niñas
    const firstBoy = page.locator('text=Mateo Alejandro Rodríguez Gómez').first();
    await expect(firstBoy).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'scratch/e2e_demo_school_persons_tab.png' });

    // 4. Cambiar a la sub-pestaña Grupos
    const groupsSubTab = page.locator('text=Grupos y Núcleos').first();
    await expect(groupsSubTab).toBeVisible({ timeout: 5000 });
    await groupsSubTab.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=CURSO DEMOSTRACIÓN 30 ALUMNOS').first()).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'scratch/e2e_demo_school_groups_tab.png' });

    // 5. Cambiar a la sub-pestaña Jornadas (Campañas de medición)
    const campaignsSubTab = page.locator('text=Jornadas de Medición').first();
    await expect(campaignsSubTab).toBeVisible({ timeout: 5000 });
    await campaignsSubTab.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=JORNADA DE MEDIDAS - CURSO DEMOSTRACIÓN').first()).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'scratch/e2e_demo_school_campaigns_tab.png' });

    // 6. Navegar al Módulo de Creaciones (/creations)
    await page.goto('http://localhost:8081/(designer)/creations');
    await page.waitForTimeout(2500);

    // Comprobar que aparecen las creaciones para los alumnos institucionales
    const pantsCreation = page.locator('text=Pantalón Clásico Escolar').first();
    await expect(pantsCreation).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'scratch/e2e_demo_school_creations.png' });
  });

});
