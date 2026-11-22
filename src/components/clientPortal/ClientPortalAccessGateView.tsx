// ==============================================================================
// ATELIER DIGITAL — COMPONENTE DE ACCESO RESTRINGIDO: PORTAL CLIENTA (M09)
// Archivo: src/components/clientPortal/ClientPortalAccessGateView.tsx
// ==============================================================================
// Renderiza con estética «Atelier de Autor» los estados no activos del ciclo
// de vida del portal: sin invitación (unprovisioned), invitada, suspendida y
// revocada, garantizando cero exposición de creaciones, citas, medidas o notas.
// ==============================================================================

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
    CLIENT_ACCESS_LIFECYCLE_META,
    ClientPortalLifecycleStatus,
} from './clientPortalModel';
import { clientPortalStyles as styles } from './clientPortalStyles';

export interface ClientPortalAccessGateViewProps {
    clientFullName: string;
    clientCity: string;
    accessStatus: Exclude<ClientPortalLifecycleStatus, 'active'>;
}

export const ClientPortalAccessGateView: React.FC<ClientPortalAccessGateViewProps> = ({
    clientFullName,
    clientCity,
    accessStatus,
}) => {
    const meta = CLIENT_ACCESS_LIFECYCLE_META[accessStatus];

    return (
        <View style={styles.accessGateWrapper} testID={`client-access-gate-${accessStatus}`}>
            <View style={styles.accessGateCard}>
                <View style={styles.cardHeaderRow}>
                    <View
                        style={[
                            styles.statusBadge,
                            {
                                backgroundColor: meta.badgeBg,
                                borderColor: meta.badgeBorder,
                            },
                        ]}
                    >
                        <Text style={[styles.statusBadgeText, { color: meta.badgeText }]}>
                            {meta.badgeLabel}
                        </Text>
                    </View>
                    <View style={styles.pillTag}>
                        <Text style={styles.pillTagText}>Exposición: 0 registros</Text>
                    </View>
                </View>

                <Text style={styles.eyebrow}>
                    EXPEDIENTE PRIVADO · {clientFullName.toUpperCase()} · {clientCity.toUpperCase()}
                </Text>
                <Text style={styles.accessGateTitle}>{meta.title}</Text>
                <Text style={styles.accessGateHeadline}>{meta.headline}</Text>
                <Text style={styles.accessGateBody}>{meta.explanation}</Text>

                <View style={styles.divider} />

                <View style={styles.honestyBox}>
                    <Text style={styles.honestyBoxTitle}>
                        Protección Activa de Privacidad y Aislamiento
                    </Text>
                    <Text style={styles.honestyBoxText}>{meta.privacyGuarantee}</Text>
                    <Text style={styles.honestyBoxText}>
                        Creaciones visibles: 0 · Citas visibles: 0 · Sesiones visibles: 0 ·
                        Mensajes visibles: 0.
                    </Text>
                </View>

                <TouchableOpacity
                    disabled
                    accessibilityRole="button"
                    accessibilityState={{ disabled: true }}
                    style={styles.disabledActionBtn}
                    testID={`client-gate-disabled-cta-${accessStatus}`}
                >
                    <Text style={styles.disabledActionBtnText}>
                        {meta.guidanceCta} — Pendiente backend E1–E2 (sin persistencia local)
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};
