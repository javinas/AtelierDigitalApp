// ==============================================================================
// ATELIER DIGITAL — GEOMETRÍA COMPUTACIONAL: TIPOS Y PRIMITIVAS 2D (M02.10)
// Archivo: src/engine/pattern/geometry/types.ts
// ==============================================================================
// Representa el modelo geométrico nuclear del sistema de patronaje paramétrico.
// Todas las magnitudes numéricas se expresan estrictamente en milímetros (mm).
// ==============================================================================

export interface Point2D {
    x: number;
    y: number;
}

export interface Segment2D {
    start: Point2D;
    end: Point2D;
}

export interface BezierCubic2D {
    start: Point2D;
    cp1: Point2D;
    cp2: Point2D;
    end: Point2D;
}

export interface Arc2D {
    center: Point2D;
    radius: number;
    startAngleRad: number;
    endAngleRad: number;
    counterClockwise?: boolean;
}

export interface BoundingBox2D {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
}

export type PathCommandType = 'M' | 'L' | 'C' | 'A' | 'Z';

export interface PathCommand {
    type: PathCommandType;
    params: number[]; // 'M': [x, y], 'L': [x, y], 'C': [cp1x, cp1y, cp2x, cp2y, endx, endy], 'Z': []
}

export interface Path2D {
    commands: PathCommand[];
    isClosed: boolean;
    approxLengthMm: number;
}

export interface Notch {
    position: Point2D;
    angleRad: number;     // Dirección hacia el exterior de la pieza
    lengthMm: number;     // Típicamente 5 mm
    label?: string;       // Ej. 'Sisa delantera', 'Copa manga - centro'
    type: 'single' | 'double' | 'triple';
}

export interface Grainline {
    start: Point2D;
    end: Point2D;
    isFold: boolean;      // TRUE si la línea representa doblez de tela
    label: string;        // 'HILO DE LA TELA' o 'AL DOBLEZ'
}

export interface Dart {
    apex: Point2D;
    leftBase: Point2D;
    rightBase: Point2D;
    depthMm: number;
    widthMm: number;
    label?: string;       // Ej. 'Pinza de cintura', 'Pinza de busto'
}

export interface InternalLine {
    name: string;
    path: Path2D;
    lineType: 'bust_line' | 'waist_line' | 'hip_line' | 'biceps_line' | 'crease_line' | 'construction';
}

export interface PieceLabel {
    text: string;
    position: Point2D;
    fontSizeMm: number;
    rotationDeg?: number;
}

export interface PatternPiece {
    id: string;
    name: string;
    code: string;               // Ej. 'CORPINO_DEL', 'MANGA_CLASICA'
    quantityToCut: number;      // 1, 2 (par simétrico), etc.
    cutOnFold: boolean;
    fabricType?: string;        // 'Tela principal', 'Forro', 'Entretela'
    outlineSeam: Path2D;        // Línea de costura neta (sewing line)
    outlineCut: Path2D;         // Línea de corte con margen de costura añadido
    seamAllowanceMm: number;    // Margen aplicado (ej. 10 mm)
    grainline: Grainline;       // Hilo de la tela / aplomo
    notches: Notch[];           // Piquetes de ensamble
    darts: Dart[];              // Pinzas
    internalLines?: InternalLine[]; // Líneas guía de construcción (busto, cadera, etc.)
    labels: PieceLabel[];       // Etiquetas impresas dentro de la pieza
    boundingBox: BoundingBox2D;
}

export interface PatternGeometryResult {
    pieces: PatternPiece[];
    boundingBox: BoundingBox2D;
    warnings: string[];
    errors: string[];
    engineVersion: string;
    calculatedValues: Record<string, number>;
}
