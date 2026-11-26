// ==============================================================================
// ATELIER DIGITAL — CONTEXTO COMPARTIDO DEL PORTAL CLIENTE (M09 P1.3)
// Archivo: src/context/ClientPortalContext.tsx
// ==============================================================================
// Comparte el snapshot seguro de fetchClientPortalDashboardData entre
// app/(client)/index.tsx y app/(client)/creation/[id].tsx sin duplicar llamadas
// a las 6 vistas canónicas, soportando recarga manual y deep-links directos.
// ==============================================================================

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useAuth } from './AuthContext';
import {
    ClientPortalDashboardData,
    PortalCreationView,
    PortalTelemetryEventType,
} from '../types/portal';
import {
    fetchClientPortalDashboardData,
    logPortalTelemetryEvent,
} from '../services/portalService';

export interface ClientPortalContextValue {
    dashboard: ClientPortalDashboardData | null;
    loading: boolean;
    refreshing: boolean;
    uiError: string | null;
    reloadDashboard: () => Promise<void>;
    refreshDashboard: () => Promise<void>;
    signOutPortal: () => Promise<void>;
    getAuthorizedCreationById: (creationId: string) => PortalCreationView | null;
    logTelemetryOnce: (
        eventType: PortalTelemetryEventType,
        dedupeKey: string,
        metadata?: Record<string, unknown>
    ) => void;
}

const ClientPortalContext = createContext<ClientPortalContextValue | null>(null);

export const ClientPortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, signOut } = useAuth();
    const authUserId = user?.id ?? null;
    const authUserEmail = user?.email ?? null;

    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [dashboard, setDashboard] = useState<ClientPortalDashboardData | null>(null);
    const [uiError, setUiError] = useState<string | null>(null);

    const loggedTelemetryKeysRef = useRef<Set<string>>(new Set());

    const applyDashboardResult = useCallback((result: ClientPortalDashboardData) => {
        setDashboard(result);
        setUiError(null);

        if (
            result.status === 'ok' &&
            result.access?.status === 'active' &&
            !result.isDemoMode
        ) {
            const homeKey = `view_portal_home:${result.access.id}`;
            if (!loggedTelemetryKeysRef.current.has(homeKey)) {
                loggedTelemetryKeysRef.current.add(homeKey);
                const authorizedModules =
                    Number(result.projection.creationModules.hasAnyVisibleCreation) +
                    Number(result.projection.globalModules.measurementsView) +
                    Number(
                        result.projection.globalModules.quotationsView ||
                            result.commercialQuotes.length > 0
                    ) +
                    Number(result.projection.globalModules.appointmentsView) +
                    Number(result.projection.creationModules.hasAnyVisibleFittings);

                void logPortalTelemetryEvent('view_portal_home', {
                    visible_creations: result.creations.length,
                    authorized_modules: authorizedModules,
                });
            }
        }
    }, []);

    const reloadDashboard = useCallback(async () => {
        try {
            setUiError(null);
            const result = await fetchClientPortalDashboardData({
                authUserId,
                userEmail: authUserEmail,
            });
            applyDashboardResult(result);
        } catch {
            setUiError(
                'No fue posible consultar tu dossier protegido en este momento. Intenta recargar en unos segundos.'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [applyDashboardResult, authUserEmail, authUserId]);

    useEffect(() => {
        let isMounted = true;
        loggedTelemetryKeysRef.current.clear();

        async function initialLoad() {
            try {
                const result = await fetchClientPortalDashboardData({
                    authUserId,
                    userEmail: authUserEmail,
                });
                if (isMounted) {
                    applyDashboardResult(result);
                }
            } catch {
                if (isMounted) {
                    setUiError(
                        'No fue posible consultar tu dossier protegido en este momento. Intenta recargar en unos segundos.'
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        void initialLoad();
        return () => {
            isMounted = false;
        };
    }, [applyDashboardResult, authUserEmail, authUserId]);

    const refreshDashboard = useCallback(async () => {
        setRefreshing(true);
        await reloadDashboard();
    }, [reloadDashboard]);

    const signOutPortal = useCallback(async () => {
        if (dashboard?.access?.status === 'active' && !dashboard.isDemoMode) {
            await logPortalTelemetryEvent('auth_logout', {
                source: 'client_dashboard',
            }).catch(() => undefined);
        }
        loggedTelemetryKeysRef.current.clear();
        await signOut();
    }, [dashboard, signOut]);

    const getAuthorizedCreationById = useCallback(
        (creationId: string): PortalCreationView | null => {
            if (!dashboard || !creationId) return null;
            const cleanId = creationId.trim();
            return dashboard.creations.find((c) => c.id === cleanId) ?? null;
        },
        [dashboard]
    );

    const logTelemetryOnce = useCallback(
        (
            eventType: PortalTelemetryEventType,
            dedupeKey: string,
            metadata: Record<string, unknown> = {}
        ) => {
            if (dashboard?.access?.status !== 'active' || dashboard.isDemoMode) return;
            const fullKey = `${eventType}:${dedupeKey}`;
            if (loggedTelemetryKeysRef.current.has(fullKey)) return;
            loggedTelemetryKeysRef.current.add(fullKey);
            void logPortalTelemetryEvent(eventType, metadata);
        },
        [dashboard]
    );

    const value = useMemo<ClientPortalContextValue>(
        () => ({
            dashboard,
            loading,
            refreshing,
            uiError,
            reloadDashboard,
            refreshDashboard,
            signOutPortal,
            getAuthorizedCreationById,
            logTelemetryOnce,
        }),
        [
            dashboard,
            loading,
            refreshing,
            uiError,
            reloadDashboard,
            refreshDashboard,
            signOutPortal,
            getAuthorizedCreationById,
            logTelemetryOnce,
        ]
    );

    return <ClientPortalContext.Provider value={value}>{children}</ClientPortalContext.Provider>;
};

export function useClientPortal(): ClientPortalContextValue {
    const ctx = useContext(ClientPortalContext);
    if (!ctx) {
        throw new Error('useClientPortal debe utilizarse dentro de ClientPortalProvider.');
    }
    return ctx;
}
