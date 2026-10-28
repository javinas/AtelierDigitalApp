// ==============================================================================
// ATELIER DIGITAL — VISOR VECTORIAL 2D DE PATRONAJE & MESA CAD (M02.12 / C13)
// Archivo: src/components/pattern/PatternPreviewCanvas.tsx
// ==============================================================================
// Motor de visualización CAD interactivo con zoom centrado en cursor,
// desplazamiento multidireccional fluido (pan), soporte multitáctil (pinch-to-zoom),
// filtros por pieza y grupo (Delantero / Espalda), y alternador de capas de corte.
// ==============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { pathToSvgD, roundTo } from '../../engine/pattern/geometry/geometry2d';
import { PatternGeometryResult, PatternPiece } from '../../engine/pattern/geometry/types';

interface PatternPreviewCanvasProps {
    geometry: PatternGeometryResult;
    title?: string;
    compareGeometry?: PatternGeometryResult;
    onPieceSelect?: (pieceId: string) => void;
    fullHeight?: boolean;
    headerRightAction?: React.ReactNode;
}

export function PatternPreviewCanvas({
    geometry,
    title = 'Vista Previa del Patrón Paramétrico',
    compareGeometry,
    onPieceSelect,
    fullHeight = false,
    headerRightAction,
}: PatternPreviewCanvasProps) {
    const { width: windowWidth } = useWindowDimensions();
    const isMobile = windowWidth < 680;

    // Estados de filtrado y visualización de piezas
    const [selectedPieceId, setSelectedPieceId] = useState<string>('all');
    const [groupFilter, setGroupFilter] = useState<'all' | 'front' | 'back'>('all');
    const [comparisonMode, setComparisonMode] = useState<'both' | 'adjusted' | 'original'>('both');

    // Capas activas del plano CAD
    const [showCutLine, setShowCutLine] = useState<boolean>(true);
    const [showSeamLine, setShowSeamLine] = useState<boolean>(true);
    const [showGrainline, setShowGrainline] = useState<boolean>(true);
    const [showNotches, setShowNotches] = useState<boolean>(true);
    const [showLabels, setShowLabels] = useState<boolean>(true);
    const [showCalibration, setShowCalibration] = useState<boolean>(true);

    // Estados de Zoom y Pan (Desplazamiento)
    const [zoom, setZoom] = useState<number>(1.0);
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isPanToolActive, setIsPanToolActive] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
    const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

    // Referencias para eventos del DOM (Web) sin stale closures
    const containerRef = useRef<any>(null);
    const viewStateRef = useRef<{ zoom: number; panX: number; panY: number }>({
        zoom: 1.0,
        panX: 0,
        panY: 0,
    });

    const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
    const lastPinchDist = useRef<number | null>(null);
    const lastPinchCenter = useRef<{ x: number; y: number } | null>(null);
    const dragStartPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const dragStartPan = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const lastTapTime = useRef<number>(0);

    // Sincronizar referencia del estado de visualización
    useEffect(() => {
        viewStateRef.current = { zoom, panX: pan.x, panY: pan.y };
    }, [zoom, pan]);

    // Piezas según modo de comparación (Fitting C13)
    const effectivePieces = useMemo(() => {
        if (comparisonMode === 'original' && compareGeometry) {
            return compareGeometry.pieces;
        }
        return geometry.pieces;
    }, [comparisonMode, compareGeometry, geometry.pieces]);

    // Clasificación de piezas Delantero / Espalda para filtros rápidos
    const frontPieces = useMemo(() => {
        return effectivePieces.filter((p) => {
            const txt = `${p.name} ${p.code} ${p.id}`.toLowerCase();
            return txt.includes('delantero') || txt.includes('del') || txt.includes('front');
        });
    }, [effectivePieces]);

    const backPieces = useMemo(() => {
        return effectivePieces.filter((p) => {
            const txt = `${p.name} ${p.code} ${p.id}`.toLowerCase();
            return txt.includes('espalda') || txt.includes('esp') || txt.includes('back') || txt.includes('posterior');
        });
    }, [effectivePieces]);

    // Piezas a renderizar según filtro activo
    const piecesToRender = useMemo(() => {
        if (selectedPieceId !== 'all') {
            return effectivePieces.filter((p) => p.id === selectedPieceId);
        }
        if (groupFilter === 'front') return frontPieces.length > 0 ? frontPieces : effectivePieces;
        if (groupFilter === 'back') return backPieces.length > 0 ? backPieces : effectivePieces;
        return effectivePieces;
    }, [effectivePieces, selectedPieceId, groupFilter, frontPieces, backPieces]);

    const comparePiecesToRender = useMemo(() => {
        if (!compareGeometry || comparisonMode !== 'both') return [];
        if (selectedPieceId !== 'all') {
            return compareGeometry.pieces.filter((p) => p.id === selectedPieceId);
        }
        if (groupFilter === 'front') {
            return compareGeometry.pieces.filter((p) => {
                const txt = `${p.name} ${p.code} ${p.id}`.toLowerCase();
                return txt.includes('delantero') || txt.includes('del') || txt.includes('front');
            });
        }
        if (groupFilter === 'back') {
            return compareGeometry.pieces.filter((p) => {
                const txt = `${p.name} ${p.code} ${p.id}`.toLowerCase();
                return txt.includes('espalda') || txt.includes('esp') || txt.includes('back') || txt.includes('posterior');
            });
        }
        return compareGeometry.pieces;
    }, [compareGeometry, comparisonMode, selectedPieceId, groupFilter]);

    // Bounding Box del patrón completo o de la selección activa
    const bBox = useMemo(() => {
        if (!geometry || !geometry.boundingBox) {
            return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
        }
        if (comparisonMode === 'both' && compareGeometry && compareGeometry.boundingBox) {
            return {
                minX: Math.min(geometry.boundingBox.minX, compareGeometry.boundingBox.minX),
                minY: Math.min(geometry.boundingBox.minY, compareGeometry.boundingBox.minY),
                maxX: Math.max(geometry.boundingBox.maxX, compareGeometry.boundingBox.maxX),
                maxY: Math.max(geometry.boundingBox.maxY, compareGeometry.boundingBox.maxY),
                width:
                    Math.max(geometry.boundingBox.maxX, compareGeometry.boundingBox.maxX) -
                    Math.min(geometry.boundingBox.minX, compareGeometry.boundingBox.minX),
                height:
                    Math.max(geometry.boundingBox.maxY, compareGeometry.boundingBox.maxY) -
                    Math.min(geometry.boundingBox.minY, compareGeometry.boundingBox.minY),
            };
        }
        if (comparisonMode === 'original' && compareGeometry && compareGeometry.boundingBox) {
            return compareGeometry.boundingBox;
        }
        return geometry.boundingBox;
    }, [comparisonMode, compareGeometry, geometry]);

    // Bounding Box dinámico enfocado en las piezas activas
    const activeBBox = useMemo(() => {
        if (piecesToRender.length === 1 && piecesToRender[0].boundingBox) {
            return piecesToRender[0].boundingBox;
        }
        if (piecesToRender.length > 1 && piecesToRender.length < effectivePieces.length) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of piecesToRender) {
                if (p.boundingBox) {
                    minX = Math.min(minX, p.boundingBox.minX);
                    minY = Math.min(minY, p.boundingBox.minY);
                    maxX = Math.max(maxX, p.boundingBox.maxX);
                    maxY = Math.max(maxY, p.boundingBox.maxY);
                }
            }
            if (Number.isFinite(minX) && Number.isFinite(maxX)) {
                return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
            }
        }
        return bBox;
    }, [piecesToRender, effectivePieces.length, bBox]);

    const paddingMm = 35;
    const calibMarginTop = showCalibration ? 130 : 0;
    const viewWidth = Math.max((activeBBox?.width || 600) + paddingMm * 2, 320);
    const viewHeight = Math.max((activeBBox?.height || 500) + paddingMm * 2 + calibMarginTop, 320);
    const viewMinX = (activeBBox?.minX ?? 0) - paddingMm;
    const viewMinY = (activeBBox?.minY ?? 0) - paddingMm - calibMarginTop;

    // Límites de seguridad desahogados para permitir recorrer libremente cualquier zona tras el zoom
    const clampPan = useCallback((x: number, y: number, z: number) => {
        const domEl = containerRef.current;
        const w = domEl?.clientWidth || 800;
        const h = domEl?.clientHeight || 600;
        const spanX = Math.max(w * z * 2.0, w * 3);
        const spanY = Math.max(h * z * 2.0, h * 3);
        return {
            x: Math.min(spanX, Math.max(-spanX, x)),
            y: Math.min(spanY, Math.max(-spanY, y)),
        };
    }, []);

    // Función matemática canónica de zoom centrado en punto (clientX, clientY)
    const applyZoomAtPoint = useCallback((factor: number, clientX: number, clientY: number) => {
        const { zoom: curZoom, panX: curPanX, panY: curPanY } = viewStateRef.current;
        const newZoom = Math.min(6.0, Math.max(0.2, curZoom * factor));
        if (Math.abs(newZoom - curZoom) < 0.001) return;

        // Fórmula de invarianza de punto de interés:
        // (cursor - pan_nuevo) / zoom_nuevo = (cursor - pan_actual) / zoom_actual
        const newPanX = clientX - (clientX - curPanX) * (newZoom / curZoom);
        const newPanY = clientY - (clientY - curPanY) * (newZoom / curZoom);

        const clamped = clampPan(newPanX, newPanY, newZoom);
        viewStateRef.current = { zoom: newZoom, panX: clamped.x, panY: clamped.y };
        setZoom(newZoom);
        setPan({ x: clamped.x, y: clamped.y });
    }, [clampPan]);

    // Acciones de Zoom desde botones
    const handleZoomIn = useCallback(() => {
        const domEl = containerRef.current;
        const cx = domEl ? domEl.clientWidth / 2 : 400;
        const cy = domEl ? domEl.clientHeight / 2 : 300;
        applyZoomAtPoint(1.25, cx, cy);
    }, [applyZoomAtPoint]);

    const handleZoomOut = useCallback(() => {
        const domEl = containerRef.current;
        const cx = domEl ? domEl.clientWidth / 2 : 400;
        const cy = domEl ? domEl.clientHeight / 2 : 300;
        applyZoomAtPoint(1 / 1.25, cx, cy);
    }, [applyZoomAtPoint]);

    // Botón «Ajustar a Pantalla»: encuadra todas las piezas en el contenedor a escala 100% y centrado
    const handleFitToScreen = useCallback(() => {
        viewStateRef.current = { zoom: 1.0, panX: 0, panY: 0 };
        setZoom(1.0);
        setPan({ x: 0, y: 0 });
    }, []);

    // Botón «Centrar»: reposiciona el patrón en el centro del viewport conservando el nivel de zoom actual
    const handleCenterReset = useCallback(() => {
        const domEl = containerRef.current;
        const w = domEl?.clientWidth || 800;
        const h = domEl?.clientHeight || 600;
        const curZoom = viewStateRef.current.zoom;
        const newPanX = (w * (1 - curZoom)) / 2;
        const newPanY = (h * (1 - curZoom)) / 2;
        const clamped = clampPan(newPanX, newPanY, curZoom);
        viewStateRef.current = { zoom: curZoom, panX: clamped.x, panY: clamped.y };
        setPan({ x: clamped.x, y: clamped.y });
    }, [clampPan]);

    // Desplazamiento por teclado (flechas)
    const panBy = useCallback((dx: number, dy: number) => {
        const { zoom: curZoom, panX: curPanX, panY: curPanY } = viewStateRef.current;
        const newX = curPanX + dx;
        const newY = curPanY + dy;
        const clamped = clampPan(newX, newY, curZoom);
        viewStateRef.current = { zoom: curZoom, panX: clamped.x, panY: clamped.y };
        setPan({ x: clamped.x, y: clamped.y });
    }, [clampPan]);

    // Doble clic / doble toque: acerca la zona seleccionada o restaura la vista
    const handleDoubleClick = useCallback((e: any) => {
        const domEl = containerRef.current;
        if (!domEl) return;
        const rect = domEl.getBoundingClientRect();
        const cursorX = (e.clientX ?? (rect.left + rect.width / 2)) - rect.left;
        const cursorY = (e.clientY ?? (rect.top + rect.height / 2)) - rect.top;

        if (viewStateRef.current.zoom < 1.7) {
            // Ampliar con foco en el punto clicado
            const targetZoom = 2.4;
            const curZoom = viewStateRef.current.zoom;
            const curPanX = viewStateRef.current.panX;
            const curPanY = viewStateRef.current.panY;
            const newPanX = cursorX - (cursorX - curPanX) * (targetZoom / curZoom);
            const newPanY = cursorY - (cursorY - curPanY) * (targetZoom / curZoom);
            const clamped = clampPan(newPanX, newPanY, targetZoom);

            viewStateRef.current = { zoom: targetZoom, panX: clamped.x, panY: clamped.y };
            setZoom(targetZoom);
            setPan({ x: clamped.x, y: clamped.y });
        } else {
            // Segundo doble clic: volver a la vista completa
            handleFitToScreen();
        }
    }, [clampPan, handleFitToScreen]);

    // Gestión de eventos de rueda del ratón (Wheel) con listener nativo no pasivo
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const domEl = containerRef.current;
        if (!domEl) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = domEl.getBoundingClientRect();
            const cursorX = e.clientX - rect.left;
            const cursorY = e.clientY - rect.top;
            const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
            applyZoomAtPoint(factor, cursorX, cursorY);
        };

        domEl.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            domEl.removeEventListener('wheel', onWheel);
        };
    }, [applyZoomAtPoint]);

    // Gestión de teclado: Espacio para arrastre, + / - para zoom, 0 para ajustar, flechas
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const onKeyDown = (e: KeyboardEvent) => {
            // Ignorar si el usuario está escribiendo en un input
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;

            if (e.key === 'Escape') {
                setIsFullScreen(false);
            } else if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                setIsSpacePressed(true);
            } else if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                handleZoomIn();
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                handleZoomOut();
            } else if (e.key === '0') {
                e.preventDefault();
                handleFitToScreen();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                panBy(50, 0);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                panBy(-50, 0);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                panBy(0, 50);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                panBy(0, -50);
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsSpacePressed(false);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [handleZoomIn, handleZoomOut, handleFitToScreen, panBy]);

    // ==============================================================================
    // POINTER EVENTS — ARRASTRE CON RATÓN Y GESTOS MULTITÁCTILES (TABLETS)
    // ==============================================================================
    const handlePointerDown = (e: any) => {
        if (Platform.OS !== 'web') return;
        const domEl = containerRef.current;
        if (!domEl) return;

        if (domEl.setPointerCapture) {
            try {
                domEl.setPointerCapture(e.pointerId);
            } catch (_) {}
        }

        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // Detección de doble toque táctil
        if (e.pointerType === 'touch') {
            const now = Date.now();
            if (now - lastTapTime.current < 320) {
                handleDoubleClick(e);
                lastTapTime.current = 0;
                return;
            }
            lastTapTime.current = now;
        }

        if (activePointers.current.size === 1) {
            // Inicio de arrastre (1 cursor o 1 dedo)
            setIsDragging(true);
            dragStartPointer.current = { x: e.clientX, y: e.clientY };
            dragStartPan.current = { x: viewStateRef.current.panX, y: viewStateRef.current.panY };
        } else if (activePointers.current.size === 2) {
            // Inicio de pellizco multitáctil (pinch-to-zoom) con 2 dedos
            setIsDragging(false);
            const pts = Array.from(activePointers.current.values());
            lastPinchDist.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            const rect = domEl.getBoundingClientRect();
            lastPinchCenter.current = {
                x: (pts[0].x + pts[1].x) / 2 - rect.left,
                y: (pts[0].y + pts[1].y) / 2 - rect.top,
            };
        }
    };

    const handlePointerMove = (e: any) => {
        if (Platform.OS !== 'web') return;
        if (!activePointers.current.has(e.pointerId)) return;
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        const domEl = containerRef.current;
        if (!domEl) return;

        if (activePointers.current.size === 2) {
            // Gestión de pellizco con 2 dedos (Pinch-to-zoom & 2-finger Pan)
            const pts = Array.from(activePointers.current.values());
            const newDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            const rect = domEl.getBoundingClientRect();
            const newCenter = {
                x: (pts[0].x + pts[1].x) / 2 - rect.left,
                y: (pts[0].y + pts[1].y) / 2 - rect.top,
            };

            if (lastPinchDist.current && lastPinchDist.current > 0 && lastPinchCenter.current) {
                const factor = newDist / lastPinchDist.current;
                const deltaX = newCenter.x - lastPinchCenter.current.x;
                const deltaY = newCenter.y - lastPinchCenter.current.y;

                const { zoom: curZoom, panX: curPanX, panY: curPanY } = viewStateRef.current;
                const newZoom = Math.min(6.0, Math.max(0.2, curZoom * factor));

                const newPanX = newCenter.x - (newCenter.x - (curPanX + deltaX)) * (newZoom / curZoom);
                const newPanY = newCenter.y - (newCenter.y - (curPanY + deltaY)) * (newZoom / curZoom);
                const clamped = clampPan(newPanX, newPanY, newZoom);

                viewStateRef.current = { zoom: newZoom, panX: clamped.x, panY: clamped.y };
                setZoom(newZoom);
                setPan({ x: clamped.x, y: clamped.y });
            }

            lastPinchDist.current = newDist;
            lastPinchCenter.current = newCenter;
        } else if (activePointers.current.size === 1 && isDragging) {
            // Desplazamiento por arrastre con 1 puntero
            const dx = e.clientX - dragStartPointer.current.x;
            const dy = e.clientY - dragStartPointer.current.y;

            const newPanX = dragStartPan.current.x + dx;
            const newPanY = dragStartPan.current.y + dy;
            const clamped = clampPan(newPanX, newPanY, viewStateRef.current.zoom);

            viewStateRef.current.panX = clamped.x;
            viewStateRef.current.panY = clamped.y;
            setPan({ x: clamped.x, y: clamped.y });
        }
    };

    const handlePointerUp = (e: any) => {
        if (Platform.OS !== 'web') return;
        activePointers.current.delete(e.pointerId);

        if (activePointers.current.size === 0) {
            setIsDragging(false);
            lastPinchDist.current = null;
            lastPinchCenter.current = null;
        } else if (activePointers.current.size === 1) {
            // Transición suave de 2 dedos a 1 dedo
            const remaining = Array.from(activePointers.current.values())[0];
            setIsDragging(true);
            dragStartPointer.current = { x: remaining.x, y: remaining.y };
            dragStartPan.current = { x: viewStateRef.current.panX, y: viewStateRef.current.panY };
            lastPinchDist.current = null;
            lastPinchCenter.current = null;
        }
    };

    // Generar el SVG en línea con las entidades vectoriales
    const renderSvgContent = () => {
        return (
            <svg
                width="100%"
                height="100%"
                viewBox={`${viewMinX} ${viewMinY} ${viewWidth} ${viewHeight}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ width: '100%', height: '100%', display: 'block' }}
            >
                <defs>
                    <marker
                        id="preview-arrow"
                        viewBox="0 0 10 10"
                        refX="5"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                    >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#171411" />
                    </marker>
                    {/* Cuadrícula milimétrica sutil de alta costura */}
                    <pattern id="grid-pattern-cad" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#EAE2D5" strokeWidth="0.5" />
                    </pattern>
                </defs>

                {/* Fondo de lienzo Atelier */}
                <rect
                    x={viewMinX - 800}
                    y={viewMinY - 800}
                    width={viewWidth + 1600}
                    height={viewHeight + 1600}
                    fill="#FAF7F2"
                />
                <rect
                    x={viewMinX - 800}
                    y={viewMinY - 800}
                    width={viewWidth + 1600}
                    height={viewHeight + 1600}
                    fill="url(#grid-pattern-cad)"
                />

                {/* Cuadrado de calibración obligatorio de 100 x 100 mm */}
                {showCalibration && (
                    <g id="preview-calibration" transform={`translate(${viewMinX + 30}, ${viewMinY + 15})`}>
                        <rect x="0" y="0" width="100" height="100" fill="#FFFFFF" stroke="#171411" strokeWidth="1.2" />
                        <line x1="0" y1="50" x2="100" y2="50" stroke="#E6D9C8" strokeWidth="0.8" />
                        <line x1="50" y1="0" x2="50" y2="100" stroke="#E6D9C8" strokeWidth="0.8" />
                        <circle cx="50" cy="50" r="3" fill="#A78350" />
                        <text
                            x="50"
                            y="44"
                            textAnchor="middle"
                            fontFamily="Montserrat, sans-serif"
                            fontSize="8"
                            fontWeight="bold"
                            fill="#171411"
                        >
                            CALIBRACIÓN
                        </text>
                        <text
                            x="50"
                            y="58"
                            textAnchor="middle"
                            fontFamily="Montserrat, sans-serif"
                            fontSize="8"
                            fontWeight="600"
                            fill="#A78350"
                        >
                            100 × 100 mm
                        </text>
                        <text
                            x="50"
                            y="72"
                            textAnchor="middle"
                            fontFamily="Montserrat, sans-serif"
                            fontSize="6"
                            fill="#766B62"
                        >
                            Escala 1:1 física
                        </text>
                    </g>
                )}

                {/* Comparación Fitting (C13): Geometría Original Base Superpuesta */}
                {comparePiecesToRender.map((piece) => (
                    <g key={`orig-${piece.id}`} id={`orig-${piece.id}`} opacity="0.65">
                        {showCutLine && (
                            <path
                                d={pathToSvgD(piece.outlineCut)}
                                fill="none"
                                stroke="#8C7A6B"
                                strokeWidth="1.5"
                                strokeDasharray="6 4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        )}
                        {showSeamLine && (
                            <path
                                d={pathToSvgD(piece.outlineSeam)}
                                fill="none"
                                stroke="#B89B72"
                                strokeWidth="1.0"
                                strokeDasharray="4 3"
                            />
                        )}
                    </g>
                ))}

                {/* Renderizar cada pieza geométrica verificada */}
                {piecesToRender.map((piece) => {
                    const isSelected = selectedPieceId === piece.id;
                    return (
                        <g
                            key={piece.id}
                            id={piece.id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                                if (onPieceSelect) onPieceSelect(piece.id);
                            }}
                        >
                            {/* Línea de corte con margen */}
                            {showCutLine && (
                                <path
                                    d={pathToSvgD(piece.outlineCut)}
                                    fill={isSelected ? '#FFFDF8' : '#FFFFFF'}
                                    fillOpacity={compareGeometry && comparisonMode === 'both' ? '0.40' : '0.88'}
                                    stroke={isSelected ? '#A78350' : '#171411'}
                                    strokeWidth={isSelected ? '2.2' : '1.5'}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            )}

                            {/* Línea de costura neta */}
                            {showSeamLine && (
                                <path
                                    d={pathToSvgD(piece.outlineSeam)}
                                    fill="none"
                                    stroke="#A78350"
                                    strokeWidth="1.0"
                                    strokeDasharray="5 3"
                                />
                            )}

                            {/* Pinzas */}
                            {piece.darts.map((dart, dIdx) => (
                                <g key={`dart-${dIdx}`}>
                                    <line
                                        x1={dart.leftBase.x}
                                        y1={dart.leftBase.y}
                                        x2={dart.apex.x}
                                        y2={dart.apex.y}
                                        stroke="#766B62"
                                        strokeWidth="0.8"
                                        strokeDasharray="3 2"
                                    />
                                    <line
                                        x1={dart.rightBase.x}
                                        y1={dart.rightBase.y}
                                        x2={dart.apex.x}
                                        y2={dart.apex.y}
                                        stroke="#766B62"
                                        strokeWidth="0.8"
                                        strokeDasharray="3 2"
                                    />
                                    <circle cx={dart.apex.x} cy={dart.apex.y} r="2" fill="#766B62" />
                                </g>
                            ))}

                            {/* Piquetes de ensamble */}
                            {showNotches &&
                                piece.notches.map((notch, nIdx) => {
                                    const nx2 = notch.position.x + Math.cos(notch.angleRad) * notch.lengthMm;
                                    const ny2 = notch.position.y + Math.sin(notch.angleRad) * notch.lengthMm;
                                    return (
                                        <line
                                            key={`notch-${nIdx}`}
                                            x1={notch.position.x}
                                            y1={notch.position.y}
                                            x2={nx2}
                                            y2={ny2}
                                            stroke="#9E3B3B"
                                            strokeWidth="2.0"
                                            strokeLinecap="square"
                                        />
                                    );
                                })}

                            {/* Hilo de la tela / aplomo */}
                            {showGrainline && (
                                <g>
                                    <line
                                        x1={piece.grainline.start.x}
                                        y1={piece.grainline.start.y}
                                        x2={piece.grainline.end.x}
                                        y2={piece.grainline.end.y}
                                        stroke="#171411"
                                        strokeWidth="1.2"
                                        markerStart="url(#preview-arrow)"
                                        markerEnd="url(#preview-arrow)"
                                    />
                                    <text
                                        x={(piece.grainline.start.x + piece.grainline.end.x) / 2 + 8}
                                        y={(piece.grainline.start.y + piece.grainline.end.y) / 2}
                                        fill="#171411"
                                        fontSize="8"
                                        fontFamily="Montserrat, sans-serif"
                                        fontWeight="600"
                                        letterSpacing="1"
                                        transform={`rotate(90, ${(piece.grainline.start.x + piece.grainline.end.x) / 2 + 8}, ${(piece.grainline.start.y + piece.grainline.end.y) / 2})`}
                                    >
                                        {piece.grainline.label}
                                    </text>
                                </g>
                            )}

                            {/* Rótulos y metadatos de corte */}
                            {showLabels &&
                                piece.labels.map((lbl, lIdx) => (
                                    <text
                                        key={`label-${lIdx}`}
                                        x={lbl.position.x}
                                        y={lbl.position.y}
                                        fontFamily="Montserrat, sans-serif"
                                        fontSize={lIdx === 0 ? 11 : 8}
                                        fontWeight={lIdx === 0 ? 'bold' : 'normal'}
                                        fill={lIdx === 0 ? '#171411' : '#766B62'}
                                    >
                                        {lbl.text}
                                    </text>
                                ))}
                        </g>
                    );
                })}
            </svg>
        );
    };

    return (
        <View
            style={[
                styles.container,
                fullHeight && styles.containerFullHeight,
                isFullScreen && styles.containerFullScreen,
            ]}
        >
            {/* Barra superior compacta y profesional: Filtros de Pieza + Controles CAD */}
            <View style={styles.topBar}>
                {/* Selector Unificado de Piezas y Grupos */}
                <View style={styles.filterSection}>
                    <TouchableOpacity
                        style={[
                            styles.filterPill,
                            selectedPieceId === 'all' && groupFilter === 'all' && styles.filterPillActive,
                        ]}
                        onPress={() => {
                            setSelectedPieceId('all');
                            setGroupFilter('all');
                            handleFitToScreen();
                        }}
                    >
                        <Text
                            style={[
                                styles.filterPillText,
                                selectedPieceId === 'all' && groupFilter === 'all' && styles.filterPillTextActive,
                            ]}
                        >
                            Todas ({geometry.pieces.length})
                        </Text>
                    </TouchableOpacity>

                    {/* Filtros rápidos por grupo Delantero / Espalda */}
                    {frontPieces.length > 0 && (
                        <TouchableOpacity
                            style={[
                                styles.filterPill,
                                selectedPieceId === 'all' && groupFilter === 'front' && styles.filterPillActive,
                            ]}
                            onPress={() => {
                                setSelectedPieceId('all');
                                setGroupFilter('front');
                                handleFitToScreen();
                            }}
                        >
                            <Text
                                style={[
                                    styles.filterPillText,
                                    selectedPieceId === 'all' && groupFilter === 'front' && styles.filterPillTextActive,
                                ]}
                            >
                                Delantero ({frontPieces.length})
                            </Text>
                        </TouchableOpacity>
                    )}

                    {backPieces.length > 0 && (
                        <TouchableOpacity
                            style={[
                                styles.filterPill,
                                selectedPieceId === 'all' && groupFilter === 'back' && styles.filterPillActive,
                            ]}
                            onPress={() => {
                                setSelectedPieceId('all');
                                setGroupFilter('back');
                                handleFitToScreen();
                            }}
                        >
                            <Text
                                style={[
                                    styles.filterPillText,
                                    selectedPieceId === 'all' && groupFilter === 'back' && styles.filterPillTextActive,
                                ]}
                            >
                                Espalda ({backPieces.length})
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Selector de piezas individuales */}
                    {geometry.pieces.map((p) => {
                        const isThisSelected = selectedPieceId === p.id;
                        return (
                            <TouchableOpacity
                                key={p.id}
                                style={[styles.filterPill, isThisSelected && styles.filterPillActive]}
                                onPress={() => {
                                    setSelectedPieceId(isThisSelected ? 'all' : p.id);
                                    if (onPieceSelect && !isThisSelected) onPieceSelect(p.id);
                                }}
                            >
                                <Text style={[styles.filterPillText, isThisSelected && styles.filterPillTextActive]}>
                                    {p.name.replace('Vestido — ', '').replace('Falda ', '').replace('Corpiño ', '')}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Controles de Zoom, Vista y Pantalla Completa */}
                <View style={styles.zoomControls}>
                    <TouchableOpacity
                        style={styles.zoomBtn}
                        onPress={handleZoomOut}
                        accessibilityLabel="Reducir (−)"
                        activeOpacity={0.8}
                    >
                        <Text style={styles.zoomBtnText}>−</Text>
                    </TouchableOpacity>

                    <View style={styles.zoomBadgeBox}>
                        <Text style={styles.zoomLevelText}>{Math.round(zoom * 100)}%</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.zoomBtn}
                        onPress={handleZoomIn}
                        accessibilityLabel="Ampliar (+)"
                        activeOpacity={0.8}
                    >
                        <Text style={styles.zoomBtnText}>+</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.zoomFitBtn}
                        onPress={handleFitToScreen}
                        accessibilityLabel="Ajustar a pantalla completa"
                        activeOpacity={0.8}
                    >
                        <Text style={styles.zoomFitBtnText}>⛶ Ajustar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.zoomResetBtn}
                        onPress={handleCenterReset}
                        accessibilityLabel="Centrar y volver a escala 100%"
                        activeOpacity={0.8}
                    >
                        <Text style={styles.zoomResetText}>✛ Centrar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.panToolBtn, (isPanToolActive || isSpacePressed) && styles.panToolBtnActive]}
                        onPress={() => setIsPanToolActive(!isPanToolActive)}
                        accessibilityLabel="Herramienta de Arrastre / Mano táctil"
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.panToolBtnText,
                                (isPanToolActive || isSpacePressed) && styles.panToolBtnTextActive,
                            ]}
                        >
                            ✋ Mover
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.fullScreenBtn, isFullScreen && styles.fullScreenBtnActive]}
                        onPress={() => setIsFullScreen(!isFullScreen)}
                        accessibilityLabel={isFullScreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.fullScreenBtnText, isFullScreen && styles.fullScreenBtnTextActive]}>
                            {isFullScreen ? '🗗 Salir' : '⛶ Pantalla Completa'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Barra de Modo de Comparación (Fitting C13) */}
            {compareGeometry && (
                <View style={styles.comparisonModeBar}>
                    <Text style={styles.comparisonModeLabel}>COMPARACIÓN FITTING:</Text>
                    <View style={styles.comparisonPills}>
                        <TouchableOpacity
                            style={[styles.compPill, comparisonMode === 'original' && styles.compPillActive]}
                            onPress={() => setComparisonMode('original')}
                        >
                            <Text style={[styles.compPillText, comparisonMode === 'original' && styles.compPillTextActive]}>
                                Original (Base)
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.compPill, comparisonMode === 'adjusted' && styles.compPillActive]}
                            onPress={() => setComparisonMode('adjusted')}
                        >
                            <Text style={[styles.compPillText, comparisonMode === 'adjusted' && styles.compPillTextActive]}>
                                Ajustado (Fitting)
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.compPill, comparisonMode === 'both' && styles.compPillActive]}
                            onPress={() => setComparisonMode('both')}
                        >
                            <Text style={[styles.compPillText, comparisonMode === 'both' && styles.compPillTextActive]}>
                                Superponer Ambos
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {comparisonMode === 'both' && (
                        <View style={styles.comparisonLegend}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendLine, { borderColor: '#8C7A6B', borderStyle: 'dashed' }]} />
                                <Text style={styles.legendText}>Original (Base)</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendLine, { backgroundColor: '#171411', borderStyle: 'solid' }]} />
                                <Text style={styles.legendText}>Ajustado</Text>
                            </View>
                        </View>
                    )}
                </View>
            )}

            {/* Alternador de capas visibles del plano de corte + Acción derecha (Imprimir) */}
            <View style={styles.layersBar}>
                <View style={styles.layerChipsRow}>
                    {[
                        { label: 'Corte (Margen)', state: showCutLine, toggle: () => setShowCutLine(!showCutLine), color: '#171411' },
                        { label: 'Costura Neta', state: showSeamLine, toggle: () => setShowSeamLine(!showSeamLine), color: '#A78350' },
                        { label: 'Hilo de Tela', state: showGrainline, toggle: () => setShowGrainline(!showGrainline), color: '#171411' },
                        { label: 'Piquetes', state: showNotches, toggle: () => setShowNotches(!showNotches), color: '#9E3B3B' },
                        { label: 'Rótulos', state: showLabels, toggle: () => setShowLabels(!showLabels), color: '#766B62' },
                        { label: 'Calibración (100 mm)', state: showCalibration, toggle: () => setShowCalibration(!showCalibration), color: '#A78350' },
                    ].map((layer) => (
                        <TouchableOpacity
                            key={layer.label}
                            style={[styles.layerChip, layer.state && styles.layerChipActive]}
                            onPress={layer.toggle}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.layerIndicator, { backgroundColor: layer.color }]} />
                            <Text style={[styles.layerChipText, layer.state && styles.layerChipTextActive]}>
                                {layer.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {headerRightAction && (
                    <View style={styles.layerRightAction}>
                        {headerRightAction}
                    </View>
                )}
            </View>

            {/* Lienzo CAD Interactivo con Transformación por Hardware y HUDs Flotantes */}
            <View style={[styles.canvasArea, (fullHeight || isFullScreen) && styles.canvasAreaFullHeight]}>
                {Platform.OS === 'web' ? (
                    <div
                        ref={containerRef}
                        style={{
                            width: '100%',
                            height: '100%',
                            minHeight: (fullHeight || isFullScreen) ? '100%' : '520px',
                            backgroundColor: '#FAF7F2',
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: isDragging ? 'grabbing' : (isSpacePressed || isPanToolActive) ? 'grab' : 'default',
                            touchAction: 'none',
                            userSelect: 'none',
                        }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        onDoubleClick={handleDoubleClick}
                    >
                        {/* Capa de Dibujo Vectorial con Transformación Fluida */}
                        <div
                            style={{
                                width: '100%',
                                height: '100%',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                transformOrigin: '0 0',
                                willChange: 'transform',
                                transition: isDragging ? 'none' : 'transform 0.08s ease-out',
                            }}
                        >
                            {renderSvgContent()}
                        </div>

                        {/* HUD Flotante Izquierdo: Métricas Dimensionales en Vivo */}
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 12,
                                left: 12,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                backgroundColor: 'rgba(255, 254, 250, 0.94)',
                                padding: '6px 12px',
                                borderRadius: 8,
                                border: '1px solid #E6D9C8',
                                boxShadow: '0 4px 12px rgba(23, 20, 17, 0.10)',
                                pointerEvents: 'auto',
                                zIndex: 10,
                            }}
                        >
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#171411' }}>
                                📐 {roundTo(bBox.width)} × {roundTo(bBox.height)} mm
                            </span>
                            <span style={{ fontSize: 10, color: '#8A8275' }}>·</span>
                            <span style={{ fontSize: 10, color: '#766B62' }}>
                                {selectedPieceId === 'all'
                                    ? `${geometry.pieces.length} piezas`
                                    : effectivePieces.find((p) => p.id === selectedPieceId)?.name || selectedPieceId}
                            </span>
                            <span style={{ fontSize: 10, color: '#8A8275' }}>·</span>
                            <span style={{ fontSize: 10, color: '#A78350', fontWeight: 600 }}>
                                Motor {geometry.engineVersion}
                            </span>
                        </div>

                        {/* HUD Flotante Derecho: Nivel de Zoom y Ayuda Ergonómica */}
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 12,
                                right: 12,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: 'rgba(255, 254, 250, 0.94)',
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: '1px solid #E6D9C8',
                                boxShadow: '0 4px 12px rgba(23, 20, 17, 0.12)',
                                pointerEvents: 'auto',
                                zIndex: 10,
                            }}
                        >
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#A78350' }}>
                                {Math.round(zoom * 100)}%
                            </span>
                            <span style={{ fontSize: 10, color: '#8A8275' }}>·</span>
                            <span style={{ fontSize: 10, color: '#6A6255' }}>
                                {isMobile ? 'Pellizcar 2 dedos · Arrastrar' : 'Rueda ratón · Arrastre · Doble clic · Espacio'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <View style={styles.nativeFallback}>
                        <Text style={styles.nativeFallbackText}>
                            Visualización vectorial CAD optimizada para Web / Tablet.
                        </Text>
                    </View>
                )}
            </View>

            {/* Barra inferior de estado métrico y verificación dimensional (oculta en modo fullHeight) */}
            {!fullHeight && !isFullScreen && (
                <View style={styles.footerInfo}>
                    <View style={styles.footerLeft}>
                        <Text style={styles.footerDimensionText}>
                            📐 Envergadura: {roundTo(bBox.width)} × {roundTo(bBox.height)} mm ({geometry.pieces.length} piezas geométricas)
                        </Text>
                        <Text style={styles.footerPieceStatus}>
                            {selectedPieceId === 'all'
                                ? groupFilter === 'all'
                                    ? 'Mostrando todas las piezas'
                                    : `Filtro: ${groupFilter === 'front' ? 'Delantero' : 'Espalda'}`
                                : `Pieza: ${effectivePieces.find((p) => p.id === selectedPieceId)?.name || selectedPieceId}`}
                        </Text>
                    </View>
                    <Text style={styles.footerEngineVersion}>Motor Paramétrico {geometry.engineVersion}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        marginBottom: 16,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 16px rgba(23, 20, 17, 0.06)',
            },
            default: {
                elevation: 2,
            },
        }),
    },
    containerFullHeight: {
        flex: 1,
        height: '100%',
        minHeight: 450,
        marginBottom: 0,
    },
    containerFullScreen: {
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw' as any,
        height: '100vh' as any,
        zIndex: 99999,
        borderRadius: 0,
        borderWidth: 0,
        margin: 0,
    },
    topBar: {
        backgroundColor: '#F8F2E9',
        borderBottomWidth: 1,
        borderBottomColor: '#E6D9C8',
        paddingHorizontal: 10,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flexWrap: 'wrap',
        flex: 1,
        minWidth: 240,
    },
    filterPill: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 9,
        paddingVertical: 4.5,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#E0D4C2',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    filterPillActive: {
        backgroundColor: '#171411',
        borderColor: '#171411',
    },
    filterPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#5C5446',
    },
    filterPillTextActive: {
        color: '#FAF7F2',
    },
    zoomControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flexWrap: 'wrap',
    },
    zoomBtn: {
        width: 28,
        height: 28,
        backgroundColor: '#FFFFFF',
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#D8CBB6',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    zoomBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#171411',
        lineHeight: 16,
    },
    zoomBadgeBox: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#D8CBB6',
        minWidth: 48,
        alignItems: 'center',
    },
    zoomLevelText: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#8A6A4A',
    },
    zoomFitBtn: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#D8CBB6',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    zoomFitBtnText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#4A4234',
    },
    zoomResetBtn: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#D8CBB6',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    zoomResetText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#4A4234',
    },
    panToolBtn: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#D8CBB6',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    panToolBtnActive: {
        backgroundColor: '#FAF2E2',
        borderColor: '#A78350',
    },
    panToolBtnText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#5C5243',
    },
    panToolBtnTextActive: {
        color: '#8A6A4A',
        fontWeight: '800',
    },
    fullScreenBtn: {
        backgroundColor: '#FAF5EA',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#C5A059',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    fullScreenBtnActive: {
        backgroundColor: '#A78350',
        borderColor: '#8A6A4A',
    },
    fullScreenBtnText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#8A6A4A',
    },
    fullScreenBtnTextActive: {
        color: '#FFFFFF',
    },
    comparisonModeBar: {
        backgroundColor: '#FAF5EA',
        paddingHorizontal: 10,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E6D9C8',
    },
    comparisonModeLabel: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.8,
        color: '#8A6A4A',
    },
    comparisonPills: {
        flexDirection: 'row',
        gap: 5,
    },
    compPill: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 3.5,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#DFD3BF',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    compPillActive: {
        backgroundColor: '#A78350',
        borderColor: '#8A6A4A',
    },
    compPillText: {
        fontSize: 9.5,
        fontWeight: '600',
        color: '#594F42',
    },
    compPillTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    comparisonLegend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginLeft: 'auto',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    legendLine: {
        width: 16,
        height: 2,
    },
    legendText: {
        fontSize: 9,
        color: '#766B62',
    },
    layersBar: {
        backgroundColor: '#FAF9F6',
        paddingHorizontal: 10,
        paddingVertical: 5,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#EBE2D3',
    },
    layerChipsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 5,
    },
    layerRightAction: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    layerChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 7,
        paddingVertical: 3.5,
        borderRadius: 4,
        backgroundColor: '#F0ECE1',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    layerChipActive: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D8CBB6',
    },
    layerIndicator: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    layerChipText: {
        fontSize: 9.5,
        color: '#8E8576',
        fontWeight: '600',
    },
    layerChipTextActive: {
        color: '#171411',
        fontWeight: '700',
    },
    canvasArea: {
        width: '100%',
        height: 580,
        minHeight: 520,
        backgroundColor: '#FAF7F2',
        position: 'relative',
        overflow: 'hidden',
    },
    canvasAreaFullHeight: {
        flex: 1,
        height: '100%',
        minHeight: 380,
    },
    footerInfo: {
        backgroundColor: '#FAF7F2',
        borderTopWidth: 1,
        borderTopColor: '#E6D9C8',
        paddingHorizontal: 12,
        paddingVertical: 7,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    footerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
    },
    footerDimensionText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#171411',
    },
    footerPieceStatus: {
        fontSize: 10.5,
        color: '#766B62',
    },
    footerEngineVersion: {
        fontSize: 10,
        fontWeight: '600',
        color: '#A78350',
    },
    nativeFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    nativeFallbackText: {
        fontSize: 13,
        color: '#766B62',
    },
});
