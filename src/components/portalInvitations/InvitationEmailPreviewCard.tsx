// ==============================================================================
// ATELIER DIGITAL — VISTA PREVIA EDITORIAL DEL CORREO DE INVITACIÓN M09
// Archivo: src/components/portalInvitations/InvitationEmailPreviewCard.tsx
// ==============================================================================
// Renderiza con estética «Atelier de Autor» la vista previa del correo de
// invitación preparado en memoria local, sin token criptográfico ficticio y
// aclarando que el envío real está bloqueado hasta desplegar E2.
// ==============================================================================

import React from 'react';
import { Text, View } from 'react-native';
import { LocalInvitationEmailPreview } from './portalInvitationModel';
import { portalInvitationStyles as styles } from './portalInvitationStyles';

export interface InvitationEmailPreviewCardProps {
    preview: LocalInvitationEmailPreview;
}

export const InvitationEmailPreviewCard: React.FC<InvitationEmailPreviewCardProps> = ({
    preview,
}) => {
    return (
        <View style={styles.emailShell} testID="invitations-email-preview-card">
            <View style={styles.emailHeaderDark}>
                <Text style={styles.emailHeaderEyebrow}>ATELIER DIGITAL · BY KATHERINE CARROLL</Text>
                <Text style={styles.emailHeaderTitle}>Invitación Privada de Alta Costura</Text>
            </View>

            <View style={styles.emailMetaBox}>
                <Text style={styles.clientListMeta}>De: {preview.fromLabel}</Text>
                <Text style={styles.clientListMeta}>
                    Para: {preview.toName} ({preview.toEmail})
                </Text>
                <Text style={styles.clientListMeta}>Asunto: {preview.subject}</Text>
            </View>

            <View style={styles.emailBodyWrap}>
                <Text style={styles.cardBodyText} testID="invitations-email-preview-message">
                    {preview.customMessage}
                </Text>

                <View style={{ gap: 6 }}>
                    <Text style={styles.eyebrow}>ALCANCE CONFIGURADO PARA TU PORTAL</Text>
                    {preview.permissionsBullets.map((line, idx) => (
                        <View key={`${idx}-${line.slice(0, 18)}`} style={styles.permissionBulletRow}>
                            <Text style={styles.clientListMeta}>• {line}</Text>
                        </View>
                    ))}
                </View>

                <View
                    style={styles.emailLinkPlaceholderBox}
                    testID="invitations-email-link-placeholder"
                >
                    <Text style={styles.eyebrow}>ENLACE DE ACTIVACIÓN (SIN EMITIR EN LOCAL)</Text>
                    <Text style={styles.honestyTitle}>{preview.linkPlaceholder}</Text>
                    <Text style={styles.honestyText}>{preview.deliveryDisclosure}</Text>
                </View>

                <Text style={styles.clientListMeta}>{preview.legalFooter}</Text>
            </View>
        </View>
    );
};
