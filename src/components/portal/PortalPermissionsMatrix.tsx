// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: MATRIZ VISUAL DE PERMISOS MIXTOS M09
// Archivo: src/components/portal/PortalPermissionsMatrix.tsx
// ==============================================================================
// Implementa el modelo mixto aprobado M09 con principio Zero Trust DEFAULT false:
// 1. Nivel 1 — Permisos de Consulta Global por Clienta (Agenda, Medidas, Cotiz.)
// 2. Nivel 2 — Doble Candado por Creación (Creación visible + subpermisos +
//    override con precedencia deny-overrides para cotizaciones)
// 3. Acciones Habilitadas por la Clienta (futuras fases M09-C/M09-D/descargas)
// Toda configuración opera estrictamente sobre borrador local en memoria.
// ==============================================================================

import React from 'react';
import { Platform, Switch, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/colors';
import { PortalAction, PortalResource } from '../../types/portal';
import {
    CREATION_READ_ITEMS,
    CreationQuoteOverrideMode,
    ENABLED_ACTION_ITEMS,
    evaluateMixedDraftPermission,
    GLOBAL_READ_ITEMS,
    makePermissionKey,
    PortalDraftEvaluationResult,
    PortalPermissionCatalogItem,
    PortalPermissionDraftState,
    PortalSafeClientSummary,
    summarizeDraftPermissions,
} from './portalDesignerModel';
import { portalDesignerStyles as styles } from './portalDesignerStyles';

interface PortalPermissionsMatrixProps {
    client: PortalSafeClientSummary;
    draft: PortalPermissionDraftState;
    onToggleGlobalPermission: (resource: PortalResource, action: PortalAction) => void;
    onToggleCreationPermission: (
        creationId: string,
        resource: PortalResource,
        action: PortalAction
    ) => void;
    onChangeCreationQuoteOverride: (
        creationId: string,
        mode: CreationQuoteOverrideMode
    ) => void;
    onResetZeroTrust: () => void;
}

const EVALUATION_BADGE_LABELS: Record<PortalDraftEvaluationResult['reason'], string> = {
    allowed: 'Visible si activo',
    disabled_zero_trust: 'Desactivado (Zero Trust)',
    blocked_by_access_status: 'Bloqueado por estado',
    blocked_by_double_lock: 'Bloqueado (Candado prenda)',
    blocked_global_scope_forbidden: 'Prohibido como global',
    denied_by_override: 'Denegado (deny-overrides)',
};

const EvaluationStatusPill: React.FC<{ result: PortalDraftEvaluationResult }> = ({ result }) => {
    const label = EVALUATION_BADGE_LABELS[result.reason];
    return (
        <View style={result.effectiveAllowed ? styles.evalBadgeAllowed : styles.evalBadgeBlocked}>
            <Text
                style={
                    result.effectiveAllowed
                        ? styles.evalBadgeAllowedText
                        : styles.evalBadgeBlockedText
                }
            >
                {label}
            </Text>
        </View>
    );
};

interface SwitchPermissionRowProps {
    item: PortalPermissionCatalogItem;
    testId: string;
    value: boolean;
    disabled?: boolean;
    evaluation: PortalDraftEvaluationResult;
    onToggle: () => void;
}

const SwitchPermissionRow: React.FC<SwitchPermissionRowProps> = ({
    item,
    testId,
    value,
    disabled = false,
    evaluation,
    onToggle,
}) => {
    return (
        <View style={[styles.permissionRow, disabled && { opacity: 0.62 }]}>
            <View style={styles.permissionInfoCol}>
                <Text style={styles.permissionTitle}>{item.title}</Text>
                <Text style={styles.permissionSubtitle}>{item.subtitle}</Text>
                <View style={styles.permissionBadgesRow}>
                    <View style={styles.scopePill}>
                        <Text style={styles.scopePillText}>{item.scopeLabel}</Text>
                    </View>
                    {item.pendingBackendNote && (
                        <View style={styles.scopePill}>
                            <Text style={styles.scopePillText}>{item.pendingBackendNote}</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.privacyLimitText}>{item.privacyLimit}</Text>
            </View>

            <View style={styles.switchControlCol}>
                <Switch
                    testID={testId}
                    accessibilityLabel={item.title}
                    value={value}
                    onValueChange={onToggle}
                    disabled={disabled}
                    trackColor={{ false: colors.border, true: colors.champagneGold }}
                    thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                />
                <EvaluationStatusPill result={evaluation} />
            </View>
        </View>
    );
};

export const PortalPermissionsMatrix: React.FC<PortalPermissionsMatrixProps> = ({
    client,
    draft,
    onToggleGlobalPermission,
    onToggleCreationPermission,
    onChangeCreationQuoteOverride,
    onResetZeroTrust,
}) => {
    const summary = summarizeDraftPermissions(draft, client);

    return (
        <View style={{ gap: 16 }}>
            {/* Barra de Resumen del Borrador Local (Zero Trust) */}
            <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                    <View style={styles.cardTitleGroup}>
                        <Text style={styles.eyebrow}>MATRIZ DE CONFIGURACIÓN VISUAL EN MEMORIA</Text>
                        <Text style={styles.cardTitle}>Modelo Mixto de Permisos M09</Text>
                        <Text style={styles.cardExplainer}>
                            Todos los permisos inician apagados (DEFAULT false). Los cambios modifican
                            únicamente el borrador visual en memoria sin guardar en backend.
                        </Text>
                    </View>
                    <View style={styles.zeroTrustBadge}>
                        <Text style={styles.zeroTrustBadgeText}>ZERO TRUST · DEFAULT FALSE</Text>
                    </View>
                </View>

                <View style={styles.summaryStatsRow}>
                    <View style={styles.statBox}>
                        <Text testID="portal-draft-total-count" style={styles.statValue}>
                            {summary.totalEnabled}
                        </Text>
                        <Text style={styles.statLabel}>En borrador local</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text testID="portal-effective-count" style={styles.statValue}>
                            {summary.effectiveVisibleCount}
                        </Text>
                        <Text style={styles.statLabel}>Efectivos según estado</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>Persistidos en backend</Text>
                    </View>
                </View>

                <View style={styles.draftActionsBar}>
                    <View style={styles.draftActionButtonsRow}>
                        <TouchableOpacity
                            testID="portal-reset-zero-trust-btn"
                            style={styles.resetZeroTrustBtn}
                            onPress={onResetZeroTrust}
                            activeOpacity={0.8}
                            accessibilityLabel="Restablecer todos los interruptores a Zero Trust desactivados"
                        >
                            <Text style={styles.resetZeroTrustBtnText}>
                                Restablecer Zero Trust (0 activos)
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            testID="portal-save-blocked-btn"
                            style={styles.saveBlockedBtn}
                            disabled
                            accessibilityState={{ disabled: true }}
                            accessibilityLabel="Guardar configuración bloqueado hasta desplegar backend E1"
                        >
                            <Text style={styles.saveBlockedBtnText}>
                                Guardar en Portal (Bloqueado · Backend E1 pendiente)
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.blockedNoteText}>
                        La persistencia en backend requiere aplicar la migración M09 y sus políticas RLS; esta pantalla no simula ni confirma guardados remotos.
                    </Text>
                </View>
            </View>

            {/* Sección 1: Nivel 1 · Permisos de Consulta Global */}
            <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                    <View style={styles.cardTitleGroup}>
                        <Text style={styles.eyebrow}>NIVEL 1 · PERMISOS DE CONSULTA GLOBAL</Text>
                        <Text style={styles.cardTitle}>Módulos Generales del Portal</Text>
                        <Text style={styles.cardExplainer}>
                            Autorizan la vista global por clienta. Las creaciones, bocetos, telas,
                            pruebas y visor 3D están bloqueados como globales y exigen Doble Candado
                            individual en el Nivel 2.
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {GLOBAL_READ_ITEMS.map((item) => {
                    const checked = Boolean(draft.globalGrants[item.key]);
                    const evalRes = evaluateMixedDraftPermission({
                        accessStatus: client.accessStatus,
                        draft,
                        resource: item.resource,
                        action: item.action,
                        creationId: null,
                    });
                    return (
                        <SwitchPermissionRow
                            key={item.key}
                            item={item}
                            testId={`portal-switch-global-${item.resource}-${item.action}`}
                            value={checked}
                            evaluation={evalRes}
                            onToggle={() => onToggleGlobalPermission(item.resource, item.action)}
                        />
                    );
                })}
            </View>

            {/* Sección 2: Nivel 2 · Doble Candado por Creación */}
            <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                    <View style={styles.cardTitleGroup}>
                        <Text style={styles.eyebrow}>NIVEL 2 · DOBLE CANDADO POR PRENDA</Text>
                        <Text style={styles.cardTitle}>Permisos Individuales por Creación</Text>
                        <Text style={styles.cardExplainer}>
                            Cada prenda requiere autorización explícita (creations:view) para habilitar
                            sus subvistas. Apagar Visible revoca en el acto sus subpermisos dependientes
                            sin afectar otras creaciones.
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {client.creations.length === 0 ? (
                    <Text style={styles.cardExplainer}>
                        Esta clienta no tiene creaciones de alta costura registradas en su ficha de
                        referencia.
                    </Text>
                ) : (
                    client.creations.map((creation) => {
                        const creationMap = draft.creationGrants[creation.id] || {};
                        const isCreationVisible = Boolean(
                            creationMap[makePermissionKey('creations', 'view')]
                        );
                        const masterEval = evaluateMixedDraftPermission({
                            accessStatus: client.accessStatus,
                            draft,
                            resource: 'creations',
                            action: 'view',
                            creationId: creation.id,
                        });
                        const quoteOverride: CreationQuoteOverrideMode =
                            draft.creationQuoteOverrides[creation.id] || 'inherit';
                        const quoteEval = evaluateMixedDraftPermission({
                            accessStatus: client.accessStatus,
                            draft,
                            resource: 'quotations',
                            action: 'view',
                            creationId: creation.id,
                        });

                        return (
                            <View key={creation.id} style={styles.creationBox}>
                                <View style={styles.creationHeaderRow}>
                                    <View style={styles.creationTitleCol}>
                                        <Text style={styles.creationTitle}>{creation.name}</Text>
                                        <Text style={styles.creationSub}>
                                            {creation.garmentType} · Etapa: {creation.stageLabel}
                                            {creation.targetDate ? ` · Entrega est.: ${creation.targetDate}` : ''}
                                        </Text>
                                    </View>

                                    <View style={styles.creationMasterSwitchWrap}>
                                        <View style={styles.switchControlCol}>
                                            <Switch
                                                testID={`portal-switch-creation-${creation.id}-creations-view`}
                                                accessibilityLabel={`Visible en portal para ${creation.name}`}
                                                value={isCreationVisible}
                                                onValueChange={() =>
                                                    onToggleCreationPermission(
                                                        creation.id,
                                                        'creations',
                                                        'view'
                                                    )
                                                }
                                                trackColor={{
                                                    false: colors.border,
                                                    true: colors.champagneGold,
                                                }}
                                                thumbColor={
                                                    Platform.OS === 'android' ? '#FFFFFF' : undefined
                                                }
                                            />
                                            <EvaluationStatusPill result={masterEval} />
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.creationSubGrid}>
                                    {CREATION_READ_ITEMS.map((subItem) => {
                                        const subEnabled = Boolean(creationMap[subItem.key]);
                                        const subEval = evaluateMixedDraftPermission({
                                            accessStatus: client.accessStatus,
                                            draft,
                                            resource: subItem.resource,
                                            action: subItem.action,
                                            creationId: creation.id,
                                        });
                                        return (
                                            <View
                                                key={`${creation.id}-${subItem.key}`}
                                                style={[
                                                    styles.creationSubRow,
                                                    !isCreationVisible && { opacity: 0.52 },
                                                ]}
                                            >
                                                <View style={styles.permissionInfoCol}>
                                                    <Text style={styles.permissionTitle}>
                                                        {subItem.title}
                                                    </Text>
                                                    <Text style={styles.permissionSubtitle}>
                                                        {subItem.subtitle}
                                                    </Text>
                                                    <Text style={styles.privacyLimitText}>
                                                        {subItem.privacyLimit}
                                                    </Text>
                                                </View>
                                                <View style={styles.switchControlCol}>
                                                    <Switch
                                                        testID={`portal-switch-creation-${creation.id}-${subItem.resource}-${subItem.action}`}
                                                        accessibilityLabel={`${subItem.title} para ${creation.name}`}
                                                        value={subEnabled}
                                                        disabled={!isCreationVisible}
                                                        onValueChange={() =>
                                                            onToggleCreationPermission(
                                                                creation.id,
                                                                subItem.resource,
                                                                subItem.action
                                                            )
                                                        }
                                                        trackColor={{
                                                            false: colors.border,
                                                            true: colors.champagneGold,
                                                        }}
                                                        thumbColor={
                                                            Platform.OS === 'android'
                                                                ? '#FFFFFF'
                                                                : undefined
                                                        }
                                                    />
                                                    <EvaluationStatusPill result={subEval} />
                                                </View>
                                            </View>
                                        );
                                    })}

                                    {/* Excepción granular con precedencia deny-overrides para Cotización de la prenda */}
                                    <View style={styles.creationQuoteOverrideBox}>
                                        <View style={styles.cardHeaderRow}>
                                            <View style={styles.permissionInfoCol}>
                                                <Text style={styles.permissionTitle}>
                                                    Cotización de esta Prenda (Modelo Mixto deny-overrides)
                                                </Text>
                                                <Text style={styles.permissionSubtitle}>
                                                    Hereda la regla global Nivel 1 o aplica una excepción específica para esta creación (requiere prenda visible).
                                                </Text>
                                            </View>
                                            <EvaluationStatusPill result={quoteEval} />
                                        </View>

                                        <View style={styles.overrideSegmentedRow}>
                                            <TouchableOpacity
                                                testID={`portal-quote-override-${creation.id}-inherit`}
                                                style={[
                                                    styles.overrideBtn,
                                                    quoteOverride === 'inherit' &&
                                                        styles.overrideBtnActiveInherit,
                                                ]}
                                                onPress={() =>
                                                    onChangeCreationQuoteOverride(
                                                        creation.id,
                                                        'inherit'
                                                    )
                                                }
                                                activeOpacity={0.8}
                                            >
                                                <Text
                                                    style={[
                                                        styles.overrideBtnText,
                                                        quoteOverride === 'inherit' &&
                                                            styles.overrideBtnTextActiveDark,
                                                    ]}
                                                >
                                                    Heredar global
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                testID={`portal-quote-override-${creation.id}-allow`}
                                                style={[
                                                    styles.overrideBtn,
                                                    quoteOverride === 'allow' &&
                                                        styles.overrideBtnActiveAllow,
                                                ]}
                                                onPress={() =>
                                                    onChangeCreationQuoteOverride(
                                                        creation.id,
                                                        'allow'
                                                    )
                                                }
                                                activeOpacity={0.8}
                                            >
                                                <Text
                                                    style={[
                                                        styles.overrideBtnText,
                                                        quoteOverride === 'allow' &&
                                                            styles.overrideBtnTextActiveAllow,
                                                    ]}
                                                >
                                                    Permitir en prenda
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                testID={`portal-quote-override-${creation.id}-deny`}
                                                style={[
                                                    styles.overrideBtn,
                                                    quoteOverride === 'deny' &&
                                                        styles.overrideBtnActiveDeny,
                                                ]}
                                                onPress={() =>
                                                    onChangeCreationQuoteOverride(
                                                        creation.id,
                                                        'deny'
                                                    )
                                                }
                                                activeOpacity={0.8}
                                            >
                                                <Text
                                                    style={[
                                                        styles.overrideBtnText,
                                                        quoteOverride === 'deny' &&
                                                            styles.overrideBtnTextActiveDeny,
                                                    ]}
                                                >
                                                    Denegar (deny-overrides)
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    })
                )}
            </View>

            {/* Sección 3: Acciones Habilitadas por la Clienta */}
            <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                    <View style={styles.cardTitleGroup}>
                        <Text style={styles.eyebrow}>NIVEL 3 · ACCIONES HABILITADAS</Text>
                        <Text style={styles.cardTitle}>Interacciones y Descargas Permitidas</Text>
                        <Text style={styles.cardExplainer}>
                            Todas las acciones de interacción, aprobación o descarga inician apagadas
                            (Zero Trust). Se configuran visualmente aquí mientras se despliegan los
                            flujos backend de las siguientes fases.
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {ENABLED_ACTION_ITEMS.map((item) => {
                    const checked = Boolean(draft.globalGrants[item.key]);
                    const evalRes = evaluateMixedDraftPermission({
                        accessStatus: client.accessStatus,
                        draft,
                        resource: item.resource,
                        action: item.action,
                        creationId: null,
                    });
                    return (
                        <SwitchPermissionRow
                            key={item.key}
                            item={item}
                            testId={`portal-switch-global-${item.resource}-${item.action}`}
                            value={checked}
                            evaluation={evalRes}
                            onToggle={() => onToggleGlobalPermission(item.resource, item.action)}
                        />
                    );
                })}
            </View>
        </View>
    );
};
