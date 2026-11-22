// ==============================================================================
// ATELIER DIGITAL — VISUALIZADOR 3D INTERACTIVO (BY KATHERINE CARROLL)
// Archivo: src/components/mannequin3d/Mannequin3DViewer.tsx
// ==============================================================================
// Componente de visualización tridimensional con rotación 360°, presets de cámara
// de taller y renderizado bajo demanda (ahorro de batería y 0% GPU en reposo).
// ==============================================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import * as THREE from 'three';
import {
    CameraViewAngle,
    CAMERA_PRESETS,
    DEFAULT_FEMALE_MEASUREMENTS,
    Mannequin3DMeasurements,
    Mannequin3DViewerProps,
    RenderPerformanceStats,
} from './types';
import { buildParametricMannequin, BuiltMannequinStructure } from './mannequinMeshBuilder';

export const Mannequin3DViewer: React.FC<Mannequin3DViewerProps> = ({
    measurements = DEFAULT_FEMALE_MEASUREMENTS,
    showPedestal = true,
    showTapeLines = true,
    selectedMeasure = null,
    onSelectMeasure,
    width = '100%',
    height = 520,
    initialAngle = 'front',
    onRenderStats,
}) => {
    const containerRef = useRef<any>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Referencias Three.js
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const mannequinRef = useRef<BuiltMannequinStructure | null>(null);
    const animFrameRef = useRef<number | null>(null);

    // Estado orbital de cámara (rotación esférica)
    const cameraStateRef = useRef({
        azimuth: 0,           // Rotación horizontal (theta)
        polar: Math.PI / 2,   // Elevación vertical (phi)
        distance: 3.2,        // Zoom / distancia
        targetY: 0.15,        // Centro focal (tórax/cintura)
        isDragging: false,
        lastX: 0,
        lastY: 0,
        needsRender: true,
    });

    const [activeAngle, setActiveAngle] = useState<CameraViewAngle>(initialAngle);
    const [isSceneReady, setIsSceneReady] = useState(false);

    // Métricas en vivo
    const statsRef = useRef<RenderPerformanceStats>({
        fps: 60,
        trianglesCount: 0,
        geometriesCount: 0,
        deformationTimeMs: 0,
        lastRenderDurationMs: 0,
    });

    const mergedMeasurements: Mannequin3DMeasurements = {
        ...DEFAULT_FEMALE_MEASUREMENTS,
        ...measurements,
    };

    // -------------------------------------------------------------------------
    // RENDERIZADOR BAJO DEMANDA (ON-DEMAND RENDERING)
    // -------------------------------------------------------------------------
    const requestRender = useCallback(() => {
        cameraStateRef.current.needsRender = true;
        if (!animFrameRef.current) {
            animFrameRef.current = requestAnimationFrame(renderFrame);
        }
    }, []);

    const renderFrame = useCallback(() => {
        animFrameRef.current = null;
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        const camera = cameraRef.current;
        const state = cameraStateRef.current;

        if (!renderer || !scene || !camera) return;

        const t0 = performance?.now ? performance.now() : Date.now();

        // 1. Actualizar posición de la cámara esférica
        const x = state.distance * Math.sin(state.polar) * Math.sin(state.azimuth);
        const y = state.targetY + state.distance * Math.cos(state.polar);
        const z = state.distance * Math.sin(state.polar) * Math.cos(state.azimuth);

        camera.position.set(x, y, z);
        camera.lookAt(0, state.targetY, 0);

        // 2. Renderizar escena Three.js
        renderer.render(scene, camera);

        const renderTime = (performance?.now ? performance.now() : Date.now()) - t0;
        statsRef.current.lastRenderDurationMs = Math.round(renderTime * 100) / 100;
        statsRef.current.fps = renderTime > 0 ? Math.min(60, Math.round(1000 / Math.max(16.6, renderTime))) : 60;

        if (onRenderStats) {
            onRenderStats({ ...statsRef.current });
        }

        // Si se sigue arrastrando, encadenar el siguiente frame
        if (state.isDragging) {
            animFrameRef.current = requestAnimationFrame(renderFrame);
        }
    }, [onRenderStats]);

    // -------------------------------------------------------------------------
    // CAMBIO DE ÁNGULO PRESET (FRONTAL, LATERAL, POSTERIOR)
    // -------------------------------------------------------------------------
    const applyCameraPreset = (presetId: CameraViewAngle) => {
        const preset = CAMERA_PRESETS.find((p) => p.id === presetId);
        if (!preset) return;

        setActiveAngle(presetId);
        cameraStateRef.current.azimuth = preset.azimuthAngle;
        cameraStateRef.current.polar = preset.polarAngle;
        cameraStateRef.current.distance = preset.distance;
        requestRender();
    };

    // -------------------------------------------------------------------------
    // INICIALIZACIÓN DE LA ESCENA THREE.JS
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (Platform.OS !== 'web') {
            setIsSceneReady(true);
            return;
        }

        const container = containerRef.current;
        if (!container) return;

        const w = container.clientWidth || 480;
        const h = container.clientHeight || 520;

        // 1. Crear Escena con estética de alta costura
        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#FAF7F2'); // Marfil suave de atelier
        sceneRef.current = scene;

        // 2. Cámara de Perspectiva
        const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 50);
        cameraRef.current = camera;

        // 3. Renderer WebGL con antialiasing y sombras suaves
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
        });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        rendererRef.current = renderer;

        // Limpiar contenedor previo e insertar canvas
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        canvasRef.current = renderer.domElement;

        // 4. Iluminación de Estudio de Alta Costura
        // A. Luz ambiental cálida difusa
        const ambientLight = new THREE.AmbientLight('#FFF8F0', 0.85);
        scene.add(ambientLight);

        // B. Luz principal de modelado (Key light en 45°)
        const keyLight = new THREE.DirectionalLight('#FFF3E0', 1.35);
        keyLight.position.set(2.5, 4.0, 3.5);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.bias = -0.0005;
        scene.add(keyLight);

        // C. Luz de relleno lateral suave (Fill light)
        const fillLight = new THREE.DirectionalLight('#E6ECF5', 0.65);
        fillLight.position.set(-3.0, 2.0, -1.5);
        scene.add(fillLight);

        // D. Luz de recorte de silueta (Rim light superior dorada)
        const rimLight = new THREE.DirectionalLight('#C5A880', 0.95);
        rimLight.position.set(0, 3.5, -3.0);
        scene.add(rimLight);

        // E. Plano sutil de sombra en el suelo
        const shadowPlaneGeo = new THREE.PlaneGeometry(3, 3);
        const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.18 });
        const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = -1.21;
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);

        // 5. Construir y agregar Maniquí
        const mannequin = buildParametricMannequin(mergedMeasurements, {
            showPedestal,
            showTapeLines,
        });
        mannequinRef.current = mannequin;
        scene.add(mannequin.group);

        // Contabilizar geometrías
        statsRef.current.trianglesCount = (mannequin.torsoMesh.geometry.index?.count || 0) / 3;
        statsRef.current.geometriesCount = 5;

        // 6. Aplicar ángulo inicial
        const initialPreset = CAMERA_PRESETS.find((p) => p.id === initialAngle) || CAMERA_PRESETS[0];
        cameraStateRef.current.azimuth = initialPreset.azimuthAngle;
        cameraStateRef.current.polar = initialPreset.polarAngle;
        cameraStateRef.current.distance = initialPreset.distance;

        setIsSceneReady(true);
        requestRender();

        // 7. Redimensionamiento responsivo
        const handleResize = () => {
            if (!container || !camera || !renderer) return;
            const newW = container.clientWidth || w;
            const newH = container.clientHeight || h;
            camera.aspect = newW / newH;
            camera.updateProjectionMatrix();
            renderer.setSize(newW, newH);
            requestRender();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            mannequin.dispose();
            renderer.dispose();
        };
    }, []);

    // -------------------------------------------------------------------------
    // ACTUALIZACIÓN DINÁMICA DE MEDIDAS (DEFORMACIÓN EN TIEMPO REAL)
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!mannequinRef.current) return;
        const t0 = performance?.now ? performance.now() : Date.now();

        mannequinRef.current.updateMeasurements(mergedMeasurements);

        const defTime = (performance?.now ? performance.now() : Date.now()) - t0;
        statsRef.current.deformationTimeMs = Math.round(defTime * 100) / 100;
        requestRender();
    }, [
        mergedMeasurements.estatura,
        mergedMeasurements.talle,
        mergedMeasurements.busto,
        mergedMeasurements.cintura,
        mergedMeasurements.cadera,
        mergedMeasurements.espalda,
        requestRender,
    ]);

    // -------------------------------------------------------------------------
    // GESTOS ORBITALES DE ROTACIÓN TÁCTIL Y MOUSE (WEB & RESPONSIVE)
    // -------------------------------------------------------------------------
    const handlePointerDown = (e: any) => {
        const state = cameraStateRef.current;
        state.isDragging = true;
        state.lastX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
        state.lastY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
        requestRender();
    };

    const handlePointerMove = (e: any) => {
        const state = cameraStateRef.current;
        if (!state.isDragging) return;

        const currentX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
        const currentY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;

        const deltaX = currentX - state.lastX;
        const deltaY = currentY - state.lastY;

        state.lastX = currentX;
        state.lastY = currentY;

        // Sensibilidad suave de rotación 360°
        state.azimuth -= deltaX * 0.0085;
        state.polar = Math.max(0.25, Math.min(Math.PI - 0.25, state.polar - deltaY * 0.006));

        requestRender();
    };

    const handlePointerUp = () => {
        cameraStateRef.current.isDragging = false;
        requestRender();
    };

    const handleWheel = (e: any) => {
        const state = cameraStateRef.current;
        // Zoom acotado entre 1.8 y 5.0 metros
        state.distance = Math.max(1.8, Math.min(5.0, state.distance + e.deltaY * 0.003));
        requestRender();
    };

    return (
        <View style={[styles.wrapper, { height }]}>
            {/* 1. LIENZO THREE.JS WEBGL */}
            {Platform.OS === 'web' ? (
                <div
                    ref={containerRef}
                    style={{
                        width: '100%',
                        height: '100%',
                        cursor: cameraStateRef.current.isDragging ? 'grabbing' : 'grab',
                        userSelect: 'none',
                        touchAction: 'none',
                    }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onWheel={handleWheel}
                />
            ) : (
                <View style={styles.mobileFallbackContainer}>
                    <Text style={styles.mobileFallbackTitle}>✦ Vista 3D Nativa</Text>
                    <Text style={styles.mobileFallbackSubtitle}>
                        Three.js inicializado en WebGL. Rotación 360° disponible en entorno web/tablet.
                    </Text>
                </View>
            )}

            {/* 2. BARRA DE BOTONES DE CÁMARA RÁPIDA (ALTA COSTURA) */}
            <View style={styles.cameraControlsBar}>
                {CAMERA_PRESETS.map((preset) => {
                    const isSelected = activeAngle === preset.id;
                    return (
                        <TouchableOpacity
                            key={preset.id}
                            style={[styles.cameraButton, isSelected && styles.cameraButtonActive]}
                            onPress={() => applyCameraPreset(preset.id)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.cameraButtonText, isSelected && styles.cameraButtonTextActive]}>
                                {preset.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* 3. INSIGNIA EDITORIAL FLOTANTE */}
            <View style={styles.editorialBadge}>
                <Text style={styles.editorialBadgeText}>✦ Maniquí Haute Couture · 360°</Text>
            </View>

            {/* 4. GUÍA DE ROTACIÓN DISCRETA */}
            <View style={styles.interactionHint}>
                <Text style={styles.interactionHintText}>Arrastra para rotar 360° · Rueda para zoom</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        position: 'relative',
        backgroundColor: '#FAF7F2',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#EFECE6',
    },
    cameraControlsBar: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    cameraButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5DED5',
        shadowColor: '#171411',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    cameraButtonActive: {
        backgroundColor: '#171411',
        borderColor: '#171411',
    },
    cameraButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#655A4E',
        letterSpacing: 0.2,
    },
    cameraButtonTextActive: {
        color: '#F4EFEA',
    },
    editorialBadge: {
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.88)',
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EBE5DC',
    },
    editorialBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8A6A4A',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    interactionHint: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.80)',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 10,
    },
    interactionHintText: {
        fontSize: 10,
        color: '#9C9082',
        fontStyle: 'italic',
    },
    mobileFallbackContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    mobileFallbackTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#171411',
        marginBottom: 8,
    },
    mobileFallbackSubtitle: {
        fontSize: 13,
        color: '#8A7E72',
        textAlign: 'center',
        maxWidth: 280,
    },
});

