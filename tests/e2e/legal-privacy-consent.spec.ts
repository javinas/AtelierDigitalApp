import { test, expect } from '@playwright/test';

test.describe('Privacidad, Legalidad, Registro (+18) y Transparencia IA', () => {
    test('Las 5 páginas legales son accesibles públicamente y muestran versión 1.0', async ({
        page,
    }) => {
        await page.goto('/terminos-condiciones');
        await expect(page.getByText('Términos y Condiciones de Uso').first()).toBeVisible();
        await expect(page.getByText('v1.0').first()).toBeVisible();

        await page.goto('/politica-privacidad');
        await expect(
            page.getByText('Política de Tratamiento de Datos Personales').first(),
        ).toBeVisible();
        await expect(page.getByText('Ley 1581 de 2012').first()).toBeVisible();

        await page.goto('/aviso-privacidad');
        await expect(page.getByText('Aviso de Privacidad').first()).toBeVisible();

        await page.goto('/politica-cookies');
        await expect(
            page.getByText('Política de Cookies y Almacenamiento Local').first(),
        ).toBeVisible();

        await page.goto('/ia-transparencia');
        await expect(
            page.getByText('Política de Transparencia en Inteligencia Artificial').first(),
        ).toBeVisible();
    });

    test('El formulario de registro exige mayoría de edad (+18), términos y privacidad sin premarcar opcionales', async ({
        page,
    }) => {
        await page.goto('/register');

        await expect(page.getByText('REGISTRO DE CLIENTA · +18 AÑOS')).toBeVisible();

        const ageCheckbox = page.getByTestId('checkbox-age-confirmation');
        const termsCheckbox = page.getByTestId('checkbox-terms-acceptance');
        const privacyCheckbox = page.getByTestId('checkbox-privacy-acceptance');
        const marketingCheckbox = page.getByTestId('checkbox-marketing-optin');

        await expect(ageCheckbox).toBeVisible();
        await expect(termsCheckbox).toBeVisible();
        await expect(privacyCheckbox).toBeVisible();
        await expect(marketingCheckbox).toBeVisible();

        // Llenar campos básicos pero sin marcar casillas legales
        await page.getByPlaceholder('Ej. María Fernanda Gómez').fill('Valeria Santo Domingo');
        await page.getByPlaceholder('su-correo@ejemplo.com').fill('valeria@ejemplo.com');
        await page.getByPlaceholder('Mínimo 6 caracteres').fill('Atelier2026!');
        await page.getByPlaceholder('Repita su contraseña').fill('Atelier2026!');

        // Intentar registrar sin mayoría de edad
        await page.getByText('Registrar Cuenta').click();
        await expect(
            page.getByText(/reservado a mayores de 18 años/i),
        ).toBeVisible();

        // Marcar mayoría de edad e intentar sin términos
        await ageCheckbox.click();
        await page.getByText('Registrar Cuenta').click();
        await expect(
            page.getByText(/aceptar los Términos y Condiciones de Uso/i),
        ).toBeVisible();

        // Marcar términos e intentar sin privacidad
        await termsCheckbox.click();
        await page.getByText('Registrar Cuenta').click();
        await expect(
            page.getByText(/autorizar el tratamiento de sus datos personales/i),
        ).toBeVisible();
    });

    test('El pie de página (Footer) y la Portada enlazan hacia los documentos legales', async ({
        page,
    }) => {
        await page.goto('/');
        await expect(page.getByText('LEGAL & TRANSPARENCIA')).toBeVisible();
        await expect(
            page.getByText('Confidencialidad artesanal e innovación responsable'),
        ).toBeVisible();
    });
});

