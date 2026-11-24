// ==============================================================================
// ATELIER DIGITAL — MÓDULO CENTRALIZADO DE COMUNICACIONES (SMTP ZIMBRA)
// Archivo: app/(admin)/communications.tsx
// ==============================================================================
// Interfaz administrativa exclusiva (role = 'admin') para:
// - Consultar y editar las 5 cuentas de correo por propósito (M09, M03, M08, Contacto, Facturación)
// - Rotar contraseñas SMTP vía campo write-only en Supabase Vault (sin mostrar claves)
// - Activar / desactivar cuentas con validación de integridad
// - Probar conexión TLS/SMTP sin enviar mensajes
// - Enviar un correo de prueba controlado al administrador autenticado (previa confirmación)
// - Consultar el historial filtrable de correos y sus estados honestos de entrega
// ==============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { FormInput } from '../../src/components/FormInput';
import { FormButton } from '../../src/components/FormButton';
import {
    AtelierEmailAccount,
    AtelierEmailLogItem,
    EMAIL_LOG_STATUSES,
    EMAIL_MODULE_ORIGINS,
    EMAIL_PURPOSES,
    EmailLogStatus,
    EmailModuleOrigin,
    EmailPurpose,
    UpsertAtelierEmailAccountDTO,
} from '../../src/types/communications';
import {
    CANONICAL_ZIMBRA_HOST,
    CANONICAL_ZIMBRA_PORT,
    EMAIL_MODULE_ORIGIN_LABELS,
    EMAIL_PURPOSE_META,
    EMAIL_STATUS_META,
    fetchEmailAccounts,
    fetchEmailLogs,
    saveEmailAccount,
    sendControlledTestEmail,
    testEmailAccountConnection,
    toggleEmailAccount,
    validateEmailAccountInput,
} from '../../src/services/communicationsService';

type ActiveTab = 'accounts' | 'logs';

function formatDateTime(iso?: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

export default function CommunicationsScreen() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<ActiveTab>('accounts');

    // Estado de cuentas
    const [accounts, setAccounts] = useState<AtelierEmailAccount[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState<boolean>(true);
    const [actingAccountId, setActingAccountId] = useState<string | null>(null);

    // Estado de historial
    const [logs, setLogs] = useState<AtelierEmailLogItem[]>([]);
    const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
    const [filterPurpose, setFilterPurpose] = useState<EmailPurpose | 'all'>('all');
    const [filterModule, setFilterModule] = useState<EmailModuleOrigin | 'all'>('all');
    const [filterStatus, setFilterStatus] = useState<EmailLogStatus | 'all'>('all');
    const [filterDateFrom, setFilterDateFrom] = useState<string>('');
    const [filterDateTo, setFilterDateTo] = useState<string>('');

    // Notificaciones
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Modal de edición de cuenta (campo write-only para contraseña)
    const [editingAccount, setEditingAccount] = useState<AtelierEmailAccount | null>(null);
    const [editForm, setEditForm] = useState<UpsertAtelierEmailAccountDTO | null>(null);
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Modal de confirmación para envío de correo de prueba
    const [confirmTestAccount, setConfirmTestAccount] = useState<AtelierEmailAccount | null>(null);
    const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

    const loadAccounts = useCallback(async () => {
        setLoadingAccounts(true);
        const res = await fetchEmailAccounts();
        if (res.error) {
            setErrorMessage(res.error);
        }
        setAccounts(res.accounts);
        setLoadingAccounts(false);
    }, []);

    const loadLogs = useCallback(async () => {
        setLoadingLogs(true);
        const res = await fetchEmailLogs({
            purpose: filterPurpose,
            module_origin: filterModule,
            status: filterStatus,
            date_from: filterDateFrom.trim()
                ? `${filterDateFrom.trim()}T00:00:00.000Z`
                : undefined,
            date_to: filterDateTo.trim()
                ? `${filterDateTo.trim()}T23:59:59.999Z`
                : undefined,
            limit: 60,
        });
        if (res.error) {
            setErrorMessage(res.error);
        }
        setLogs(res.logs);
        setLoadingLogs(false);
    }, [filterPurpose, filterModule, filterStatus, filterDateFrom, filterDateTo]);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const res = await fetchEmailAccounts();
            if (cancelled) return;
            if (res.error) {
                setErrorMessage(res.error);
            }
            setAccounts(res.accounts);
            setLoadingAccounts(false);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSelectTab = (tab: ActiveTab) => {
        setActiveTab(tab);
        if (tab === 'logs') {
            void loadLogs();
        }
    };

    const openEditModal = (acc: AtelierEmailAccount) => {
        setErrorMessage(null);
        setSuccessMessage(null);
        setEditErrors({});
        setEditingAccount(acc);
        setEditForm({
            purpose: acc.purpose,
            display_name: acc.display_name,
            from_email: acc.from_email,
            reply_to_email: acc.reply_to_email,
            smtp_host: acc.smtp_host || CANONICAL_ZIMBRA_HOST,
            smtp_port: acc.smtp_port || CANONICAL_ZIMBRA_PORT,
            smtp_secure: true,
            smtp_user: acc.smtp_user,
            smtp_password: '',
            is_active: acc.is_active,
        });
    };

    const closeEditModal = () => {
        if (isSaving) return;
        setEditingAccount(null);
        setEditForm(null);
        setEditErrors({});
    };

    const handleSaveAccount = async () => {
        if (!editingAccount || !editForm) return;
        // R1/R2: Guardar configuración nunca activa automáticamente la cuenta;
        // si cambia contraseña o usuario/remitente, el servidor reinicia verificación y desactiva.
        const hasNewPass = Boolean(editForm.smtp_password && editForm.smtp_password.trim().length > 0);
        const identityChanged =
            (editForm.from_email?.trim().toLowerCase() || null) !== (editingAccount.from_email || null) ||
            (editForm.smtp_user?.trim().toLowerCase() || null) !== (editingAccount.smtp_user || null);
        const safeForm: UpsertAtelierEmailAccountDTO = {
            ...editForm,
            is_active:
                hasNewPass || identityChanged
                    ? false
                    : editingAccount.is_active && editingAccount.last_verification_status === 'verified',
        };

        const validation = validateEmailAccountInput(safeForm, editingAccount.has_credential);
        if (!validation.isValid) {
            setEditErrors(validation.errors);
            return;
        }

        setEditErrors({});
        setIsSaving(true);
        const res = await saveEmailAccount(safeForm, editingAccount.has_credential);
        setIsSaving(false);

        if (!res.success || !res.account) {
            setEditErrors({ general: res.error || 'No se pudo guardar la cuenta.' });
            return;
        }

        const updated = res.account;
        setAccounts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setSuccessMessage(
            res.credentialUpdated
                ? `Cuenta "${EMAIL_PURPOSE_META[updated.purpose].title}" actualizada y credencial guardada en Vault. Ejecuta "Probar Conexión" antes de activar.`
                : `Cuenta "${EMAIL_PURPOSE_META[updated.purpose].title}" actualizada (credencial previa conservada).`
        );
        closeEditModal();
    };

    const handleToggleActive = async (acc: AtelierEmailAccount) => {
        setErrorMessage(null);
        setSuccessMessage(null);
        setActingAccountId(acc.id);
        const res = await toggleEmailAccount(acc.id, !acc.is_active);
        setActingAccountId(null);

        if (!res.success || !res.account) {
            setErrorMessage(res.error || 'No se pudo actualizar el estado de la cuenta.');
            return;
        }

        const updated = res.account;
        setAccounts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setSuccessMessage(
            updated.is_active
                ? `Propósito "${EMAIL_PURPOSE_META[updated.purpose].title}" activado.`
                : `Propósito "${EMAIL_PURPOSE_META[updated.purpose].title}" desactivado.`
        );
    };

    const handleTestConnection = async (acc: AtelierEmailAccount) => {
        setErrorMessage(null);
        setSuccessMessage(null);
        setActingAccountId(acc.id);
        const res = await testEmailAccountConnection(acc.id);
        setActingAccountId(null);

        setAccounts((prev) =>
            prev.map((item) =>
                item.id === acc.id
                    ? {
                        ...item,
                        last_verified_at: res.last_verified_at || item.last_verified_at,
                        last_verification_status: res.status,
                    }
                    : item
            )
        );

        if (res.ok) {
            setSuccessMessage(
                `Conexión verificada (${EMAIL_PURPOSE_META[acc.purpose].title}): ${res.message}`
            );
        } else {
            setErrorMessage(
                `Fallo en prueba de conexión (${EMAIL_PURPOSE_META[acc.purpose].title}): ${res.message}`
            );
        }
    };

    const handleConfirmSendTestEmail = async () => {
        if (!confirmTestAccount) return;
        setIsSendingTest(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        const res = await sendControlledTestEmail(confirmTestAccount.id, true);
        setIsSendingTest(false);
        setConfirmTestAccount(null);

        await loadAccounts();
        if (res.ok) {
            setSuccessMessage(
                `${res.message}${res.message_id ? ` (ID: ${res.message_id})` : ''}`
            );
        } else {
            setErrorMessage(res.message);
        }
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <StatusBar style="dark" />

            {/* Navegación superior */}
            <View style={styles.topNavRow}>
                <TouchableOpacity
                    onPress={() => router.replace('/(admin)')}
                    style={styles.backButton}
                    activeOpacity={0.8}
                >
                    <Text style={styles.backButtonText}>← Volver a Administración</Text>
                </TouchableOpacity>

                <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>ROL: ADMINISTRADOR</Text>
                </View>
            </View>

            {/* Encabezado Editorial */}
            <View style={styles.header}>
                <Text style={styles.brand}>ATELIER DIGITAL</Text>
                <View style={styles.divider} />
                <Text style={styles.eyebrow}>BY KATHERINE CARROLL</Text>
                <Text style={styles.title}>Comunicaciones y Correos</Text>
                <Text style={styles.subtitle}>
                    Gestión centralizada de cuentas SMTP Zimbra por propósito, bóveda cifrada Vault e historial de estados de envío
                </Text>
            </View>

            {/* Pestañas principales */}
            <View style={styles.tabsRow}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'accounts' && styles.tabBtnActive]}
                    onPress={() => handleSelectTab('accounts')}
                    activeOpacity={0.85}
                >
                    <Text style={[styles.tabText, activeTab === 'accounts' && styles.tabTextActive]}>
                        Cuentas y Propósitos ({accounts.length || 5})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'logs' && styles.tabBtnActive]}
                    onPress={() => handleSelectTab('logs')}
                    activeOpacity={0.85}
                >
                    <Text style={[styles.tabText, activeTab === 'logs' && styles.tabTextActive]}>
                        Historial y Estados
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Notificaciones */}
            {successMessage && (
                <View style={styles.successBanner}>
                    <Text style={styles.successText}>✦ {successMessage}</Text>
                    <TouchableOpacity onPress={() => setSuccessMessage(null)}>
                        <Text style={styles.dismissText}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {errorMessage && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>⚠ {errorMessage}</Text>
                    <TouchableOpacity onPress={() => setErrorMessage(null)}>
                        <Text style={styles.dismissText}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {activeTab === 'accounts' ? (
                <View style={styles.sectionStack}>
                    {loadingAccounts ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color={colors.champagneGold} />
                            <Text style={styles.loadingText}>Cargando cuentas SMTP...</Text>
                        </View>
                    ) : accounts.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyTitle}>Sin cuentas cargadas desde el servidor</Text>
                            <Text style={styles.emptyText}>
                                Aplica la migración SQL de comunicaciones y despliega la Edge Function admin-email-config en la etapa autorizada para administrar las 5 cuentas en vivo.
                            </Text>
                        </View>
                    ) : (
                        accounts.map((acc) => {
                            const meta = EMAIL_PURPOSE_META[acc.purpose];
                            const isBusy = actingAccountId === acc.id;
                            const canTest =
                                Boolean(acc.from_email) &&
                                Boolean(acc.smtp_user) &&
                                acc.has_credential;
                            const canActivate =
                                canTest && acc.last_verification_status === 'verified';

                            return (
                                <View key={acc.id} style={styles.accountCard}>
                                    <View style={styles.accountHeader}>
                                        <View style={styles.accountHeaderLeft}>
                                            <View style={styles.modulePill}>
                                                <Text style={styles.modulePillText}>
                                                    {meta.moduleBadge}
                                                </Text>
                                            </View>
                                            <Text style={styles.accountTitle}>{meta.title}</Text>
                                        </View>

                                        <View
                                            style={[
                                                styles.statePill,
                                                acc.is_active
                                                    ? styles.statePillActive
                                                    : styles.statePillInactive,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.statePillText,
                                                    acc.is_active
                                                        ? styles.statePillTextActive
                                                        : styles.statePillTextInactive,
                                                ]}
                                            >
                                                {acc.is_active ? 'ACTIVA' : 'INACTIVA'}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.accountDesc}>{meta.description}</Text>

                                    <View style={styles.metaGrid}>
                                        <Text style={styles.metaLine}>
                                            <Text style={styles.metaLabel}>Propósito: </Text>
                                            {acc.purpose}
                                        </Text>
                                        <Text style={styles.metaLine}>
                                            <Text style={styles.metaLabel}>Remitente: </Text>
                                            {acc.from_email
                                                ? `${acc.display_name} <${acc.from_email}>`
                                                : 'Pendiente de definir'}
                                        </Text>
                                        <Text style={styles.metaLine}>
                                            <Text style={styles.metaLabel}>Reply-To: </Text>
                                            {acc.reply_to_email || '—'}
                                        </Text>
                                        <Text style={styles.metaLine}>
                                            <Text style={styles.metaLabel}>SMTP: </Text>
                                            {acc.smtp_host}:{acc.smtp_port} (SSL/TLS implícito · TLSv1.2+)
                                        </Text>
                                        <Text style={styles.metaLine}>
                                            <Text style={styles.metaLabel}>Credencial Vault: </Text>
                                            {acc.has_credential
                                                ? 'Configurada y cifrada (write-only)'
                                                : 'Sin credencial configurada'}
                                        </Text>
                                        <Text style={styles.metaLine}>
                                            <Text style={styles.metaLabel}>Última verificación: </Text>
                                            {acc.last_verification_status.toUpperCase()} ·{' '}
                                            {formatDateTime(acc.last_verified_at)}
                                        </Text>
                                    </View>

                                    <View style={styles.cardActionsRow}>
                                        <TouchableOpacity
                                            style={styles.actionBtnPrimary}
                                            onPress={() => openEditModal(acc)}
                                            disabled={isBusy}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.actionBtnPrimaryText}>
                                                Editar Cuenta
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[
                                                styles.actionBtnSecondary,
                                                !acc.is_active && !canActivate && styles.actionBtnDisabled,
                                            ]}
                                            onPress={() => handleToggleActive(acc)}
                                            disabled={isBusy || (!acc.is_active && !canActivate)}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.actionBtnSecondaryText}>
                                                {acc.is_active ? 'Desactivar' : 'Activar'}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[
                                                styles.actionBtnSecondary,
                                                !canTest && styles.actionBtnDisabled,
                                            ]}
                                            onPress={() => handleTestConnection(acc)}
                                            disabled={isBusy || !canTest}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.actionBtnSecondaryText}>
                                                Probar Conexión
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[
                                                styles.actionBtnSecondary,
                                                !canTest && styles.actionBtnDisabled,
                                            ]}
                                            onPress={() => setConfirmTestAccount(acc)}
                                            disabled={isBusy || !canTest}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.actionBtnSecondaryText}>
                                                Enviar Prueba
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )}

                    {/* Nota de frontera con Supabase Auth */}
                    <View style={styles.infoNoticeCard}>
                        <Text style={styles.infoNoticeEyebrow}>FRONTERA DE INFRAESTRUCTURA</Text>
                        <Text style={styles.infoNoticeTitle}>
                            Supabase Auth SMTP permanece independiente
                        </Text>
                        <Text style={styles.infoNoticeText}>
                            Los correos de registro y recuperación de contraseña de la plataforma utilizan el SMTP global configurado en Supabase Dashboard y no se modifican desde esta pantalla. Las contraseñas de estas 5 cuentas residen cifradas en Supabase Vault y nunca se devuelven al navegador.
                        </Text>
                    </View>
                </View>
            ) : (
                <View style={styles.sectionStack}>
                    {/* Aviso honesto sobre seguimiento de entrega en Zimbra */}
                    <View style={styles.infoNoticeCard}>
                        <Text style={styles.infoNoticeEyebrow}>TRANSPARENCIA DE ENTREGA · ZIMBRA SMTP</Text>
                        <Text style={styles.infoNoticeTitle}>
                            Aceptación SMTP no equivale a entrega en bandeja
                        </Text>
                        <Text style={styles.infoNoticeText}>
                            El servidor Zimbra (mail.itss-proactive.com:465) no anuncia DSN (RFC 3461). Un envío aceptado con 250 OK se registra como ACEPTADO SMTP (o ENTREGA NO CONFIRMADA si no existe evidencia posterior). El estado ENTREGADO solo se asigna cuando existe confirmación verificable.
                        </Text>
                    </View>

                    {/* Filtros de Historial */}
                    <View style={styles.filtersCard}>
                        <Text style={styles.filterGroupLabel}>FILTRAR POR PROPÓSITO</Text>
                        <View style={styles.chipsRow}>
                            <TouchableOpacity
                                style={[styles.chip, filterPurpose === 'all' && styles.chipActive]}
                                onPress={() => setFilterPurpose('all')}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        filterPurpose === 'all' && styles.chipTextActive,
                                    ]}
                                >
                                    Todos
                                </Text>
                            </TouchableOpacity>
                            {EMAIL_PURPOSES.map((p) => (
                                <TouchableOpacity
                                    key={p}
                                    style={[styles.chip, filterPurpose === p && styles.chipActive]}
                                    onPress={() => setFilterPurpose(p)}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            filterPurpose === p && styles.chipTextActive,
                                        ]}
                                    >
                                        {EMAIL_PURPOSE_META[p].moduleBadge}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.filterGroupLabel}>FILTRAR POR MÓDULO</Text>
                        <View style={styles.chipsRow}>
                            <TouchableOpacity
                                style={[styles.chip, filterModule === 'all' && styles.chipActive]}
                                onPress={() => setFilterModule('all')}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        filterModule === 'all' && styles.chipTextActive,
                                    ]}
                                >
                                    Todos
                                </Text>
                            </TouchableOpacity>
                            {EMAIL_MODULE_ORIGINS.map((m) => (
                                <TouchableOpacity
                                    key={m}
                                    style={[styles.chip, filterModule === m && styles.chipActive]}
                                    onPress={() => setFilterModule(m)}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            filterModule === m && styles.chipTextActive,
                                        ]}
                                    >
                                        {EMAIL_MODULE_ORIGIN_LABELS[m]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.filterGroupLabel}>FILTRAR POR ESTADO</Text>
                        <View style={styles.chipsRow}>
                            <TouchableOpacity
                                style={[styles.chip, filterStatus === 'all' && styles.chipActive]}
                                onPress={() => setFilterStatus('all')}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        filterStatus === 'all' && styles.chipTextActive,
                                    ]}
                                >
                                    Todos
                                </Text>
                            </TouchableOpacity>
                            {EMAIL_LOG_STATUSES.map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.chip, filterStatus === s && styles.chipActive]}
                                    onPress={() => setFilterStatus(s)}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            filterStatus === s && styles.chipTextActive,
                                        ]}
                                    >
                                        {EMAIL_STATUS_META[s].label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.dateRow}>
                            <View style={styles.dateCol}>
                                <Text style={styles.filterGroupLabel}>DESDE (YYYY-MM-DD)</Text>
                                <TextInput
                                    style={styles.dateInput}
                                    value={filterDateFrom}
                                    onChangeText={setFilterDateFrom}
                                    placeholder="2026-11-01"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                            <View style={styles.dateCol}>
                                <Text style={styles.filterGroupLabel}>HASTA (YYYY-MM-DD)</Text>
                                <TextInput
                                    style={styles.dateInput}
                                    value={filterDateTo}
                                    onChangeText={setFilterDateTo}
                                    placeholder="2026-11-30"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.refreshBtn}
                            onPress={loadLogs}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.refreshBtnText}>Aplicar Filtros / Actualizar</Text>
                        </TouchableOpacity>
                    </View>

                    {loadingLogs ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color={colors.champagneGold} />
                            <Text style={styles.loadingText}>Consultando historial de correos...</Text>
                        </View>
                    ) : logs.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyTitle}>Sin registros para los filtros actuales</Text>
                            <Text style={styles.emptyText}>
                                Los correos aceptados por SMTP o fallidos aparecerán aquí sin almacenar contraseñas, tokens ni contenido sensible.
                            </Text>
                        </View>
                    ) : (
                        logs.map((log) => {
                            const st = EMAIL_STATUS_META[log.status];
                            return (
                                <View key={log.id} style={styles.logCard}>
                                    <View style={styles.logHeader}>
                                        <View
                                            style={[
                                                styles.logStatusBadge,
                                                {
                                                    backgroundColor: st.bg,
                                                    borderColor: st.border,
                                                },
                                            ]}
                                        >
                                            <Text style={[styles.logStatusText, { color: st.text }]}>
                                                {st.label}
                                            </Text>
                                        </View>
                                        <Text style={styles.logDate}>
                                            {formatDateTime(log.sent_at || log.created_at)}
                                        </Text>
                                    </View>

                                    <Text style={styles.metaLine}>
                                        <Text style={styles.metaLabel}>Propósito / Módulo: </Text>
                                        {log.purpose} · {EMAIL_MODULE_ORIGIN_LABELS[log.module_origin]}
                                    </Text>
                                    <Text style={styles.metaLine}>
                                        <Text style={styles.metaLabel}>De → Para: </Text>
                                        {log.from_email} → {log.recipient_email}
                                    </Text>
                                    {log.message_id ? (
                                        <Text style={styles.metaLine}>
                                            <Text style={styles.metaLabel}>Message-ID: </Text>
                                            {log.message_id}
                                        </Text>
                                    ) : null}
                                    {log.smtp_response ? (
                                        <Text style={styles.metaLine}>
                                            <Text style={styles.metaLabel}>Respuesta SMTP: </Text>
                                            {log.smtp_response}
                                        </Text>
                                    ) : null}
                                    {log.error_code || log.error_description ? (
                                        <Text style={[styles.metaLine, { color: colors.error }]}>
                                            <Text style={styles.metaLabel}>Error: </Text>
                                            {log.error_code || 'error'} — {log.error_description || ''}
                                        </Text>
                                    ) : null}
                                </View>
                            );
                        })
                    )}
                </View>
            )}

            {/* Modal de Edición de Cuenta (Write-Only) */}
            <Modal
                visible={Boolean(editingAccount && editForm)}
                transparent
                animationType="fade"
                onRequestClose={closeEditModal}
            >
                <View style={styles.modalOverlay}>
                    <ScrollView
                        style={styles.modalScroll}
                        contentContainerStyle={styles.modalCard}
                        showsVerticalScrollIndicator={false}
                    >
                        {editingAccount && editForm && (
                            <>
                                <Text style={styles.modalEyebrow}>
                                    CONFIGURAR PROPÓSITO · {editingAccount.purpose.toUpperCase()}
                                </Text>
                                <Text style={styles.modalTitle}>
                                    {EMAIL_PURPOSE_META[editingAccount.purpose].title}
                                </Text>

                                {editErrors.general ? (
                                    <View style={styles.errorBanner}>
                                        <Text style={styles.errorText}>⚠ {editErrors.general}</Text>
                                    </View>
                                ) : null}

                                <FormInput
                                    label="Nombre visible del remitente"
                                    value={editForm.display_name}
                                    onChangeText={(text) =>
                                        setEditForm({ ...editForm, display_name: text })
                                    }
                                    error={editErrors.display_name}
                                    editable={!isSaving}
                                />

                                <FormInput
                                    label="Correo remitente (From)"
                                    placeholder={EMAIL_PURPOSE_META[editingAccount.purpose].defaultSenderHint}
                                    value={editForm.from_email || ''}
                                    onChangeText={(text) =>
                                        setEditForm({ ...editForm, from_email: text || null })
                                    }
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    error={editErrors.from_email}
                                    editable={!isSaving}
                                />

                                <FormInput
                                    label="Correo de respuesta (Reply-To)"
                                    placeholder="info@bykatherinecarroll.com"
                                    value={editForm.reply_to_email || ''}
                                    onChangeText={(text) =>
                                        setEditForm({ ...editForm, reply_to_email: text || null })
                                    }
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    error={editErrors.reply_to_email}
                                    editable={!isSaving}
                                />

                                <FormInput
                                    label="Servidor SMTP (Validación TLS estricta)"
                                    value={editForm.smtp_host}
                                    onChangeText={(text) =>
                                        setEditForm({ ...editForm, smtp_host: text })
                                    }
                                    autoCapitalize="none"
                                    error={editErrors.smtp_host}
                                    editable={!isSaving}
                                />

                                <FormInput
                                    label="Puerto SMTP (SSL/TLS implícito)"
                                    value={String(editForm.smtp_port)}
                                    onChangeText={(text) =>
                                        setEditForm({
                                            ...editForm,
                                            smtp_port: Number(text.replace(/[^0-9]/g, '')) || 465,
                                        })
                                    }
                                    keyboardType="numeric"
                                    error={editErrors.smtp_port}
                                    editable={!isSaving}
                                />

                                <FormInput
                                    label="Usuario SMTP"
                                    placeholder={EMAIL_PURPOSE_META[editingAccount.purpose].defaultSenderHint}
                                    value={editForm.smtp_user || ''}
                                    onChangeText={(text) =>
                                        setEditForm({ ...editForm, smtp_user: text || null })
                                    }
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    error={editErrors.smtp_user}
                                    editable={!isSaving}
                                />

                                <FormInput
                                    label={
                                        editingAccount.has_credential
                                            ? 'Nueva contraseña SMTP (write-only · dejar vacío para conservar)'
                                            : 'Contraseña SMTP (write-only · se cifra en Supabase Vault)'
                                    }
                                    placeholder={
                                        editingAccount.has_credential
                                            ? '•••••••• (conservar credencial actual)'
                                            : 'Ingresa la contraseña SMTP'
                                    }
                                    value={editForm.smtp_password || ''}
                                    onChangeText={(text) =>
                                        setEditForm({ ...editForm, smtp_password: text })
                                    }
                                    secureTextEntry
                                    autoCapitalize="none"
                                    error={editErrors.smtp_password}
                                    editable={!isSaving}
                                />

                                <View style={styles.tlsGuardNotice}>
                                    <Text style={styles.tlsGuardText}>
                                        TLS Estricto Obligatorio: puerto 465 · SSL/TLS implícito · TLSv1.2+ · verificación de certificado activa.
                                    </Text>
                                </View>

                                <View style={styles.toggleRow}>
                                    <Text style={styles.toggleLabel}>
                                        Separación Guardar / Activar:{' '}
                                        {editingAccount.is_active ? 'ACTIVA' : 'INACTIVA'}
                                    </Text>
                                    <Text style={styles.toggleHint}>
                                        Guardar o rotar credenciales reinicia verificación (UNTESTED) y requiere Probar Conexión antes de activar.
                                    </Text>
                                </View>

                                <View style={styles.modalActions}>
                                    <FormButton
                                        title="Guardar Configuración"
                                        onPress={handleSaveAccount}
                                        variant="primary"
                                        loading={isSaving}
                                    />
                                    <TouchableOpacity
                                        style={styles.cancelBtn}
                                        onPress={closeEditModal}
                                        disabled={isSaving}
                                    >
                                        <Text style={styles.cancelBtnText}>Cancelar</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </ScrollView>
                </View>
            </Modal>

            {/* Modal de Confirmación para Correo de Prueba */}
            <Modal
                visible={Boolean(confirmTestAccount)}
                transparent
                animationType="fade"
                onRequestClose={() => !isSendingTest && setConfirmTestAccount(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.confirmCard}>
                        <Text style={styles.modalEyebrow}>CONFIRMACIÓN OBLIGATORIA</Text>
                        <Text style={styles.modalTitle}>Enviar Correo de Prueba</Text>
                        <Text style={styles.confirmText}>
                            Se enviará un único mensaje de prueba usando la cuenta{' '}
                            <Text style={{ fontWeight: '700' }}>
                                {confirmTestAccount?.from_email || '—'}
                            </Text>{' '}
                            hacia tu correo de administrador autenticado (
                            <Text style={{ fontWeight: '700' }}>
                                {profile?.email || 'administrador autenticado'}
                            </Text>
                            ). El resultado se registrará en el historial como ACEPTADO SMTP o FALLIDO.
                        </Text>

                        <View style={styles.modalActions}>
                            <FormButton
                                title="Confirmar y Enviar Prueba"
                                onPress={handleConfirmSendTestEmail}
                                variant="primary"
                                loading={isSendingTest}
                            />
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setConfirmTestAccount(null)}
                                disabled={isSendingTest}
                            >
                                <Text style={styles.cancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.ivoryWarm },
    content: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 64, maxWidth: 960, width: '100%', alignSelf: 'center' },
    topNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
    backButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 2, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    backButtonText: { fontFamily: typography.sans, fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
    badgeContainer: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.atelierBlack, borderRadius: 2 },
    badgeText: { color: colors.champagneGold, fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
    header: { marginBottom: 24 },
    brand: { fontSize: 11, letterSpacing: 3, color: colors.champagneGold, fontWeight: '700', marginBottom: 6 },
    divider: { width: 42, height: 1, backgroundColor: colors.champagneGold, marginBottom: 8 },
    eyebrow: { fontSize: 10, letterSpacing: 2, color: colors.textSecondary, marginBottom: 4 },
    title: { fontFamily: typography.serif, fontSize: 30, fontWeight: '400', color: colors.atelierBlack, marginBottom: 6 },
    subtitle: { fontFamily: typography.sans, fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
    tabsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    tabBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', borderRadius: 2 },
    tabBtnActive: { backgroundColor: colors.atelierBlack, borderColor: colors.atelierBlack },
    tabText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    tabTextActive: { color: colors.ivoryWarm },
    successBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.successBg, borderColor: colors.successBorder, borderWidth: 1, padding: 14, borderRadius: 2, marginBottom: 16, gap: 10 },
    successText: { color: colors.success, fontSize: 13, flex: 1 },
    errorBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.errorBg, borderColor: colors.errorBorder, borderWidth: 1, padding: 14, borderRadius: 2, marginBottom: 16, gap: 10 },
    errorText: { color: colors.error, fontSize: 13, flex: 1 },
    dismissText: { color: colors.textSecondary, fontWeight: '700', paddingHorizontal: 6 },
    sectionStack: { gap: 16 },
    loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
    loadingText: { color: colors.textSecondary, fontSize: 13 },
    emptyCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 24, borderRadius: 2 },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.atelierBlack, marginBottom: 6 },
    emptyText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
    accountCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 20, borderRadius: 2, gap: 12 },
    accountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    accountHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
    modulePill: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 2 },
    modulePillText: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: colors.bronze },
    accountTitle: { fontSize: 16, fontWeight: '700', color: colors.atelierBlack },
    statePill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 2, borderWidth: 1 },
    statePillActive: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
    statePillInactive: { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
    statePillText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    statePillTextActive: { color: colors.success },
    statePillTextInactive: { color: colors.textSecondary },
    accountDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    metaGrid: { backgroundColor: colors.ivoryWarm, borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 2, gap: 4 },
    metaLine: { fontSize: 12, color: colors.textPrimary, lineHeight: 18 },
    metaLabel: { fontWeight: '700', color: colors.textSecondary },
    cardActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    actionBtnPrimary: { backgroundColor: colors.atelierBlack, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 2 },
    actionBtnPrimaryText: { color: colors.ivoryWarm, fontSize: 12, fontWeight: '600' },
    actionBtnSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 2 },
    actionBtnSecondaryText: { color: colors.atelierBlack, fontSize: 12, fontWeight: '600' },
    actionBtnDisabled: { opacity: 0.45 },
    infoNoticeCard: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, padding: 18, borderRadius: 2, gap: 6 },
    infoNoticeEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.champagneGold },
    infoNoticeTitle: { fontSize: 14, fontWeight: '700', color: colors.atelierBlack },
    infoNoticeText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
    filtersCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 18, borderRadius: 2, gap: 10 },
    filterGroupLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: colors.textSecondary },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
    chip: { paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.ivoryWarm, borderRadius: 2 },
    chipActive: { backgroundColor: colors.atelierBlack, borderColor: colors.atelierBlack },
    chipText: { fontSize: 11, color: colors.textPrimary, fontWeight: '600' },
    chipTextActive: { color: colors.ivoryWarm },
    dateRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    dateCol: { flex: 1, minWidth: 150, gap: 4 },
    dateInput: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.ivoryWarm, paddingVertical: 8, paddingHorizontal: 10, fontSize: 13, color: colors.textPrimary, borderRadius: 2 },
    refreshBtn: { backgroundColor: colors.atelierBlack, paddingVertical: 11, alignItems: 'center', borderRadius: 2, marginTop: 4 },
    refreshBtnText: { color: colors.ivoryWarm, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
    logCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 16, borderRadius: 2, gap: 4 },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 },
    logStatusBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 2, borderWidth: 1 },
    logStatusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
    logDate: { fontSize: 11, color: colors.textMuted },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(23, 20, 17, 0.58)', justifyContent: 'center', alignItems: 'center', padding: 18 },
    modalScroll: { width: '100%', maxWidth: 560, maxHeight: '90%' },
    modalCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 24, borderRadius: 2, gap: 10 },
    confirmCard: { width: '100%', maxWidth: 480, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 24, borderRadius: 2, gap: 12 },
    modalEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.champagneGold },
    modalTitle: { fontSize: 20, fontWeight: '700', color: colors.atelierBlack, marginBottom: 4 },
    confirmText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
    tlsGuardNotice: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, padding: 10, borderRadius: 2 },
    tlsGuardText: { fontSize: 11, color: colors.textSecondary, lineHeight: 16 },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.ivoryWarm, borderRadius: 2, marginTop: 4 },
    toggleLabel: { fontSize: 13, fontWeight: '700', color: colors.atelierBlack },
    toggleHint: { fontSize: 11, color: colors.champagneGold, fontWeight: '600' },
    modalActions: { gap: 10, marginTop: 8 },
    cancelBtn: { paddingVertical: 10, alignItems: 'center' },
    cancelBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
});
