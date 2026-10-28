// ==============================================================================
// ATELIER DIGITAL — SERVICIO COPILOTO DE IA (OPCIONAL Y DESACOPLADO) (M02.13)
// Archivo: src/services/aiCopilotService.ts
// ==============================================================================
// Interfaz de integración futura de IA consultiva de alta costura.
//
// REGLAS INNEGOCIABLES DE SEGURIDAD Y PRECISIÓN:
// 1. La IA NUNCA dibuja directamente la geometría ni ejecuta fórmulas arbitrarias.
// 2. La IA no inventa mediciones corporales.
// 3. Toda sugerencia genera una propuesta estructurada que REQUIERE aprobación manual
//    de la diseñadora Katherine Carroll antes de aplicarse a los parámetros del motor.
// 4. No expone claves privadas ni secretos en el cliente.
// 5. Si no hay proveedor externo configurado, opera en modo de asistencia local
//    basado en reglas o permanece desactivado con indicación transparente.
// ==============================================================================

import { GarmentDesignParameters } from '../types/pattern/ease';
import { GarmentType } from '../types/pattern/pattern';

export interface AICopilotStatus {
    isConfigured: boolean;
    providerName: string;
    modelName: string;
    description: string;
}

export interface AIPatternSuggestion {
    suggestedGarmentType?: GarmentType;
    suggestedParameters: Partial<GarmentDesignParameters>;
    rationaleSpanish: string;
    confidenceScore: number;
    missingMeasurementsWarnings: string[];
}

export class AICopilotService {
    /**
     * Verifica de forma segura si existe un proveedor de IA configurado en el backend.
     * En este MVP, permanece en modo asistido local seguro para proteger secretos.
     */
    static getStatus(): AICopilotStatus {
        return {
            isConfigured: false,
            providerName: 'Asistente Consultivo Local de Taller',
            modelName: 'Reglas de Estilo de Alta Costura Atelier Digital v1.0',
            description:
                'Modo consultivo determinístico activo. El proveedor de IA generativa externa no está vinculado a claves públicas para garantizar la seguridad.',
        };
    }

    /**
     * Interpreta una descripción de prenda en lenguaje natural y propone
     * parámetros estructurados para aprobación de la diseñadora.
     */
    static async interpretGarmentPrompt(
        prompt: string,
        currentGarmentType: GarmentType
    ): Promise<AIPatternSuggestion> {
        const text = prompt.toLowerCase();
        const suggestedParams: Partial<GarmentDesignParameters> = {};
        const missingWarnings: string[] = [];
        let rationale = '';

        // Análisis heurístico controlado (sin riesgo de alucinación geométrica)
        if (text.includes('línea a') || text.includes('linea a') || text.includes('vuelo') || text.includes('evasé')) {
            suggestedParams.skirt_silhouette = 'a_line';
            suggestedParams.skirt_flare_per_side_mm = text.includes('mucho vuelo') ? 90 : 60;
            rationale += 'Se propone silueta Línea A con compensación de caída. ';
        } else if (text.includes('recta') || text.includes('lápiz') || text.includes('tubo')) {
            suggestedParams.skirt_silhouette = 'straight';
            rationale += 'Se propone silueta Recta clásica. ';
        }

        if (text.includes('midi') || text.includes('bajo la rodilla')) {
            suggestedParams.skirt_length_mm = 750;
            rationale += 'Largo configurado a formato Midi (750 mm). ';
        } else if (text.includes('largo') || text.includes('maxi') || text.includes('fiesta')) {
            suggestedParams.skirt_length_mm = 1050;
            rationale += 'Largo configurado a formato Maxi de fiesta (1050 mm). ';
        } else if (text.includes('corta') || text.includes('mini')) {
            suggestedParams.skirt_length_mm = 450;
            rationale += 'Largo configurado a formato Corto (450 mm). ';
        }

        if (text.includes('manga corta')) {
            suggestedParams.sleeve_length_mm = 240;
            rationale += 'Largo de manga adaptado a corta (240 mm). ';
        } else if (text.includes('manga tres cuartos') || text.includes('francesa')) {
            suggestedParams.sleeve_length_mm = 420;
            rationale += 'Manga tipo francesa (420 mm). ';
        }

        if (text.includes('escote v') || text.includes('escote en v')) {
            suggestedParams.neckline_drop_mm = 80;
            suggestedParams.neckline_style = 'v_neck';
            rationale += 'Profundidad de escote en V de 80 mm. ';
        }

        if (!rationale) {
            rationale =
                'La descripción no alteró parámetros estándar de patronaje. Se conservan los valores base del atelier.';
        }

        return {
            suggestedGarmentType: currentGarmentType,
            suggestedParameters: suggestedParams,
            rationaleSpanish: rationale.trim(),
            confidenceScore: 0.95,
            missingMeasurementsWarnings: missingWarnings,
        };
    }

    /**
     * Traduce las advertencias matemáticas del motor en explicaciones
     * claras en español con recomendaciones de ajuste de taller.
     */
    static explainEngineWarnings(warnings: string[]): string[] {
        return warnings.map((w) => {
            if (w.includes('Embebido de copa ajustado')) {
                return `Explicación Técnica: La curva superior de la manga es casi igual al contorno de la sisa. En alta costura, se necesitan entre 20 y 30 mm de embebido para que el hombro tenga caída redonda natural sin arrugas.`;
            }
            if (w.includes('Embebido de copa elevado')) {
                return `Explicación Técnica: La cabeza de la manga tiene demasiado volumen para esta sisa. Si la tela no tiene flexibilidad, formará frunces no deseados al montar la copa.`;
            }
            if (w.includes('Diferencia en costados')) {
                return `Explicación Técnica: Las longitudes de costado delantero y espalda difieren. Antes de cortar, verifique si la diferencia se debe a la curvatura de busto o si requiere emparejar los piquetes de cadera.`;
            }
            return `Aviso del Motor: ${w}`;
        });
    }
}
