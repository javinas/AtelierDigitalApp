// ==============================================================================
// ATELIER DIGITAL — HOOK RESPONSIVE DEL PORTAL DE CLIENTA (M09 P1.1)
// Archivo: src/hooks/usePortalResponsive.ts
// ==============================================================================
// Provee breakpoints y métricas de diseño editorial para móvil, tablet y escritorio
// utilizando exclusivamente useWindowDimensions() de React Native (compatible con
// Expo Web, iOS y Android, sin dependencias externas).
// ==============================================================================

import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { PortalResponsiveBreakpoint, PortalResponsiveMetrics } from '../types/portal';

export const PORTAL_BREAKPOINTS = {
    tabletMin: 768,
    desktopMin: 1024,
} as const;

/**
 * Función pura determinista que calcula las métricas responsive a partir de ancho y alto.
 * Exportada para permitir validación unitaria local sin entorno DOM/RN.
 */
export function resolvePortalResponsiveMetrics(
    width: number,
    height: number
): PortalResponsiveMetrics {
    const safeWidth = Number.isFinite(width) && width > 0 ? width : 390;
    const safeHeight = Number.isFinite(height) && height > 0 ? height : 844;

    let breakpoint: PortalResponsiveBreakpoint = 'mobile';
    if (safeWidth >= PORTAL_BREAKPOINTS.desktopMin) {
        breakpoint = 'desktop';
    } else if (safeWidth >= PORTAL_BREAKPOINTS.tabletMin) {
        breakpoint = 'tablet';
    }

    const isMobile = breakpoint === 'mobile';
    const isTablet = breakpoint === 'tablet';
    const isDesktop = breakpoint === 'desktop';

    const contentMaxWidth = isDesktop ? 1040 : isTablet ? 900 : safeWidth;
    const horizontalPadding = isDesktop ? 28 : isTablet ? 20 : 14;
    const cardPadding = isMobile ? 18 : 24;
    const gridColumns: 1 | 2 | 3 = isDesktop ? 2 : isTablet ? 2 : 1;

    return {
        width: safeWidth,
        height: safeHeight,
        breakpoint,
        isMobile,
        isTablet,
        isDesktop,
        contentMaxWidth,
        horizontalPadding,
        cardPadding,
        gridColumns,
    };
}

/**
 * Hook React Native / Expo Web para el layout responsive del Portal del Cliente.
 */
export function usePortalResponsive(): PortalResponsiveMetrics {
    const { width, height } = useWindowDimensions();

    return useMemo(
        () => resolvePortalResponsiveMetrics(width, height),
        [width, height]
    );
}
