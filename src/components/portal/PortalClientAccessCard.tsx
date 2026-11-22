// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: TARJETA DE ACCESO PORTAL DE CLIENTA (M09)
// Archivo: src/components/portal/PortalClientAccessCard.tsx
// ==============================================================================
// Muestra la ficha segura de vinculación e estado de ciclo de vida de la clienta
// en la vista de gestión de la diseñadora, bloqueando honestamente las acciones
// remotas hasta contar con el backend M09 (E1 y E2).
// ==============================================================================

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ACCESS_STATUS_META, PortalSafeClientSummary } from './portalDesignerModel';
import { portalDesignerStyles as styles } from './portalDesignerStyles';

interface PortalClientAccessCardProps {
    client: PortalSafeClientSummary;
}

function formatEditorialDate(dateStr: string | null): string {
    if (!dateStr) return 'Sin registro';
    return dateStr;
}

export const PortalClientAccessCard: React.FC<PortalClientAccessCardProps> = ({ client }) => {
    const statusMeta = ACCESS_STATUS_META[client.accessStatus];

    return (
        <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleGroup}>
                    <Text style={styles.eyebrow}>IDENTIDAD Y ACCESO DIGITAL · SOLO REFERENCIA LOCAL</Text>
                    <Text style={styles.cardTitle}>{client.fullName}</Text>
                    <Text style={styles.cardExplainer}>
                        {client.email} · {client.city}
                    </Text>
                </View>

                <View
                    testID="portal-access-status-badge"
                    style={[
                        styles.statusBadge,
                        {
                            backgroundColor: statusMeta.badgeBg,
                            borderColor: statusMeta.badgeBorder,
                        },
                    ]}
                >
                    <Text style={[styles.statusBadgeText, { color: statusMeta.badgeText }]}>
                        {statusMeta.label}
                    </Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.identityGrid}>
                <View style={styles.identityCell}>
                    <Text style={styles.metaLabel}>Cuenta Autenticada</Text>
                    <Text style={styles.metaValue}>
                        {client.authUserIdMask
                            ? `Vinculada (${client.authUserIdMask})`
                            : 'Sin cuenta vinculada'}
                    </Text>
                </View>

                <View style={styles.identityCell}>
                    <Text style={styles.metaLabel}>Aceptación Confirmada</Text>
                    <Text style={styles.metaValue}>{formatEditorialDate(client.confirmedAt)}</Text>
                </View>

                <View style={styles.identityCell}>
                    <Text style={styles.metaLabel}>Último Cambio de Acceso</Text>
                    <Text style={styles.metaValue}>
                        {formatEditorialDate(client.lastAccessUpdate)}
                    </Text>
                </View>

                <View style={styles.identityCell}>
                    <Text style={styles.metaLabel}>Creaciones Elegibles</Text>
                    <Text style={styles.metaValue}>
                        {client.creations.length === 1
                            ? '1 creación asignada'
                            : `${client.creations.length} creaciones asignadas`}
                    </Text>
                </View>
            </View>

            <View style={styles.visibilitySummaryBox}>
                <Text style={styles.visibilitySummaryHeadline}>{statusMeta.headline}</Text>
                <Text style={styles.visibilitySummaryText}>
                    {statusMeta.clientVisibilitySummary}
                </Text>
            </View>

            <View style={styles.disabledActionsGroup}>
                <Text style={styles.disabledActionsLabel}>
                    Acciones de Ciclo de Vida e Invitaciones (Bloqueadas sin Backend E1/E2)
                </Text>
                <View style={styles.disabledButtonsRow}>
                    <TouchableOpacity
                        testID="portal-lifecycle-btn-blocked-activate"
                        style={styles.blockedActionBtn}
                        disabled
                        accessibilityState={{ disabled: true }}
                        accessibilityLabel="Activar acceso bloqueado sin backend E1"
                    >
                        <Text style={styles.blockedActionBtnText}>Activar Acceso (Requiere E1)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        testID="portal-lifecycle-btn-blocked-suspend"
                        style={styles.blockedActionBtn}
                        disabled
                        accessibilityState={{ disabled: true }}
                        accessibilityLabel="Suspender acceso bloqueado sin backend E1"
                    >
                        <Text style={styles.blockedActionBtnText}>Suspender (Requiere E1)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        testID="portal-lifecycle-btn-blocked-revoke"
                        style={styles.blockedActionBtn}
                        disabled
                        accessibilityState={{ disabled: true }}
                        accessibilityLabel="Revocar acceso bloqueado sin backend E1"
                    >
                        <Text style={styles.blockedActionBtnText}>Revocar (Requiere E1)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        testID="portal-lifecycle-btn-blocked-invite"
                        style={styles.blockedActionBtn}
                        disabled
                        accessibilityState={{ disabled: true }}
                        accessibilityLabel="Emitir invitación bloqueado sin backend E2"
                    >
                        <Text style={styles.blockedActionBtnText}>
                            Emitir Invitación (Requiere E2)
                        </Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.blockedNoteText}>
                    No se ejecutan cambios de estado ni se emiten enlaces en esta vista local hasta desplegar la migración M09 y su Edge Function.
                </Text>
            </View>
        </View>
    );
};
