import { Platform } from 'react-native';

/**
 * Inyecta reglas CSS globales para navegadores web:
 * 1. Armoniza el autocompletado nativo (-webkit-autofill) con la paleta marfil/blanco cálido,
 *    eliminando el fondo azul estridente por defecto del navegador.
 * 2. Suprime el anillo azul genérico de foco (outline) en favor de los bordes oro champagne.
 * 3. Aplica suavizado tipográfico editorial (antialiasing).
 */
export function injectGlobalWebStyles() {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const styleId = 'atelier-editorial-web-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Armonización de autocompletado en navegadores web (evita el color azul genérico) */
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 1000px #FCFAF7 inset !important;
            -webkit-text-fill-color: #171411 !important;
            box-shadow: 0 0 0 1000px #FCFAF7 inset !important;
            caret-color: #171411 !important;
            font-family: inherit !important;
            transition: background-color 5000s ease-in-out 0s;
        }

        /* Reemplazo del outline azul nativo del navegador */
        input:focus, textarea:focus, select:focus {
            outline: none !important;
        }

        /* Suavizado de fuentes estilo editorial */
        html, body {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            background-color: #F8F2E9;
        }
    `;
    document.head.appendChild(style);
}
