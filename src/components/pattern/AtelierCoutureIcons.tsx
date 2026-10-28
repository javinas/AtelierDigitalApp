// ==============================================================================
// ATELIER DIGITAL — ICONOGRAFÍA VECTORIAL DE ALTA COSTURA (LUCIDE STYLE)
// Archivo: src/components/pattern/AtelierCoutureIcons.tsx
// ==============================================================================
// Iconos vectoriales de línea consistentes, trazo 1.5px, paleta oro champagne
// y bronce neutro, acordes a la identidad editorial de Atelier de Autor.
// ==============================================================================

import React from 'react';

export interface CoutureIconProps {
    size?: number;
    color?: string;
    strokeWidth?: number;
    style?: React.CSSProperties;
}

const DEFAULT_COLOR = '#A78350';
const DEFAULT_SIZE = 16;
const DEFAULT_STROKE = 1.5;

/** 1. Cinta Métrica / Regla Anatómica (Medidas Principales del Cuerpo) */
export const IconBodyRuler: React.FC<CoutureIconProps> = ({
    size = DEFAULT_SIZE,
    color = DEFAULT_COLOR,
    strokeWidth = DEFAULT_STROKE,
    style,
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
    >
        <path d="M21.3 8.7 8.7 21.3a2.12 2.12 0 0 1-3 0l-3-3a2.12 2.12 0 0 1 0-3L15.3 2.7a2.12 2.12 0 0 1 3 0l3 3a2.12 2.12 0 0 1 0 3Z" />
        <path d="m7.5 10.5 2 2" />
        <path d="m10.5 7.5 2 2" />
        <path d="m13.5 4.5 2 2" />
        <path d="m4.5 13.5 2 2" />
    </svg>
);

/** 2. Busto y Tórax (Maniquí / Línea de Busto) */
export const IconBust: React.FC<CoutureIconProps> = ({
    size = DEFAULT_SIZE,
    color = DEFAULT_COLOR,
    strokeWidth = DEFAULT_STROKE,
    style,
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
    >
        {/* Silueta de busto / torso de sastre */}
        <path d="M9 3h6v3H9z" />
        <path d="M6 8.5C6 7 7.5 6 9 6h6c1.5 0 3 1 3 2.5 0 2.5-1 4.5-2 6-.8 1.2-1 2.5-1 4.5h-6c0-2-.2-3.3-1-4.5-1-1.5-2-3.5-2-6Z" />
        <path d="M7 11h10" strokeDasharray="1.5 1.5" />
        <circle cx="12" cy="11" r="1" fill={color} />
    </svg>
);

/** 3. Espalda y Hombros / Cuello */
export const IconBackShoulders: React.FC<CoutureIconProps> = ({
    size = DEFAULT_SIZE,
    color = DEFAULT_COLOR,
    strokeWidth = DEFAULT_STROKE,
    style,
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
    >
        <path d="M16 3H8l-4 4 2 12h12l2-12-4-4Z" />
        <path d="M12 3v16" strokeDasharray="2 2" />
        <path d="M6 10h12" />
        <path d="M4 7l8 3 8-3" />
    </svg>
);

/** 4. Cintura y Cadera (Curvatura de Talle Reloj de Arena) */
export const IconWaistHip: React.FC<CoutureIconProps> = ({
    size = DEFAULT_SIZE,
    color = DEFAULT_COLOR,
    strokeWidth = DEFAULT_STROKE,
    style,
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
    >
        <path d="M7 3c2 3 2 5 0 9 2 4 4 6 5 9 1-3 3-5 5-9-2-4-2-6 0-9" />
        <path d="M7.5 10h9" strokeDasharray="2 1.5" />
        <path d="M5.5 16h13" strokeDasharray="2 1.5" />
    </svg>
);

/** 5. Brazos y Manga */
export const IconArmsSleeve: React.FC<CoutureIconProps> = ({
    size = DEFAULT_SIZE,
    color = DEFAULT_COLOR,
    strokeWidth = DEFAULT_STROKE,
    style,
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
    >
        <path d="M16 3c-1.5 0-3 1.2-4 3L8 14c-.6 1.2-.2 2.7 1 3.3l2 1c1.2.6 2.7.2 3.3-1l4-8c.8-1.5.5-3.3-.3-4.5L16 3Z" />
        <path d="m8 15 4 2" />
        <path d="M12 7l4 2" strokeDasharray="1.5 1.5" />
    </svg>
);

/** 6. Inferior y Largos (Pantalón / Caída de Pierna) */
export const IconLowerLengths: React.FC<CoutureIconProps> = ({
    size = DEFAULT_SIZE,
    color = DEFAULT_COLOR,
    strokeWidth = DEFAULT_STROKE,
    style,
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
    >
        <path d="M6 3h12v3l-2 15h-3l-1-10-1 10H8L6 6V3Z" />
        <path d="M6 6h12" />
        <path d="M12 9v12" strokeDasharray="2 2" />
    </svg>
);

/** 7. Medidas de Diseño (Prenda de Autor / Silueta de Chaqueta o Vestido) */
export const IconGarmentDesign: React.FC<CoutureIconProps> = ({
    size = DEFAULT_SIZE,
    color = DEFAULT_COLOR,
    strokeWidth = DEFAULT_STROKE,
    style,
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
    >
        <path d="M8 3h8l4 6-3 3-2-1v10H9V11l-2 1-3-3 4-6Z" />
        <path d="M12 3v8" />
        <path d="m10 7 2 2 2-2" />
    </svg>
);

/** 8. Parámetros de Taller (Tijeras Sastre y Escuadra de Patronaje) */
export const IconWorkshopParams: React.FC<CoutureIconProps> = ({
    size = DEFAULT_SIZE,
    color = DEFAULT_COLOR,
    strokeWidth = DEFAULT_STROKE,
    style,
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
    >
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M20 4 8.7 15.3" />
        <path d="M8.7 8.7 20 20" />
        <path d="M14.5 14.5 17 12" />
    </svg>
);

/** 9. Diamante Editorial de Alta Costura */
export const IconSparkle: React.FC<CoutureIconProps> = ({
    size = DEFAULT_SIZE,
    color = DEFAULT_COLOR,
    strokeWidth = DEFAULT_STROKE,
    style,
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
    >
        <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />
    </svg>
);

/** 10. Información y Guía Visual */
export const IconInfoGuide: React.FC<CoutureIconProps> = ({
    size = DEFAULT_SIZE,
    color = DEFAULT_COLOR,
    strokeWidth = DEFAULT_STROKE,
    style,
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
    >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
    </svg>
);

/**
 * Selector de icono por id de categoría o grupo
 */
export const getCategoryCoutureIcon = (categoryId: string, props?: CoutureIconProps) => {
    switch (categoryId) {
        case 'bust_torso':
        case 'bust':
            return <IconBust {...props} />;
        case 'back_shoulders':
        case 'back_neck':
        case 'back':
            return <IconBackShoulders {...props} />;
        case 'waist_hip':
        case 'waist':
        case 'hip':
            return <IconWaistHip {...props} />;
        case 'arms_sleeves':
        case 'arms':
            return <IconArmsSleeve {...props} />;
        case 'lower_lengths':
        case 'lower':
        case 'legs_lower':
            return <IconLowerLengths {...props} />;
        case 'garment_design':
        case 'design':
            return <IconGarmentDesign {...props} />;
        case 'workshop_params':
        case 'workshop':
            return <IconWorkshopParams {...props} />;
        case 'all':
        default:
            return <IconBodyRuler {...props} />;
    }
};
