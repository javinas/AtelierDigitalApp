// ==============================================================================
// COMPONENTE: CABECERA EDITORIAL Y SELECTOR DE PESTAÑAS DEL EXPEDIENTE
// Archivo: src/components/clients/dossier/DossierClientHeader.tsx
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { Client } from '../../../types/client';
import { getEditorialAvatarSource } from '../../../utils/clientAvatarHelper';
import { styles } from './clientDossierStyles';

export type DossierTab = 'overview' | 'sessions' | 'creations' | 'patterns' | 'persons_groups';

interface DossierClientHeaderProps {
    client: Client;
    isInstitutional: boolean;
    personsCount: number;
    campaignsCount: number;
    sessionMetrics: { total: number; completed: number; draft: number };
    creationsCount: number;
    patternStats: { patternsCount: number; totalExecutionsCount: number; activePatternsCount: number };
    patternGroupsCount: number;
    sessionsCount: number;
    activeTab: DossierTab;
    onTabChange: (tab: DossierTab) => void;
    formatDate?: (dateStr?: string | null) => string;
}

export const DossierClientHeader: React.FC<DossierClientHeaderProps> = ({
    client,
    isInstitutional,
    personsCount,
    campaignsCount,
    sessionMetrics,
    creationsCount,
    patternStats,
    patternGroupsCount,
    sessionsCount,
    activeTab,
    onTabChange,
    formatDate = (d) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return String(d);
        }
    },
}) => {
    return (
        <>
            {/* 1. Cabecera Editorial y Título de Trazabilidad */}
            <View style={styles.dossierHeaderCard}>
                <View style={styles.dossierSuperRow}>
                    <View style={styles.dossierBadge}>
                        <Text style={styles.dossierBadgeText}>MÓDULO 02 · PATRONAJE Y MEDIDAS</Text>
                    </View>
                    <View
                        style={[
                            styles.clientStatusTag,
                            client.status === 'archived' ? styles.statusArchived : styles.statusActive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.clientStatusText,
                                client.status === 'archived' ? styles.statusTextArchived : styles.statusTextActive,
                            ]}
                        >
                            {client.status === 'archived' ? 'ARCHIVADA' : 'CLIENTA ACTIVA'}
                        </Text>
                    </View>
                </View>

                <View style={styles.clientIdentityRow}>
                    <View style={styles.avatarMonogram}>
                        <Image
                            source={
                                client.photo_url
                                    ? { uri: client.photo_url }
                                    : getEditorialAvatarSource(client.id || client.full_name)
                            }
                            style={styles.avatarImage}
                            resizeMode="cover"
                        />
                    </View>
                    <View style={styles.identityTextWrap}>
                        <Text style={styles.clientFullName}>{client.full_name}</Text>
                        <View style={styles.contactDetailsRow}>
                            {client.city ? <Text style={styles.contactItem}>📍 {client.city}</Text> : null}
                            {client.phone ? <Text style={styles.contactItem}>📞 {client.phone}</Text> : null}
                            {client.email ? <Text style={styles.contactItem}>✉️ {client.email}</Text> : null}
                        </View>
                        <Text style={styles.registrationDate}>
                            Registrada en Atelier: {formatDate(client.created_at)}
                        </Text>
                    </View>
                </View>

                {/* Preferencias de Estilo y Notas Confidenciales */}
                {(client.style_preferences || client.internal_notes) && (
                    <View style={styles.notesContainer}>
                        {client.style_preferences ? (
                            <View style={styles.noteItem}>
                                <Text style={styles.noteLabel}>PREFERENCIAS DE ESTILO & SILUETA:</Text>
                                <Text style={styles.noteValue}>{client.style_preferences}</Text>
                            </View>
                        ) : null}
                        {client.internal_notes ? (
                            <View style={styles.noteItem}>
                                <Text style={styles.noteLabel}>NOTAS PRIVADAS CONFIDENCIALES:</Text>
                                <Text style={styles.noteValue}>{client.internal_notes}</Text>
                            </View>
                        ) : null}
                    </View>
                )}

                {/* RESUMEN DE LA CLIENTA / INSTITUCIÓN (Ontología Canónica) */}
                <View style={styles.summarySectionBox}>
                    <Text style={styles.summarySectionBoxTitle}>
                        {isInstitutional ? 'RESUMEN DEL CLIENTE INSTITUCIONAL' : 'RESUMEN DE LA CLIENTA'}
                    </Text>
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryGridItem}>
                            <Text style={styles.summaryGridKey}>
                                {isInstitutional ? 'INSTITUCIÓN:' : 'CLIENTA:'}
                            </Text>
                            <Text style={styles.summaryGridValBold}>{client.full_name}</Text>
                        </View>
                        {isInstitutional && (
                            <>
                                <View style={styles.summaryGridItem}>
                                    <Text style={styles.summaryGridKey}>Personas registradas:</Text>
                                    <Text style={styles.summaryGridValBold}>{personsCount}</Text>
                                    <Text style={styles.summaryGridSubText}>Sujetos medidos</Text>
                                </View>
                                <View style={styles.summaryGridItem}>
                                    <Text style={styles.summaryGridKey}>Jornadas grupales:</Text>
                                    <Text style={styles.summaryGridValBold}>{campaignsCount}</Text>
                                    <Text style={styles.summaryGridSubText}>Campañas</Text>
                                </View>
                            </>
                        )}
                        <View style={styles.summaryGridItem}>
                            <Text style={styles.summaryGridKey}>
                                {isInstitutional ? 'Sesiones totales:' : 'Sesiones de medidas:'}
                            </Text>
                            <Text style={styles.summaryGridValBold}>{sessionMetrics.total}</Text>
                            {isInstitutional ? (
                                <Text style={styles.summaryGridSubText}>
                                    {sessionMetrics.completed} fin · {sessionMetrics.draft} borrador
                                </Text>
                            ) : (
                                <Text style={styles.summaryGridSubText}>
                                    {sessionMetrics.completed} finalizadas
                                </Text>
                            )}
                        </View>
                        <View style={styles.summaryGridItem}>
                            <Text style={styles.summaryGridKey}>Creaciones:</Text>
                            <Text style={styles.summaryGridVal}>{creationsCount}</Text>
                        </View>
                        <View style={styles.summaryGridItem}>
                            <Text style={styles.summaryGridKey}>Patrones CAD:</Text>
                            <Text style={styles.summaryGridValBold}>{patternStats.patternsCount}</Text>
                            <Text style={styles.summaryGridSubText}>Patrón lógico</Text>
                        </View>
                        <View style={styles.summaryGridItem}>
                            <Text style={styles.summaryGridKey}>Ejecuciones:</Text>
                            <Text style={styles.summaryGridVal}>{patternStats.totalExecutionsCount}</Text>
                            <Text style={styles.summaryGridSubText}>Registros técnicos</Text>
                        </View>
                        <View style={styles.summaryGridItem}>
                            <Text style={styles.summaryGridKey}>Patrones vigentes:</Text>
                            <Text style={[styles.summaryGridValBold, { color: colors.champagneGold }]}>
                                {patternStats.activePatternsCount}
                            </Text>
                            <Text style={styles.summaryGridSubText}>Versión aprobada</Text>
                        </View>
                    </View>
                    <View style={styles.summaryMicroLegend}>
                        <Text style={styles.summaryMicroLegendText}>
                            ℹ️ Las ejecuciones corresponden a cálculos y revisiones técnicas del patrón. No representan patrones independientes.
                        </Text>
                    </View>
                </View>
            </View>

            {/* 2. Selector de Pestañas del Expediente */}
            <View style={styles.tabsRow}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
                    onPress={() => onTabChange('overview')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabButtonText, activeTab === 'overview' && styles.tabButtonTextActive]}>
                        Resumen General
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'sessions' && styles.tabButtonActive]}
                    onPress={() => onTabChange('sessions')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabButtonText, activeTab === 'sessions' && styles.tabButtonTextActive]}>
                        Sesiones de Medidas ({sessionsCount})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'creations' && styles.tabButtonActive]}
                    onPress={() => onTabChange('creations')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabButtonText, activeTab === 'creations' && styles.tabButtonTextActive]}>
                        Creaciones ({creationsCount})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'patterns' && styles.tabButtonActive]}
                    onPress={() => onTabChange('patterns')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabButtonText, activeTab === 'patterns' && styles.tabButtonTextActive]}>
                        Patrones ({patternGroupsCount})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'persons_groups' && styles.tabButtonActive]}
                    onPress={() => onTabChange('persons_groups')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabButtonText, activeTab === 'persons_groups' && styles.tabButtonTextActive]}>
                        Personas y Grupos
                    </Text>
                </TouchableOpacity>
            </View>
        </>
    );
};

