// ==============================================================================
// ATELIER DIGITAL — PORTAL DE CLIENTAS: ACEPTACIÓN DE INVITACIÓN (M09-B.4)
// Archivo: app/portal/invite.tsx
// ==============================================================================
// Experiencia ceremonial de bienvenida de alta costura alineada con By Katherine Carroll.
// Seguridad & Contratos (M09-A v2.10):
// 1. Extracción y limpieza inmediata del token en URL (Web history.replaceState).
// 2. Verificación criptográfica remota vía Edge Function accept-portal-invitation.
// 3. Manejo explícito de estados: válido, inválido, expirado, revocado, reutilizado,
//    lease activo (409), reconciliación pendiente (504), backend no disponible (DEMO).
// 4. Guardia previa de identidad nuclear: bloquea roles privilegiados (admin/designer)
//    y discrepancias multi-tenant sin sobrescribir perfiles ni roles existentes.
// 5. Vinculación idempotente por terna Saga (token + operationId + auth_user_id).
// 6. Cero simulación criptográfica en MODO DEMO ni escrituras remotas no autorizadas.
// ==============================================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { FormInput } from '../../src/components/FormInput';
import { FormButton } from '../../src/components/FormButton';
import {
    LegalConsentCheckbox,
    PrivacyNoticeBanner,
} from '../../src/components/PrivacyNoticeBanner';
import { LEGAL_DOCUMENT_VERSIONS } from '../../src/constants/legalDocuments';
import {
    PortalInvitationAcceptResult,
    PortalInvitationFlowOutcome,
    PortalInvitationVerifyResult,
} from '../../src/types/portal';
import {
    acceptPortalInvitation,
    evaluateInvitationIdentityGuard,
    generateSagaOperationId,
    validateInvitationTokenFormat,
    verifyPortalInvitationToken,
} from '../../src/services/portalService';

// Activos visuales reales de la Casa de Alta Costura (sin datos sensibles de clientas)
const HERO_ATELIER_IMAGE = require('../../assets/service_couture.jpg');
const LOGO_TRANSPARENT = require('../../assets/logo_transparent.png');
const FLOURISH_IMAGE = require('../../assets/flourish.png');
const CARD_CREATIONS = require('../../assets/cards/card_creations.jpg');
const CARD_FITTING = require('../../assets/cards/card_fitting.jpg');
const CARD_SECURITY = require('../../assets/cards/card_security.jpg');

type ActivationTab = 'new_access' | 'existing_account';

function extractInitialToken(paramToken?: string | string[]): string {
    if (typeof paramToken === 'string' && paramToken.trim()) {
        return paramToken.trim();
    }
    if (Array.isArray(paramToken) && typeof paramToken[0] === 'string' && paramToken[0].trim()) {
        return paramToken[0].trim();
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.search) {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const t = urlParams.get('token');
            if (t && t.trim()) return t.trim();
        } catch {
            return '';
        }
    }
    return '';
}

function getPasswordStrengthInfo(password: string): {
    label: string;
    ratio: number;
    color: string;
} {
    if (!password) {
        return { label: 'Mínimo 8 caracteres recomendados', ratio: 0, color: colors.sand };
    }
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { label: 'Fortaleza inicial', ratio: 0.28, color: colors.error };
    if (score === 2) return { label: 'Fortaleza moderada', ratio: 0.56, color: '#B37D14' };
    if (score === 3) return { label: 'Fortaleza alta', ratio: 0.82, color: colors.champagneGold };
    return { label: 'Sello criptográfico óptimo', ratio: 1, color: colors.success };
}

function formatExpirationLabel(isoStr?: string | null): string | null {
    if (!isoStr) return null;
    try {
        return new Date(isoStr).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return isoStr;
    }
}

export default function PortalInviteScreen() {
    const params = useLocalSearchParams<{ token?: string | string[] }>();
    const initialToken = useMemo(() => extractInitialToken(params.token), [params.token]);

    const { user, session, profile, role, signIn, signOut, refreshProfile } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 960;
    const isMobile = width < 720;

    // Estado de token y trazabilidad Saga (nunca guardado en almacenamiento persistente ni consola)
    const [activeToken, setActiveToken] = useState<string>(initialToken);
    const [manualTokenInput, setManualTokenInput] = useState<string>(initialToken);
    const [showManualToken, setShowManualToken] = useState<boolean>(false);
    const [verifyNonce, setVerifyNonce] = useState<number>(0);
    const operationIdRef = useRef<string>(generateSagaOperationId());

    // Estados de verificación / aceptación
    const [verifying, setVerifying] = useState<boolean>(() => Boolean(initialToken));
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [verifyResult, setVerifyResult] = useState<PortalInvitationVerifyResult | null>(null);
    const [acceptResult, setAcceptResult] = useState<PortalInvitationAcceptResult | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    // Formularios de activación (clienta nueva o con cuenta existente)
    const [activationTab, setActivationTab] = useState<ActivationTab>('new_access');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [ageConfirmed, setAgeConfirmed] = useState<boolean>(false);
    const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
    const [privacyAccepted, setPrivacyAccepted] = useState<boolean>(false);

    // Sub-formulario inline de inicio de sesión si ya posee cuenta
    const [loginEmail, setLoginEmail] = useState<string>('');
    const [loginPassword, setLoginPassword] = useState<string>('');
    const [signingInInline, setSigningInInline] = useState<boolean>(false);

    // Limpieza inmediata y persistente del parámetro sensible ?token= en barra URL (Web),
    // preservando intactos otros query params inofensivos (ej. utm_source) y sin borrar el token en memoria.
    useEffect(() => {
        if (Platform.OS !== 'web' || typeof window === 'undefined') return;

        const scrubTokenParam = () => {
            try {
                const currentUrl = new URL(window.location.href);
                if (currentUrl.searchParams.has('token')) {
                    currentUrl.searchParams.delete('token');
                    const remainingSearch = currentUrl.searchParams.toString();
                    const cleanUrl = `${currentUrl.pathname}${remainingSearch ? `?${remainingSearch}` : ''}${currentUrl.hash || ''}`;
                    window.history.replaceState(window.history.state, document.title, cleanUrl);
                }
            } catch {
                // Silencio seguro si history.replaceState no está disponible
            }
        };

        if (params.token !== undefined) {
            try {
                router.setParams({ token: undefined } as any);
            } catch {
                // Silencio seguro si setParams aún no está listo
            }
        }

        scrubTokenParam();
        const rafId =
            typeof window.requestAnimationFrame === 'function'
                ? window.requestAnimationFrame(scrubTokenParam)
                : null;
        const timerId = window.setTimeout(scrubTokenParam, 80);

        return () => {
            if (rafId !== null && typeof window.cancelAnimationFrame === 'function') {
                window.cancelAnimationFrame(rafId);
            }
            window.clearTimeout(timerId);
        };
    }, [params.token]);

    // Higiene de secretos al desmontar pantalla
    useEffect(() => {
        return () => {
            setActiveToken('');
            setManualTokenInput('');
            setPassword('');
            setConfirmPassword('');
            setLoginPassword('');
        };
    }, []);

    const accessToken = session?.access_token ?? null;

    useEffect(() => {
        let cancelled = false;

        async function bootstrapVerification() {
            await Promise.resolve();
            if (cancelled) return;

            if (!activeToken) {
                const emptyCheck = await verifyPortalInvitationToken('');
                if (!cancelled) {
                    setVerifyResult(emptyCheck);
                    setVerifying(false);
                }
                return;
            }

            const result = await verifyPortalInvitationToken(activeToken, {
                accessToken,
            });
            if (!cancelled) {
                setVerifyResult(result);
                if (result.invitedEmail) {
                    setLoginEmail((prev) => prev || result.invitedEmail || '');
                }
                if (result.accountHint === 'existing_account') {
                    setActivationTab('existing_account');
                }
                setVerifying(false);
            }
        }

        void bootstrapVerification();

        return () => {
            cancelled = true;
        };
    }, [activeToken, accessToken, verifyNonce]);

    // Guardia previa en tiempo real contra cuentas privilegiadas y discrepancia multi-tenant
    const liveIdentityGuard = useMemo(() => {
        const appMetaRole =
            typeof user?.app_metadata?.role === 'string' ? user.app_metadata.role : null;
        return evaluateInvitationIdentityGuard({
            sessionUser: user ? { id: user.id, email: user.email } : null,
            profileRole: profile?.role ?? role ?? null,
            appMetadataRole: appMetaRole,
            invitedEmail: verifyResult?.invitedEmail ?? null,
        });
    }, [user, profile, role, verifyResult]);

    const effectiveOutcome: PortalInvitationFlowOutcome = useMemo(() => {
        if (verifying) return 'valid';
        if (acceptResult) {
            return acceptResult.outcome;
        }
        // Seguridad nuclear: bloquear inmediatamente si hay sesión privilegiada activa
        // salvo si falta token o backend no está desplegado (donde informamos ambas barreras)
        if (liveIdentityGuard.outcome !== 'ok' && verifyResult?.outcome !== 'backend_unavailable') {
            return liveIdentityGuard.outcome;
        }
        return verifyResult?.outcome || 'missing_token';
    }, [verifying, acceptResult, liveIdentityGuard, verifyResult]);

    const isDemoUnavailable =
        verifyResult?.environment === 'demo_unavailable' ||
        acceptResult?.environment === 'demo_unavailable' ||
        effectiveOutcome === 'backend_unavailable';

    const localTokenFormatCheck = useMemo(
        () => validateInvitationTokenFormat(activeToken),
        [activeToken]
    );

    // Progreso ceremonial de 3 pasos
    const currentStep = useMemo(() => {
        if (effectiveOutcome === 'accepted' || effectiveOutcome === 'already_accepted_self') {
            return 3;
        }
        if (effectiveOutcome === 'valid') {
            return 2;
        }
        return 1;
    }, [effectiveOutcome]);

    const handleManualVerifySubmit = () => {
        setFormError(null);
        setAcceptResult(null);
        // Nuevo código ingresado manualmente => nuevo operationId Saga
        operationIdRef.current = generateSagaOperationId();
        const trimmed = manualTokenInput.trim();
        setVerifying(true);
        setActiveToken(trimmed);
        setVerifyNonce((n) => n + 1);
    };

    const handleResetToTokenEntry = () => {
        setFormError(null);
        setAcceptResult(null);
        setVerifyResult({
            outcome: 'missing_token',
            environment: 'production',
            canAccept: false,
            tokenFormatValid: false,
            message:
                'Ingresa el código completo de tu invitación privada para verificarlo nuevamente.',
        });
        operationIdRef.current = generateSagaOperationId();
        setManualTokenInput('');
        setActiveToken('');
    };

    const handleSwitchAccountSignOut = async () => {
        setFormError(null);
        await signOut();
        setAcceptResult(null);
        if (activeToken) {
            setVerifying(true);
            setVerifyNonce((n) => n + 1);
        }
    };

    const handleInlineLogin = async () => {
        setFormError(null);
        if (!loginEmail.trim() || !loginPassword) {
            setFormError('Ingresa tu correo electrónico y contraseña habitual para continuar.');
            return;
        }
        setSigningInInline(true);
        try {
            const { error } = await signIn(loginEmail.trim(), loginPassword);
            if (error) {
                setFormError(error);
            } else {
                setLoginPassword('');
            }
        } catch (err: any) {
            setFormError(err?.message || 'No fue posible iniciar sesión.');
        } finally {
            setSigningInInline(false);
        }
    };

    const handleAcceptInvitation = async () => {
        setFormError(null);

        if (!user) {
            if (password.length < 8) {
                setFormError('Por tu seguridad, define una contraseña de al menos 8 caracteres.');
                return;
            }
            if (password !== confirmPassword) {
                setFormError('Las contraseñas ingresadas no coinciden.');
                return;
            }
            if (!ageConfirmed || !termsAccepted || !privacyAccepted) {
                setFormError(
                    'Debes confirmar mayoría de edad, Términos de Uso y Autorización de Datos (Ley 1581 de 2012) para activar tu portal.'
                );
                return;
            }
        }

        setSubmitting(true);
        try {
            const appMetaRole =
                typeof user?.app_metadata?.role === 'string' ? user.app_metadata.role : null;

            const result = await acceptPortalInvitation(
                {
                    token: activeToken,
                    operationId: operationIdRef.current,
                    ...(user ? {} : { password }),
                    consents: {
                        ageConfirmed: user ? true : ageConfirmed,
                        termsAccepted: user ? true : termsAccepted,
                        privacyAccepted: user ? true : privacyAccepted,
                        termsVersion: LEGAL_DOCUMENT_VERSIONS.TERMS_OF_SERVICE,
                        privacyVersion: LEGAL_DOCUMENT_VERSIONS.PRIVACY_POLICY,
                    },
                    sessionUser: user ? { id: user.id, email: user.email } : null,
                    profileRole: profile?.role ?? role ?? null,
                    appMetadataRole: appMetaRole,
                    expectedInvitedEmail: verifyResult?.invitedEmail ?? null,
                },
                { accessToken }
            );

            setAcceptResult(result);

            if (result.accepted) {
                // Si la clienta activó contraseña nueva y la Edge Function requiere sign-in cliente:
                if (!user && result.requiresSignIn && verifyResult?.invitedEmail && password) {
                    await signIn(verifyResult.invitedEmail, password);
                }
                await refreshProfile();
                setPassword('');
                setConfirmPassword('');
            }
        } catch (err: any) {
            setFormError(
                err?.message || 'Ocurrió un error inesperado al procesar tu invitación.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const strengthInfo = getPasswordStrengthInfo(password);
    const expirationLabel = formatExpirationLabel(verifyResult?.expiresAt);

    // Renderizado del bloque derecho según estado exacto
    const renderInvitationContent = () => {
        if (verifying) {
            return (
                <View style={styles.stateCardCentered}>
                    <View style={styles.goldSealCircle}>
                        <ActivityIndicator color={colors.champagneGold} size="small" />
                    </View>
                    <Text style={styles.stateEyebrow}>VERIFICACIÓN CRIPTOGRÁFICA EN CURSO</Text>
                    <Text style={styles.stateTitle}>Validando tu Invitación Privada</Text>
                    <Text style={styles.stateBody}>
                        Comprobamos la autenticidad del sello de un solo uso y la vigencia asignada por Katherine Carroll...
                    </Text>
                </View>
            );
        }

        // 1. MODO DEMO / Backend No Desplegado (NUNCA simula aceptación criptográfica)
        if (effectiveOutcome === 'backend_unavailable') {
            return (
                <View style={styles.panelFlowBlock}>
                    <View style={styles.demoWarningBanner}>
                        <View style={styles.demoBadgeRow}>
                            <Text style={styles.demoBadgeText}>
                                MODO DEMO · BACKEND CRIPTOGRÁFICO NO DISPONIBLE
                            </Text>
                        </View>
                        <Text style={styles.demoBannerHeadline}>
                            Aceptación en espera de autorización del servidor
                        </Text>
                        <Text style={styles.demoBannerBody}>
                            {verifyResult?.message ||
                                acceptResult?.message ||
                                'La migración M09-A v2.10 y la Edge Function accept-portal-invitation están pendientes de autorización y despliegue en Supabase.'}
                        </Text>

                        {activeToken ? (
                            <View style={styles.demoTokenCheckBox}>
                                <Text style={styles.demoTokenCheckLabel}>
                                    DIAGNÓSTICO DE SINTAXIS LOCAL (NO CRIPTOGRÁFICO):
                                </Text>
                                <Text style={styles.demoTokenCheckValue}>
                                    {localTokenFormatCheck.isValid
                                        ? '✓ Formato estructural compatible (256-bit URL-safe). Verificación criptográfica real pendiente de Edge Function.'
                                        : '✕ El formato estructural ingresado no cumple los 32–128 caracteres seguros.'}
                                </Text>
                            </View>
                        ) : null}

                        <View style={styles.demoGuaranteeBox}>
                            <Text style={styles.demoGuaranteeText}>
                                ✦ Garantía Zero Trust: 0 escrituras remotas ejecutadas · 0 perfiles alterados · 0 aceptaciones simuladas.
                            </Text>
                        </View>

                        {(verifyResult?.technicalDetail || acceptResult?.technicalDetail) && (
                            <Text style={styles.technicalDetailText} numberOfLines={3}>
                                Detalle técnico: {acceptResult?.technicalDetail || verifyResult?.technicalDetail}
                            </Text>
                        )}
                    </View>

                    {!liveIdentityGuard.allowed && (
                        <View style={styles.inlineNoticeBox}>
                            <Text style={styles.inlineNoticeText}>{liveIdentityGuard.message}</Text>
                        </View>
                    )}

                    <View style={styles.actionStack}>
                        {liveIdentityGuard.outcome === 'privileged_role_blocked' ? (
                            <>
                                <FormButton
                                    title="Cerrar sesión del taller para continuar"
                                    onPress={handleSwitchAccountSignOut}
                                    variant="primary"
                                />
                                <FormButton
                                    title="Volver a mi Panel de Atelier"
                                    onPress={() =>
                                        router.replace(
                                            role === 'admin' ? '/(admin)' : '/(designer)'
                                        )
                                    }
                                    variant="secondary"
                                />
                            </>
                        ) : user ? (
                            <FormButton
                                title="Ir a mi Portal Privado →"
                                onPress={() => router.replace('/(client)')}
                                variant="primary"
                            />
                        ) : (
                            <FormButton
                                title="Ingresar con cuenta existente"
                                onPress={() => router.push('/(auth)/login')}
                                variant="primary"
                            />
                        )}
                        <FormButton
                            title="Probar otro código de invitación"
                            onPress={handleResetToTokenEntry}
                            variant="secondary"
                        />
                        <FormButton
                            title="Contactar a Katherine Carroll"
                            onPress={() => router.push('/contacto' as any)}
                            variant="ghost"
                        />
                    </View>
                </View>
            );
        }

        // 2. Falta token: Formulario ceremonial de ingreso manual
        if (effectiveOutcome === 'missing_token') {
            return (
                <View style={styles.panelFlowBlock}>
                    <Text style={styles.formEyebrow}>SELLO DE ACCESO EXCLUSIVO</Text>
                    <Text style={styles.formTitle}>Activa tu Invitación Privada</Text>
                    <Text style={styles.formSubtitle}>
                        {verifyResult?.message ||
                            'Abre el enlace personalizado recibido por correo o pega aquí el código confidencial emitido por Katherine Carroll.'}
                    </Text>
                    <View style={styles.divider} />

                    {!liveIdentityGuard.allowed && (
                        <View style={styles.securityAlertBox}>
                            <Text style={styles.securityAlertTitle}>Sesión de Taller Detectada</Text>
                            <Text style={styles.securityAlertText}>{liveIdentityGuard.message}</Text>
                            <TouchableOpacity
                                style={styles.inlineLinkBtn}
                                onPress={handleSwitchAccountSignOut}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.inlineLinkBtnText}>
                                    Cerrar sesión del taller antes de continuar →
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <FormInput
                        label="Código o Sello de Invitación"
                        placeholder="Pega tu código seguro de invitación..."
                        value={manualTokenInput}
                        onChangeText={setManualTokenInput}
                        secureTextEntry={!showManualToken}
                        autoCapitalize="none"
                        rightAccessory={
                            <TouchableOpacity onPress={() => setShowManualToken((v) => !v)}>
                                <Text style={styles.toggleLinkText}>
                                    {showManualToken ? 'Ocultar' : 'Mostrar'}
                                </Text>
                            </TouchableOpacity>
                        }
                    />

                    <FormButton
                        title="Verificar Invitación"
                        onPress={handleManualVerifySubmit}
                        variant="primary"
                        loading={verifying}
                    />

                    <View style={styles.secondaryLinksRow}>
                        {user && liveIdentityGuard.outcome === 'ok' ? (
                            <TouchableOpacity onPress={() => router.replace('/(client)')}>
                                <Text style={styles.secondaryLinkText}>
                                    Ya tengo sesión iniciada · Ir a mi Portal Privado →
                                </Text>
                            </TouchableOpacity>
                        ) : !user ? (
                            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                                <Text style={styles.secondaryLinkText}>
                                    Ya tengo acceso · Iniciar sesión
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            );
        }

        // 3. Sesión privilegiada bloqueada (admin / designer / superadmin)
        if (effectiveOutcome === 'privileged_role_blocked') {
            const shieldMessage =
                liveIdentityGuard.outcome === 'privileged_role_blocked'
                    ? liveIdentityGuard.message
                    : acceptResult?.message ||
                      verifyResult?.message ||
                      liveIdentityGuard.message;
            return (
                <View style={styles.panelFlowBlock}>
                    <View style={styles.securityShieldCard}>
                        <Text style={styles.shieldEyebrow}>PROTECCIÓN NUCLEAR DE PRIVILEGIOS · M09-A</Text>
                        <Text style={styles.shieldTitle}>Sesión de Equipo Atelier Activa</Text>
                        <Text style={styles.shieldBody}>{shieldMessage}</Text>
                        <View style={styles.shieldRulePill}>
                            <Text style={styles.shieldRuleText}>
                                ✦ Tu perfil y rol actual ({profile?.role || role || 'equipo'}) se mantienen intactos y nunca se sobrescriben.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.actionStack}>
                        <FormButton
                            title="Cerrar sesión del taller para continuar"
                            onPress={handleSwitchAccountSignOut}
                            variant="primary"
                        />
                        <FormButton
                            title="Volver a mi Panel de Atelier"
                            onPress={() =>
                                router.replace(role === 'admin' ? '/(admin)' : '/(designer)')
                            }
                            variant="secondary"
                        />
                    </View>
                </View>
            );
        }

        // 4. Discrepancia multi-tenant de correo electrónico
        if (effectiveOutcome === 'email_mismatch') {
            const mismatchMessage =
                liveIdentityGuard.outcome === 'email_mismatch'
                    ? liveIdentityGuard.message
                    : acceptResult?.message ||
                      verifyResult?.message ||
                      liveIdentityGuard.message;
            return (
                <View style={styles.panelFlowBlock}>
                    <View style={styles.securityShieldCard}>
                        <Text style={styles.shieldEyebrow}>AISLAMIENTO MULTI-TENANT ESTRICTO</Text>
                        <Text style={styles.shieldTitle}>Cuenta Autenticada Distinta</Text>
                        <Text style={styles.shieldBody}>{mismatchMessage}</Text>
                        <View style={styles.comparisonBox}>
                            {user?.email ? (
                                <Text style={styles.comparisonRow}>
                                    Sesión actual: <Text style={styles.boldMono}>{user.email}</Text>
                                </Text>
                            ) : null}
                            {verifyResult?.maskedEmail ? (
                                <Text style={styles.comparisonRow}>
                                    Invitación dirigida a:{' '}
                                    <Text style={styles.boldMono}>{verifyResult.maskedEmail}</Text>
                                </Text>
                            ) : null}
                        </View>
                    </View>

                    <View style={styles.actionStack}>
                        <FormButton
                            title="Cerrar sesión e ingresar con cuenta invitada"
                            onPress={handleSwitchAccountSignOut}
                            variant="primary"
                        />
                        <FormButton
                            title="Volver a mi espacio actual"
                            onPress={() => router.replace('/(client)')}
                            variant="secondary"
                        />
                    </View>
                </View>
            );
        }

        // 5. Estados de token terminal o inválido (invalid, expired, revoked, reused, failed)
        if (
            effectiveOutcome === 'invalid' ||
            effectiveOutcome === 'expired' ||
            effectiveOutcome === 'revoked' ||
            effectiveOutcome === 'reused' ||
            effectiveOutcome === 'failed' ||
            effectiveOutcome === 'server_error'
        ) {
            const stateMeta: Record<
                string,
                { eyebrow: string; title: string; badge: string; showLogin: boolean }
            > = {
                invalid: {
                    eyebrow: 'SELLO NO RECONOCIDO',
                    title: 'Código de Invitación Inválido',
                    badge: 'VERIFICACIÓN DENEGADA',
                    showLogin: false,
                },
                expired: {
                    eyebrow: 'VIGENCIA CUMPLIDA · HTTP 410',
                    title: 'Esta Invitación ha Expirado',
                    badge: 'ENLACE CADUCADO',
                    showLogin: false,
                },
                revoked: {
                    eyebrow: 'ACCESO CANCELADO POR EL ATELIER',
                    title: 'Invitación Revocada o Inactiva',
                    badge: 'REVOCADA',
                    showLogin: false,
                },
                reused: {
                    eyebrow: 'TOKEN DE UN SOLO USO · HTTP 409 / 410',
                    title: 'Invitación Ya Utilizada Anteriormente',
                    badge: 'SELLO CONSUMIDO',
                    showLogin: true,
                },
                failed: {
                    eyebrow: 'ESTADO TERMINAL DE SEGURIDAD',
                    title: 'No fue Posible Completar esta Invitación',
                    badge: 'BLOQUEO DE SEGURIDAD',
                    showLogin: false,
                },
                server_error: {
                    eyebrow: 'INCIDENCIA TEMPORAL',
                    title: 'Verificación Interrumpida',
                    badge: 'REINTENTO SUGERIDO',
                    showLogin: true,
                },
            };

            const meta = stateMeta[effectiveOutcome] || stateMeta.invalid;
            const detailMsg = acceptResult?.message || verifyResult?.message || '';

            return (
                <View style={styles.panelFlowBlock}>
                    <View style={styles.terminalStateCard}>
                        <View style={styles.terminalBadge}>
                            <Text style={styles.terminalBadgeText}>{meta.badge}</Text>
                        </View>
                        <Text style={styles.formEyebrow}>{meta.eyebrow}</Text>
                        <Text style={styles.formTitle}>{meta.title}</Text>
                        <Text style={styles.terminalBody}>{detailMsg}</Text>
                    </View>

                    <View style={styles.actionStack}>
                        {meta.showLogin && (
                            <FormButton
                                title="Ingresar con mi Cuenta"
                                onPress={() => router.replace('/(auth)/login')}
                                variant="primary"
                            />
                        )}
                        <FormButton
                            title="Solicitar Nueva Invitación al Atelier"
                            onPress={() =>
                                router.push({
                                    pathname: '/contacto' as any,
                                    params: { servicio: 'portal-clientas' },
                                })
                            }
                            variant={meta.showLogin ? 'secondary' : 'primary'}
                        />
                        <FormButton
                            title="Ingresar Otro Código"
                            onPress={handleResetToTokenEntry}
                            variant="ghost"
                        />
                    </View>
                </View>
            );
        }

        // 6. Lease concurrencia (409 locked) o Reconciliación Saga pendiente (504)
        if (
            effectiveOutcome === 'processing_locked' ||
            effectiveOutcome === 'reconciliation_pending'
        ) {
            const retrySec =
                acceptResult?.retryAfterSeconds || verifyResult?.retryAfterSeconds || 5;
            return (
                <View style={styles.panelFlowBlock}>
                    <View style={styles.leaseWaitCard}>
                        <Text style={styles.leaseEyebrow}>PROTOCOLO SAGA IDEMPOTENTE · LEASE SEGURO</Text>
                        <Text style={styles.leaseTitle}>
                            {effectiveOutcome === 'processing_locked'
                                ? 'Activación en Curso'
                                : 'Confirmando Vinculación Definitiva'}
                        </Text>
                        <Text style={styles.leaseBody}>
                            {acceptResult?.message || verifyResult?.message}
                        </Text>
                        <Text style={styles.leaseHint}>
                            Tu operación conserva el identificador idempotente único para evitar cuentas o vinculaciones duplicadas. Espera ~{retrySec} segundos y reintenta con seguridad.
                        </Text>
                    </View>

                    <View style={styles.actionStack}>
                        <FormButton
                            title="Reintentar Confirmación Segura"
                            onPress={() => {
                                if (acceptResult) {
                                    void handleAcceptInvitation();
                                } else {
                                    setVerifying(true);
                                    setVerifyNonce((n) => n + 1);
                                }
                            }}
                            variant="champagne"
                            loading={submitting || verifying}
                        />
                        <FormButton
                            title="Ir a Iniciar Sesión"
                            onPress={() => router.replace('/(auth)/login')}
                            variant="ghost"
                        />
                    </View>
                </View>
            );
        }

        // 7. Celebración de aceptación (nueva o replay idempotente)
        if (effectiveOutcome === 'accepted' || effectiveOutcome === 'already_accepted_self') {
            const isReplay =
                effectiveOutcome === 'already_accepted_self' || acceptResult?.idempotentReplay;
            return (
                <View style={styles.panelFlowBlock}>
                    <View style={styles.celebrationCard}>
                        <View style={styles.goldSealCircle}>
                            <Text style={styles.goldSealCheck}>✦</Text>
                        </View>
                        <View style={styles.celebrationBadge}>
                            <Text style={styles.celebrationBadgeText}>
                                {isReplay
                                    ? 'VINCULACIÓN IDEMPOTENTE CONFIRMADA · CERO DUPLICADOS'
                                    : 'PORTAL EXCLUSIVO ACTIVADO'}
                            </Text>
                        </View>
                        <Text style={styles.celebrationTitle}>
                            {isReplay
                                ? 'Tu Acceso Exclusivo Ya Está Activo'
                                : 'Bienvenida a tu Atelier Digital'}
                        </Text>
                        <Text style={styles.celebrationBody}>
                            {acceptResult?.message ||
                                verifyResult?.message ||
                                'Tu espacio privado de alta costura está listo con aislamiento Zero Trust.'}
                        </Text>

                        <View style={styles.custodyPillBox}>
                            <Text style={styles.custodyPillText}>
                                ✦ Tus piezas, medidas y pruebas se mostrarán únicamente cuando Katherine Carroll habilite cada permiso.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.actionStack}>
                        <FormButton
                            title="Ingresar a mi Portal Privado →"
                            onPress={() =>
                                router.replace(user ? '/(client)' : '/(auth)/login')
                            }
                            variant="primary"
                        />
                    </View>
                </View>
            );
        }

        // 8. Estado VÁLIDO en Producción — listo para activación o vinculación
        return (
            <View style={styles.panelFlowBlock}>
                <View style={styles.verifiedInviteCard}>
                    <View style={styles.verifiedRow}>
                        <Text style={styles.verifiedTag}>✦ INVITACIÓN AUTÉNTICA VERIFICADA</Text>
                    </View>
                    <Text style={styles.verifiedHeadline}>
                        {verifyResult?.clientDisplayName
                            ? `Bienvenida, ${verifyResult.clientDisplayName}`
                            : 'Invitación Privada de Alta Costura'}
                    </Text>
                    {verifyResult?.maskedEmail ? (
                        <Text style={styles.verifiedMeta}>
                            Cuenta autorizada: <Text style={styles.boldMono}>{verifyResult.maskedEmail}</Text>
                        </Text>
                    ) : null}
                    {expirationLabel ? (
                        <Text style={styles.verifiedMeta}>Vigencia hasta: {expirationLabel}</Text>
                    ) : null}
                </View>

                {formError && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{formError}</Text>
                    </View>
                )}

                {user ? (
                    /* Clienta YA autenticada con identidad compatible */
                    <View style={styles.authenticatedAcceptBox}>
                        <Text style={styles.authAcceptLabel}>SESIÓN COMPATIBLE ACTIVA</Text>
                        <Text style={styles.authAcceptEmail}>{user.email}</Text>
                        <Text style={styles.authAcceptCopy}>
                            Al confirmar, tu cuenta quedará vinculada de forma atómica e idempotente con tu expediente exclusivo en Atelier Digital, sin crear duplicados.
                        </Text>
                        <FormButton
                            title="Activar y Vincular mi Portal Exclusivo"
                            onPress={handleAcceptInvitation}
                            variant="primary"
                            loading={submitting}
                        />
                        <TouchableOpacity
                            style={styles.switchAccountSmallBtn}
                            onPress={handleSwitchAccountSignOut}
                            disabled={submitting}
                        >
                            <Text style={styles.switchAccountSmallText}>
                                ¿Deseas usar otra cuenta? Cerrar sesión
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    /* Clienta NO autenticada: crear contraseña nueva o ingresar con cuenta existente */
                    <>
                        <View style={styles.tabSwitchRow}>
                            <TouchableOpacity
                                style={[
                                    styles.tabButton,
                                    activationTab === 'new_access' && styles.tabButtonActive,
                                ]}
                                onPress={() => {
                                    setFormError(null);
                                    setActivationTab('new_access');
                                }}
                                activeOpacity={0.85}
                            >
                                <Text
                                    style={[
                                        styles.tabButtonText,
                                        activationTab === 'new_access' && styles.tabButtonTextActive,
                                    ]}
                                >
                                    Activar acceso nuevo
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.tabButton,
                                    activationTab === 'existing_account' && styles.tabButtonActive,
                                ]}
                                onPress={() => {
                                    setFormError(null);
                                    setActivationTab('existing_account');
                                }}
                                activeOpacity={0.85}
                            >
                                <Text
                                    style={[
                                        styles.tabButtonText,
                                        activationTab === 'existing_account' &&
                                            styles.tabButtonTextActive,
                                    ]}
                                >
                                    Ya tengo cuenta
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {activationTab === 'new_access' ? (
                            <View>
                                <FormInput
                                    label="Define tu contraseña personal"
                                    placeholder="Mínimo 8 caracteres"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    editable={!submitting}
                                    rightAccessory={
                                        <TouchableOpacity
                                            onPress={() => setShowPassword((prev) => !prev)}
                                        >
                                            <Text style={styles.toggleLinkText}>
                                                {showPassword ? 'Ocultar' : 'Mostrar'}
                                            </Text>
                                        </TouchableOpacity>
                                    }
                                />

                                <View style={styles.strengthContainer}>
                                    <View style={styles.strengthTrack}>
                                        <View
                                            style={[
                                                styles.strengthFill,
                                                {
                                                    width: `${Math.round(strengthInfo.ratio * 100)}%`,
                                                    backgroundColor: strengthInfo.color,
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.strengthText}>{strengthInfo.label}</Text>
                                </View>

                                <FormInput
                                    label="Confirma tu contraseña"
                                    placeholder="Repite tu contraseña"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                    editable={!submitting}
                                />

                                <PrivacyNoticeBanner compact />

                                <LegalConsentCheckbox
                                    checked={ageConfirmed}
                                    onToggle={() => setAgeConfirmed((v) => !v)}
                                    required
                                    disabled={submitting}
                                >
                                    Confirmo que soy mayor de 18 años.
                                </LegalConsentCheckbox>

                                <LegalConsentCheckbox
                                    checked={termsAccepted}
                                    onToggle={() => setTermsAccepted((v) => !v)}
                                    required
                                    disabled={submitting}
                                >
                                    He leído y acepto los{' '}
                                    <Text
                                        style={styles.inlineLegalLink}
                                        onPress={() => router.push('/terminos-condiciones' as any)}
                                    >
                                        Términos y Condiciones de Uso
                                    </Text>
                                    .
                                </LegalConsentCheckbox>

                                <LegalConsentCheckbox
                                    checked={privacyAccepted}
                                    onToggle={() => setPrivacyAccepted((v) => !v)}
                                    required
                                    disabled={submitting}
                                >
                                    Autorizo el tratamiento de mis datos conforme a la{' '}
                                    <Text
                                        style={styles.inlineLegalLink}
                                        onPress={() => router.push('/politica-privacidad' as any)}
                                    >
                                        Política de Privacidad (Ley 1581 de 2012)
                                    </Text>
                                    .
                                </LegalConsentCheckbox>

                                <View style={styles.submitMargin}>
                                    <FormButton
                                        title="Crear Acceso y Activar Portal"
                                        onPress={handleAcceptInvitation}
                                        variant="primary"
                                        loading={submitting}
                                    />
                                </View>
                            </View>
                        ) : (
                            <View>
                                <Text style={styles.inlineLoginHelper}>
                                    Inicia sesión con el mismo correo autorizado para vincular tu invitación de forma inmediata sin perder este enlace.
                                </Text>
                                <FormInput
                                    label="Correo Electrónico"
                                    placeholder="tu-correo@atelier.com"
                                    value={loginEmail}
                                    onChangeText={setLoginEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    editable={!signingInInline}
                                />
                                <FormInput
                                    label="Contraseña"
                                    placeholder="••••••••"
                                    value={loginPassword}
                                    onChangeText={setLoginPassword}
                                    secureTextEntry
                                    editable={!signingInInline}
                                />
                                <FormButton
                                    title="Iniciar Sesión para Vincular"
                                    onPress={handleInlineLogin}
                                    variant="champagne"
                                    loading={signingInInline}
                                />
                            </View>
                        )}
                    </>
                )}
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.rootContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar style="dark" />

            {/* HEADER EDITORIAL DE LA MAISON */}
            <View style={styles.topHeaderBar}>
                <View style={styles.topHeaderBrand}>
                    <View style={styles.topMonogramRow}>
                        <Text style={styles.goldAccentStar}>✦</Text>
                        <Text style={styles.topEyebrow}>BY KATHERINE CARROLL</Text>
                    </View>
                    <Text style={styles.topBrandTitle}>ATELIER DIGITAL</Text>
                </View>

                <View style={styles.topRightGroup}>
                    <View
                        style={[
                            styles.envBadge,
                            isDemoUnavailable ? styles.envBadgeDemo : styles.envBadgeProd,
                        ]}
                    >
                        <Text
                            style={[
                                styles.envBadgeText,
                                isDemoUnavailable
                                    ? styles.envBadgeTextDemo
                                    : styles.envBadgeTextProd,
                            ]}
                        >
                            {isDemoUnavailable
                                ? 'MODO DEMO · BACKEND PENDIENTE'
                                : 'CANAL SEGURO · ZERO TRUST'}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.backHomeBtn}
                        onPress={() => router.push('/')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.backHomeBtnText}>Portada Atelier</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* MARCO PRINCIPAL DIVIDIDO DE ALTA COSTURA */}
                <View style={[styles.editorialFrame, isDesktop && styles.editorialFrameDesktop]}>
                    {/* COLUMNA IZQUIERDA: VITRINA VISUAL DE ALTA COSTURA */}
                    <View
                        style={[
                            styles.showcasePanel,
                            isDesktop && styles.showcasePanelDesktop,
                            isMobile && styles.showcasePanelMobile,
                        ]}
                    >
                        <Image
                            source={HERO_ATELIER_IMAGE}
                            style={styles.showcaseBackdropImage}
                            resizeMode="cover"
                        />
                        <View style={styles.showcaseScrim} />

                        <View style={styles.showcaseInner}>
                            <View style={styles.maisonTag}>
                                <Text style={styles.maisonTagText}>PORTAL EXCLUSIVO DE CLIENTA</Text>
                            </View>

                            <Image
                                source={LOGO_TRANSPARENT}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />

                            <Image
                                source={FLOURISH_IMAGE}
                                style={styles.flourishImage}
                                resizeMode="contain"
                            />

                            <Text style={styles.showcaseQuote}>
                                «La alta costura comienza cuando cada silueta, cada prueba y cada detalle llevan su firma personal.»
                            </Text>

                            <View style={styles.showcaseDivider} />

                            <View style={styles.sanctuaryPillars}>
                                <Text style={styles.pillarItem}>
                                    ✦ Curaduría exclusiva autorizada por Katherine Carroll
                                </Text>
                                <Text style={styles.pillarItem}>
                                    ✦ Seguimiento íntimo de creaciones, bocetos y pruebas
                                </Text>
                                <Text style={styles.pillarItem}>
                                    ✦ Protección confidencial con aislamiento por fila (RLS)
                                </Text>
                            </View>

                            <Text style={styles.showcaseLocation}>
                                BARRANQUILLA · ALTA COSTURA DE AUTOR
                            </Text>
                        </View>
                    </View>

                    {/* COLUMNA DERECHA: FLUJO DE VERIFICACIÓN Y ACTIVACIÓN */}
                    <View
                        style={[
                            styles.interactivePanel,
                            isDesktop && styles.interactivePanelDesktop,
                        ]}
                    >
                        {/* Indicador Ceremonial de 3 Pasos */}
                        <View style={styles.stepperRow}>
                            {[
                                { step: 1, label: '01 Sello' },
                                { step: 2, label: '02 Identidad' },
                                { step: 3, label: '03 Portal' },
                            ].map((item) => {
                                const reached = currentStep >= item.step;
                                const isCurrent = currentStep === item.step;
                                return (
                                    <View
                                        key={item.step}
                                        style={[
                                            styles.stepPill,
                                            isCurrent && styles.stepPillCurrent,
                                            reached && !isCurrent && styles.stepPillDone,
                                        ]}
                                    >
                                        <Text
                                            numberOfLines={1}
                                            style={[
                                                styles.stepPillText,
                                                isCurrent && styles.stepPillTextActive,
                                                reached && !isCurrent && styles.stepPillTextDone,
                                            ]}
                                        >
                                            {reached && !isCurrent ? `✓ ${item.label}` : item.label}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>

                        {renderInvitationContent()}
                    </View>
                </View>

                {/* EXPERIENCIA VISUAL DE BIENVENIDA: QUÉ TE ESPERA EN TU PORTAL */}
                <View style={styles.sanctuaryPreviewSection}>
                    <View style={styles.previewSectionHeader}>
                        <View style={styles.previewHeaderLine} />
                        <Text style={styles.previewSectionEyebrow}>
                            ✦ TU EXPERIENCIA DENTRO DEL ATELIER DIGITAL
                        </Text>
                        <View style={styles.previewHeaderLine} />
                    </View>

                    <View
                        style={[
                            styles.previewCardsRow,
                            isMobile && styles.previewCardsRowMobile,
                        ]}
                    >
                        <View style={styles.previewCard}>
                            <View style={styles.previewImgBox}>
                                <Image
                                    source={CARD_CREATIONS}
                                    style={styles.previewImg}
                                    resizeMode="cover"
                                />
                                <View style={styles.previewImgOverlay} />
                                <Text style={styles.previewImgTag}>01 · CREACIONES</Text>
                            </View>
                            <View style={styles.previewCardBody}>
                                <Text style={styles.previewCardTitle}>Bocetos & Piezas Únicas</Text>
                                <Text style={styles.previewCardCopy}>
                                    Consulta el estado de tus prendas y las ilustraciones habilitadas por tu diseñadora.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.previewCard}>
                            <View style={styles.previewImgBox}>
                                <Image
                                    source={CARD_FITTING}
                                    style={styles.previewImg}
                                    resizeMode="cover"
                                />
                                <View style={styles.previewImgOverlay} />
                                <Text style={styles.previewImgTag}>02 · PRUEBAS DE CALCE</Text>
                            </View>
                            <View style={styles.previewCardBody}>
                                <Text style={styles.previewCardTitle}>Citas & Ajustes de Taller</Text>
                                <Text style={styles.previewCardCopy}>
                                    Visualiza tu agenda privada en el salón y las recomendaciones para cada prueba.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.previewCard}>
                            <View style={styles.previewImgBox}>
                                <Image
                                    source={CARD_SECURITY}
                                    style={styles.previewImg}
                                    resizeMode="cover"
                                />
                                <View style={styles.previewImgOverlay} />
                                <Text style={styles.previewImgTag}>03 · CUSTODIA ZERO TRUST</Text>
                            </View>
                            <View style={styles.previewCardBody}>
                                <Text style={styles.previewCardTitle}>Privacidad Absoluta</Text>
                                <Text style={styles.previewCardCopy}>
                                    Tu ficha antropométrica y documentos protegidos bajo Ley 1581 de 2012 y RLS.
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* PIE LEGAL EDITORIAL */}
                <View style={styles.legalFooterRow}>
                    <TouchableOpacity onPress={() => router.push('/politica-privacidad' as any)}>
                        <Text style={styles.legalFooterLink}>Política de Privacidad</Text>
                    </TouchableOpacity>
                    <Text style={styles.legalDot}>·</Text>
                    <TouchableOpacity onPress={() => router.push('/terminos-condiciones' as any)}>
                        <Text style={styles.legalFooterLink}>Términos de Uso</Text>
                    </TouchableOpacity>
                    <Text style={styles.legalDot}>·</Text>
                    <TouchableOpacity onPress={() => router.push('/aviso-privacidad' as any)}>
                        <Text style={styles.legalFooterLink}>Aviso de Datos (Ley 1581)</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    rootContainer: {
        flex: 1,
        backgroundColor: colors.ivoryWarm,
    },
    topHeaderBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        paddingHorizontal: 24,
        paddingTop: Platform.select({ ios: 50, android: 40, default: 18 }),
        paddingBottom: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
    },
    topHeaderBrand: {
        gap: 2,
    },
    topMonogramRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    goldAccentStar: {
        color: colors.champagneGold,
        fontSize: 11,
    },
    topEyebrow: {
        color: colors.textSecondary,
        fontSize: 9.5,
        letterSpacing: 2.2,
        fontWeight: '600',
        fontFamily: typography.sans,
    },
    topBrandTitle: {
        color: colors.atelierBlack,
        fontSize: 16,
        letterSpacing: 3.5,
        fontWeight: '700',
        fontFamily: typography.serif,
    },
    topRightGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
    },
    envBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 2,
        borderWidth: 1,
    },
    envBadgeProd: {
        backgroundColor: colors.successBg,
        borderColor: colors.successBorder,
    },
    envBadgeDemo: {
        backgroundColor: '#FFF8E7',
        borderColor: colors.champagneGold,
    },
    envBadgeText: {
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.2,
        fontFamily: typography.sans,
    },
    envBadgeTextProd: {
        color: colors.success,
    },
    envBadgeTextDemo: {
        color: '#7A5B20',
    },
    backHomeBtn: {
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 2,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: colors.surfaceSubtle,
    },
    backHomeBtnText: {
        color: colors.atelierBlack,
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.6,
    },
    scrollContent: {
        flexGrow: 1,
        paddingVertical: 32,
        paddingHorizontal: 20,
        maxWidth: 1140,
        width: '100%',
        alignSelf: 'center',
    },

    /* Marco Editorial Dividido */
    editorialFrame: {
        width: '100%',
        backgroundColor: colors.surface,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.sand,
        overflow: 'hidden',
        shadowColor: colors.atelierBlack,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 18,
        elevation: 4,
    },
    editorialFrameDesktop: {
        flexDirection: 'row',
        minHeight: 610,
    },

    /* Columna Visual Oscura (By Katherine Carroll) */
    showcasePanel: {
        position: 'relative',
        backgroundColor: colors.atelierBlack,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 36,
    },
    showcasePanelDesktop: {
        width: '43%',
        borderRightWidth: 1,
        borderRightColor: '#2B231D',
        paddingHorizontal: 36,
        paddingVertical: 48,
    },
    showcasePanelMobile: {
        paddingVertical: 28,
    },
    showcaseBackdropImage: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0.24,
    },
    showcaseScrim: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: 'rgba(23, 20, 17, 0.72)',
    },
    showcaseInner: {
        position: 'relative',
        zIndex: 2,
        alignItems: 'center',
        width: '100%',
        maxWidth: 360,
    },
    maisonTag: {
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 2,
        marginBottom: 20,
        backgroundColor: 'rgba(23, 20, 17, 0.65)',
    },
    maisonTagText: {
        color: colors.champagneGold,
        fontSize: 9.5,
        letterSpacing: 2.2,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    logoImage: {
        width: 156,
        height: 82,
        marginBottom: 8,
    },
    flourishImage: {
        width: 112,
        height: 22,
        marginBottom: 18,
        opacity: 0.9,
    },
    showcaseQuote: {
        color: colors.ivoryWarm,
        fontSize: 15,
        lineHeight: 24,
        textAlign: 'center',
        fontStyle: 'italic',
        fontFamily: typography.serif,
        marginBottom: 18,
    },
    showcaseDivider: {
        width: 48,
        height: 1,
        backgroundColor: colors.champagneGold,
        marginBottom: 18,
    },
    sanctuaryPillars: {
        gap: 8,
        width: '100%',
        marginBottom: 22,
    },
    pillarItem: {
        color: '#E5DCCF',
        fontSize: 12,
        lineHeight: 18,
        textAlign: 'center',
        fontFamily: typography.sans,
    },
    showcaseLocation: {
        color: colors.champagneGold,
        fontSize: 9.5,
        letterSpacing: 2.4,
        fontWeight: '600',
    },

    /* Columna Derecha Interactiva */
    interactivePanel: {
        flex: 1,
        paddingHorizontal: 24,
        paddingVertical: 28,
        justifyContent: 'center',
        backgroundColor: colors.surface,
    },
    interactivePanelDesktop: {
        paddingHorizontal: 44,
        paddingVertical: 40,
    },
    stepperRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    stepPill: {
        flex: 1,
        paddingVertical: 7,
        paddingHorizontal: 6,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepPillCurrent: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.champagneGold,
    },
    stepPillDone: {
        backgroundColor: colors.successBg,
        borderColor: colors.successBorder,
    },
    stepPillText: {
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 0.7,
        color: colors.textMuted,
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    stepPillTextActive: {
        color: colors.champagneGold,
    },
    stepPillTextDone: {
        color: colors.success,
    },
    panelFlowBlock: {
        width: '100%',
    },

    /* Tipografía común de formularios y tarjetas */
    formEyebrow: {
        color: colors.champagneGold,
        fontSize: 10,
        letterSpacing: 2.2,
        fontWeight: '700',
        marginBottom: 6,
    },
    formTitle: {
        color: colors.atelierBlack,
        fontSize: 24,
        fontWeight: '600',
        fontFamily: typography.serif,
        marginBottom: 8,
    },
    formSubtitle: {
        color: colors.textSecondary,
        fontSize: 13.5,
        lineHeight: 20,
    },
    divider: {
        height: 1,
        width: 48,
        backgroundColor: colors.champagneGold,
        marginVertical: 18,
    },

    /* Estados centrados y de carga */
    stateCardCentered: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 16,
    },
    goldSealCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.atelierBlack,
        borderWidth: 1.5,
        borderColor: colors.champagneGold,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    goldSealCheck: {
        color: colors.champagneGold,
        fontSize: 22,
    },
    stateEyebrow: {
        color: colors.champagneGold,
        fontSize: 10,
        letterSpacing: 2,
        fontWeight: '700',
        marginBottom: 6,
        textAlign: 'center',
    },
    stateTitle: {
        color: colors.atelierBlack,
        fontSize: 22,
        fontFamily: typography.serif,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    stateBody: {
        color: colors.textSecondary,
        fontSize: 13.5,
        lineHeight: 20,
        textAlign: 'center',
        maxWidth: 420,
    },

    /* Banner y Diagnóstico MODO DEMO */
    demoWarningBanner: {
        backgroundColor: '#FFF9EC',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        borderRadius: 3,
        padding: 18,
        marginBottom: 20,
    },
    demoBadgeRow: {
        alignSelf: 'flex-start',
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 2,
        marginBottom: 10,
    },
    demoBadgeText: {
        color: colors.champagneGold,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.4,
    },
    demoBannerHeadline: {
        color: colors.atelierBlack,
        fontSize: 18,
        fontFamily: typography.serif,
        fontWeight: '600',
        marginBottom: 6,
    },
    demoBannerBody: {
        color: '#5C4418',
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 12,
    },
    demoTokenCheckBox: {
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 2,
        padding: 10,
        marginBottom: 10,
    },
    demoTokenCheckLabel: {
        color: colors.accentDark,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 3,
    },
    demoTokenCheckValue: {
        color: colors.atelierBlack,
        fontSize: 12,
        lineHeight: 17,
    },
    demoGuaranteeBox: {
        backgroundColor: colors.surfaceSubtle,
        padding: 10,
        borderLeftWidth: 3,
        borderLeftColor: colors.champagneGold,
    },
    demoGuaranteeText: {
        color: colors.textPrimary,
        fontSize: 11.5,
        fontWeight: '600',
        lineHeight: 16,
    },
    technicalDetailText: {
        color: colors.textMuted,
        fontSize: 10.5,
        marginTop: 8,
    },

    /* Alertas de seguridad nuclear y multi-tenant */
    securityAlertBox: {
        backgroundColor: colors.errorBg,
        borderWidth: 1,
        borderColor: colors.errorBorder,
        borderRadius: 3,
        padding: 14,
        marginBottom: 18,
    },
    securityAlertTitle: {
        color: colors.error,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
    },
    securityAlertText: {
        color: colors.error,
        fontSize: 12,
        lineHeight: 17,
        marginBottom: 8,
    },
    inlineLinkBtn: {
        alignSelf: 'flex-start',
    },
    inlineLinkBtnText: {
        color: colors.atelierBlack,
        fontSize: 12,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    inlineNoticeBox: {
        backgroundColor: colors.errorBg,
        borderWidth: 1,
        borderColor: colors.errorBorder,
        padding: 12,
        borderRadius: 2,
        marginBottom: 16,
    },
    inlineNoticeText: {
        color: colors.error,
        fontSize: 12,
        lineHeight: 17,
    },
    securityShieldCard: {
        backgroundColor: colors.errorBg,
        borderWidth: 1,
        borderColor: colors.errorBorder,
        borderRadius: 3,
        padding: 20,
        marginBottom: 20,
    },
    shieldEyebrow: {
        color: colors.error,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 6,
    },
    shieldTitle: {
        color: colors.atelierBlack,
        fontSize: 20,
        fontFamily: typography.serif,
        fontWeight: '600',
        marginBottom: 8,
    },
    shieldBody: {
        color: colors.textPrimary,
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 12,
    },
    shieldRulePill: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.errorBorder,
        padding: 10,
        borderRadius: 2,
    },
    shieldRuleText: {
        color: colors.atelierBlack,
        fontSize: 12,
        fontWeight: '600',
    },
    comparisonBox: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 12,
        borderRadius: 2,
        gap: 4,
    },
    comparisonRow: {
        color: colors.textSecondary,
        fontSize: 12.5,
    },
    boldMono: {
        color: colors.atelierBlack,
        fontWeight: '700',
    },

    /* Estados terminales & Lease */
    terminalStateCard: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 3,
        padding: 20,
        marginBottom: 20,
    },
    terminalBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.errorBg,
        borderWidth: 1,
        borderColor: colors.errorBorder,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 2,
        marginBottom: 10,
    },
    terminalBadgeText: {
        color: colors.error,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    terminalBody: {
        color: colors.textSecondary,
        fontSize: 13.5,
        lineHeight: 20,
        marginTop: 6,
    },
    leaseWaitCard: {
        backgroundColor: '#FFF9EC',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        borderRadius: 3,
        padding: 20,
        marginBottom: 20,
    },
    leaseEyebrow: {
        color: colors.accentDark,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.4,
        marginBottom: 6,
    },
    leaseTitle: {
        color: colors.atelierBlack,
        fontSize: 20,
        fontFamily: typography.serif,
        fontWeight: '600',
        marginBottom: 8,
    },
    leaseBody: {
        color: colors.textPrimary,
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 10,
    },
    leaseHint: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
    },

    /* Celebración */
    celebrationCard: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        borderRadius: 3,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
    },
    celebrationBadge: {
        backgroundColor: colors.successBg,
        borderWidth: 1,
        borderColor: colors.successBorder,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 2,
        marginBottom: 10,
    },
    celebrationBadgeText: {
        color: colors.success,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.2,
        textAlign: 'center',
    },
    celebrationTitle: {
        color: colors.atelierBlack,
        fontSize: 22,
        fontFamily: typography.serif,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    celebrationBody: {
        color: colors.textSecondary,
        fontSize: 13.5,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 14,
    },
    custodyPillBox: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 12,
        borderRadius: 2,
        width: '100%',
    },
    custodyPillText: {
        color: colors.atelierBlack,
        fontSize: 12,
        lineHeight: 17,
        textAlign: 'center',
    },

    /* Invitación Verificada + Formularios */
    verifiedInviteCard: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        borderRadius: 3,
        padding: 16,
        marginBottom: 18,
    },
    verifiedRow: {
        marginBottom: 6,
    },
    verifiedTag: {
        color: colors.success,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.4,
    },
    verifiedHeadline: {
        color: colors.atelierBlack,
        fontSize: 19,
        fontFamily: typography.serif,
        fontWeight: '600',
        marginBottom: 4,
    },
    verifiedMeta: {
        color: colors.textSecondary,
        fontSize: 12.5,
        lineHeight: 18,
    },
    errorBox: {
        backgroundColor: colors.errorBg,
        borderWidth: 1,
        borderColor: colors.errorBorder,
        borderRadius: 2,
        padding: 12,
        marginBottom: 16,
    },
    errorText: {
        color: colors.error,
        fontSize: 12.5,
        lineHeight: 18,
    },
    authenticatedAcceptBox: {
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 3,
        padding: 18,
        backgroundColor: '#FFFFFF',
    },
    authAcceptLabel: {
        color: colors.champagneGold,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    authAcceptEmail: {
        color: colors.atelierBlack,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    authAcceptCopy: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 18,
    },
    switchAccountSmallBtn: {
        marginTop: 14,
        alignItems: 'center',
    },
    switchAccountSmallText: {
        color: colors.textSecondary,
        fontSize: 12,
        textDecorationLine: 'underline',
    },
    tabSwitchRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 18,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
    },
    tabButtonActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.champagneGold,
    },
    tabButtonText: {
        color: colors.textSecondary,
        fontSize: 11.5,
        fontWeight: '600',
    },
    tabButtonTextActive: {
        color: colors.ivoryWarm,
    },
    toggleLinkText: {
        color: colors.champagneGold,
        fontSize: 11.5,
        fontWeight: '600',
    },
    strengthContainer: {
        marginTop: -12,
        marginBottom: 16,
        gap: 4,
    },
    strengthTrack: {
        height: 4,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 2,
        overflow: 'hidden',
    },
    strengthFill: {
        height: '100%',
        borderRadius: 2,
    },
    strengthText: {
        color: colors.textSecondary,
        fontSize: 11,
    },
    inlineLegalLink: {
        color: colors.atelierBlack,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    submitMargin: {
        marginTop: 10,
    },
    inlineLoginHelper: {
        color: colors.textSecondary,
        fontSize: 12.5,
        lineHeight: 18,
        marginBottom: 14,
    },
    actionStack: {
        gap: 10,
    },
    secondaryLinksRow: {
        marginTop: 16,
        alignItems: 'center',
    },
    secondaryLinkText: {
        color: colors.accentDark,
        fontSize: 12.5,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },

    /* Vitrina inferior de experiencias del portal */
    sanctuaryPreviewSection: {
        marginTop: 32,
        marginBottom: 24,
    },
    previewSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 18,
    },
    previewHeaderLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.sand,
    },
    previewSectionEyebrow: {
        color: colors.accentDark,
        fontSize: 10.5,
        letterSpacing: 2,
        fontWeight: '700',
        textAlign: 'center',
    },
    previewCardsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    previewCardsRowMobile: {
        flexDirection: 'column',
    },
    previewCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 2,
        overflow: 'hidden',
    },
    previewImgBox: {
        position: 'relative',
        height: 132,
        backgroundColor: colors.atelierBlack,
    },
    previewImg: {
        width: '100%',
        height: '100%',
        opacity: 0.72,
    },
    previewImgOverlay: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: 'rgba(23, 20, 17, 0.35)',
    },
    previewImgTag: {
        position: 'absolute',
        bottom: 10,
        left: 12,
        color: colors.ivoryWarm,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.5,
        backgroundColor: 'rgba(23, 20, 17, 0.78)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    previewCardBody: {
        padding: 16,
    },
    previewCardTitle: {
        color: colors.atelierBlack,
        fontSize: 15,
        fontFamily: typography.serif,
        fontWeight: '600',
        marginBottom: 4,
    },
    previewCardCopy: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
    },

    /* Pie Legal */
    legalFooterRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        paddingBottom: 16,
    },
    legalFooterLink: {
        color: colors.textSecondary,
        fontSize: 11.5,
        textDecorationLine: 'underline',
    },
    legalDot: {
        color: colors.textMuted,
        fontSize: 12,
    },
});
