import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Módulo 02 — Regresión de Contratos, Catálogo CAD & Seguridad (Zero Write)', () => {

  test('C01: Integridad ontológica de las 21 prendas CAD (10 base + 11 extendidas)', () => {
    const rootDir = process.cwd();
    const patternTypesPath = path.join(rootDir, 'src/types/pattern/pattern.ts');
    const packagesPath = path.join(rootDir, 'src/engine/pattern/catalog/garmentPackages.ts');
    const imagesGridPath = path.join(rootDir, 'src/components/pattern/GarmentSelectionGrid.tsx');

    const typesContent = fs.readFileSync(patternTypesPath, 'utf8');
    const packagesContent = fs.readFileSync(packagesPath, 'utf8');
    const imagesGridContent = fs.readFileSync(imagesGridPath, 'utf8');

    const expected21Garments = [
      'bodice', 'sleeve', 'skirt', 'pants', 'dress', 'blouse', 'shirt', 'corset', 'jacket', 'coat',
      'shirt_dress', 'tailored_vest', 'short', 'cargo_pants', 'trench_coat', 'atelier_robe',
      'evening_gown', 'bridal_gown', 'draped_asymmetric_dress', 'bomber_jacket', 'denim_couture_jacket'
    ];

    expect(expected21Garments).toHaveLength(21);

    // 1. Verificar cada tipo en pattern.ts
    for (const g of expected21Garments) {
      expect(typesContent).toContain(`'${g}'`);
      expect(packagesContent).toContain(`${g}:`);
      expect(imagesGridContent).toContain(`${g}: require(`);

      // Comprobar presencia de la fotografía editorial en assets/garments/
      const imgPath = path.join(rootDir, `assets/garments/${g}.jpg`);
      expect(fs.existsSync(imgPath)).toBe(true);
    }
  });

  test('C02: Preservación de estados oficiales de ejecuciones de patronaje', () => {
    const rootDir = process.cwd();
    const typesContent = fs.readFileSync(path.join(rootDir, 'src/types/pattern/pattern.ts'), 'utf8');

    const expectedStatuses = [
      'draft',
      'generated',
      'needs_revision',
      'pending_fitting',
      'approved_by_designer'
    ];

    for (const s of expectedStatuses) {
      expect(typesContent).toContain(`'${s}'`);
    }
  });

  test('C03: Contratos de validación de fotografías y Storage (5 MB, JPG/PNG/WebP)', () => {
    const rootDir = process.cwd();
    const clientServiceContent = fs.readFileSync(path.join(rootDir, 'src/services/clientService.ts'), 'utf8');

    expect(clientServiceContent).toContain("const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];");
    expect(clientServiceContent).toContain('const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;');
    expect(clientServiceContent).toContain("from('client-photos')");
    expect(clientServiceContent).toContain("createSignedUrl(storagePath, 60 * 60 * 24 * 7)");
    expect(clientServiceContent).toContain("createSignedUrls(pathsToSign, 60 * 60 * 24)");
  });

  test('C04: Contrato de servicios de Personas, Grupos y Jornadas de medición', () => {
    const rootDir = process.cwd();
    const personServiceContent = fs.readFileSync(path.join(rootDir, 'src/services/personGroupService.ts'), 'utf8');
    const campaignServiceContent = fs.readFileSync(path.join(rootDir, 'src/services/measurementCampaignService.ts'), 'utf8');
    const creationServiceContent = fs.readFileSync(path.join(rootDir, 'src/services/creationService.ts'), 'utf8');

    // Nombres canónicos de tablas en Supabase
    expect(personServiceContent).toContain(".from('persons')");
    expect(personServiceContent).toContain(".from('groups')");
    expect(personServiceContent).toContain(".from('group_members')");
    expect(campaignServiceContent).toContain(".from('measurement_campaigns')");
    expect(campaignServiceContent).toContain(".from('measurement_campaign_participants')");

    // Enriquecimiento de person_id en creaciones
    expect(creationServiceContent).toContain("person_id: dto.person_id || null");
    expect(creationServiceContent).toContain(".from('creations')");
  });

  test('C05: Inmutabilidad de datos históricos de sesiones de medidas', () => {
    const rootDir = process.cwd();
    const migrationContent = fs.readFileSync(
      path.join(rootDir, 'supabase/migrations/20261014210000_modulo02_measurements_patterns.sql'),
      'utf8'
    );

    // Trigger de protección
    expect(migrationContent).toContain('protect_measurement_session_immutability');
    expect(migrationContent).toContain("NEW.taken_by IS DISTINCT FROM OLD.taken_by");
    expect(migrationContent).toContain("NEW.client_id IS DISTINCT FROM OLD.client_id");
  });

});

