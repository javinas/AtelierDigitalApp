// ==============================================================================
// ATELIER DIGITAL — VISTAS MODULARES DE SECCIÓN: PORTAL CLIENTA (M09)
// Archivo: src/components/clientPortal/ClientPortalSectionViews.tsx
// ==============================================================================
// Renderiza las 5 secciones autorizadas del Portal de la Clienta:
// 1. Inicio
// 2. Creaciones (Doble Candado + sub-módulos + deny-overrides en cotizaciones)
// 3. Citas (America/Bogota, solo client_visible)
// 4. Seguimiento (Pruebas M06 con Doble Candado + Sesiones de Medidas M02)
// 5. Comunicación (mensajes aislados + envío bloqueado sin backend M09-D)
// ==============================================================================

import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
    AuthorizedCreationProjection,
    CLIENT_ACCESS_LIFECYCLE_META,
    ClientPortalAuthorizedView,
    ClientPortalSectionId,
} from './clientPortalModel';
import { clientPortalStyles as styles } from './clientPortalStyles';

export interface ClientPortalSectionViewsProps {
    section: ClientPortalSectionId;
    authorizedView: ClientPortalAuthorizedView;
    onSelectSection: (section: ClientPortalSectionId) => void;
}

function CreationCard({ projection }: { projection: AuthorizedCreationProjection }) {
    const { creation } = projection;

    return (
        <View style={styles.card} testID={`client-creation-card-${creation.id}`}>
            <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleGroup}>
                    <Text style={styles.eyebrow}>
                        {creation.garmentType} · {creation.occasion}
                    </Text>
                    <Text style={styles.cardTitle}>{creation.name}</Text>
                </View>
                <View style={styles.pillTag}>
                    <Text style={styles.pillTagText}>{creation.stageLabel}</Text>
                </View>
            </View>

            <Text style={styles.cardSubtitle}>{creation.collectionNote}</Text>
            {creation.targetDate ? (
                <Text style={styles.itemRowMeta}>
                    Fecha objetivo estimada: {creation.targetDate} (Agenda Atelier)
                </Text>
            ) : null}

            <View style={styles.divider} />

            {/* Submódulo 1: Bocetos (Doble Candado creations:view + sketches:view) */}
            <View
                style={styles.subModuleCard}
                testID={`creation-sketches-${creation.id}-${projection.canViewSketches ? 'open' : 'locked'}`}
            >
                <View style={styles.subModuleHeader}>
                    <Text style={styles.subModuleTitle}>Bocetos y Dirección Estética</Text>
                    <View style={styles.pillTag}>
                        <Text style={styles.pillTagText}>
                            {projection.canViewSketches ? 'Autorizado' : 'Bloqueado'}
                        </Text>
                    </View>
                </View>

                {projection.canViewSketches ? (
                    <View style={{ gap: 8 }}>
                        {creation.sketches.map((sk) => (
                            <View key={sk.id} style={styles.itemRowCard}>
                                <Text style={styles.itemRowTitle}>
                                    [{sk.plateCode}] {sk.title}
                                </Text>
                                <Text style={styles.itemRowMeta}>{sk.silhouetteLabel}</Text>
                                <Text style={styles.itemRowMeta}>Estado: {sk.approvalStateLabel}</Text>
                            </View>
                        ))}
                        <View style={styles.simulatorChipsRow}>
                            {projection.canApproveSketches ? (
                                <TouchableOpacity
                                    disabled
                                    accessibilityRole="button"
                                    accessibilityState={{ disabled: true }}
                                    style={styles.disabledActionBtn}
                                    testID={`btn-approve-sketches-${creation.id}`}
                                >
                                    <Text style={styles.disabledActionBtnText}>
                                        Aprobar bocetos — Pendiente backend M09-C
                                    </Text>
                                </TouchableOpacity>
                            ) : null}
                            {projection.canDownloadSketches ? (
                                <TouchableOpacity
                                    disabled
                                    accessibilityRole="button"
                                    accessibilityState={{ disabled: true }}
                                    style={styles.disabledActionBtn}
                                    testID={`btn-download-sketches-${creation.id}`}
                                >
                                    <Text style={styles.disabledActionBtnText}>
                                        Descargar láminas — Pendiente URL firmada
                                    </Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                        {!projection.canApproveSketches && !projection.canDownloadSketches ? (
                            <Text style={styles.itemRowMeta}>
                                Acciones de aprobación o descarga desactivadas (Zero Trust DEFAULT false).
                            </Text>
                        ) : null}
                    </View>
                ) : (
                    <Text style={styles.itemRowMeta}>
                        Los bocetos de esta prenda permanecen ocultos hasta autorización expresa de la diseñadora.
                    </Text>
                )}
            </View>

            {/* Submódulo 2: Telas y Materialidad Estética (solo estética, sin datos comerciales) */}
            <View
                style={styles.subModuleCard}
                testID={`creation-fabrics-${creation.id}-${projection.canViewFabrics ? 'open' : 'locked'}`}
            >
                <View style={styles.subModuleHeader}>
                    <Text style={styles.subModuleTitle}>Telas y Materialidad Seleccionada</Text>
                    <View style={styles.pillTag}>
                        <Text style={styles.pillTagText}>
                            {projection.canViewFabrics ? 'Autorizado' : 'Bloqueado'}
                        </Text>
                    </View>
                </View>

                {projection.canViewFabrics ? (
                    <View style={{ gap: 8 }}>
                        {creation.fabrics.map((fab) => (
                            <View key={fab.id} style={styles.itemRowCard}>
                                <Text style={styles.itemRowTitle}>
                                    {fab.aestheticName} · {fab.colorHarmony}
                                </Text>
                                <Text style={styles.itemRowMeta}>Caída: {fab.drapeFinish}</Text>
                                <Text style={styles.itemRowMeta}>{fab.editorialNote}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.itemRowMeta}>
                        La selección textil de esta creación no está habilitada para consulta actual.
                    </Text>
                )}
            </View>

            {/* Submódulo 3: Visor 3D (Doble Candado creations:view + 3d_viewer:view) */}
            <View
                style={styles.subModuleCard}
                testID={`creation-3d-${creation.id}-${projection.canView3dViewer ? 'open' : 'locked'}`}
            >
                <View style={styles.subModuleHeader}>
                    <Text style={styles.subModuleTitle}>Visor 3D de Silueta</Text>
                    <View style={styles.pillTag}>
                        <Text style={styles.pillTagText}>
                            {projection.canView3dViewer ? 'Habilitado · Pendiente 3D' : 'Bloqueado'}
                        </Text>
                    </View>
                </View>

                {projection.canView3dViewer ? (
                    <View style={styles.honestyBox}>
                        <Text style={styles.honestyBoxTitle}>
                            {creation.viewer3dSummary.silhouetteTitle} ·{' '}
                            {creation.viewer3dSummary.stageLabel}
                        </Text>
                        <Text style={styles.honestyBoxText}>
                            {creation.viewer3dSummary.notice}
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.itemRowMeta}>
                        Visualización tridimensional no habilitada para esta prenda.
                    </Text>
                )}
            </View>

            {/* Submódulo 4: Cotización Comercial (quotations:view con deny-overrides) */}
            <View
                style={styles.subModuleCard}
                testID={`creation-quote-${creation.id}-${
                    projection.quoteBlockedByDenyOverride
                        ? 'denied-override'
                        : projection.canViewQuote
                          ? 'open'
                          : 'locked'
                }`}
            >
                <View style={styles.subModuleHeader}>
                    <Text style={styles.subModuleTitle}>Cotización Comercial Oficial</Text>
                    <View style={styles.pillTag}>
                        <Text style={styles.pillTagText}>
                            {projection.quoteBlockedByDenyOverride
                                ? 'Denegada (override)'
                                : projection.canViewQuote
                                  ? 'Autorizada'
                                  : 'Oculta'}
                        </Text>
                    </View>
                </View>

                {projection.quoteBlockedByDenyOverride ? (
                    <View style={styles.denyNoticeBox}>
                        <Text style={styles.denyNoticeTitle}>
                            Cotización reservada para esta creación (deny-overrides)
                        </Text>
                        <Text style={styles.denyNoticeBody}>
                            Aunque exista habilitación general de cotizaciones, la diseñadora estableció
                            una restricción explícita sobre esta pieza y sus importes permanecen ocultos.
                        </Text>
                    </View>
                ) : projection.canViewQuote && projection.quote ? (
                    <View style={styles.quoteHighlightCard}>
                        <View style={styles.subModuleHeader}>
                            <Text style={styles.itemRowTitle}>
                                {projection.quote.quoteCode} · {projection.quote.title}
                            </Text>
                            <View style={styles.pillTag}>
                                <Text style={styles.pillTagText}>
                                    {projection.quote.statusLabel}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.quoteTotalValue}>{projection.quote.totalFormatted}</Text>
                        <Text style={styles.itemRowMeta}>
                            Plan acordado: {projection.quote.paymentPlanLabel}
                        </Text>
                        <Text style={styles.itemRowMeta}>
                            Emitida: {projection.quote.issuedDate} · Vigencia hasta:{' '}
                            {projection.quote.validUntil}
                        </Text>
                        {projection.canDownloadQuote ? (
                            <TouchableOpacity
                                disabled
                                accessibilityRole="button"
                                accessibilityState={{ disabled: true }}
                                style={styles.disabledActionBtn}
                                testID={`btn-download-quote-${creation.id}`}
                            >
                                <Text style={styles.disabledActionBtnText}>
                                    Descargar cotización PDF — Pendiente servicio firmado
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                ) : (
                    <Text style={styles.itemRowMeta}>
                        Resumen comercial oculto hasta habilitar cotizaciones para esta creación.
                    </Text>
                )}
            </View>
        </View>
    );
}

export const ClientPortalSectionViews: React.FC<ClientPortalSectionViewsProps> = ({
    section,
    authorizedView,
    onSelectSection,
}) => {
    const client = authorizedView.client;
    if (!client) return null;

    if (section === 'inicio') {
        const meta = CLIENT_ACCESS_LIFECYCLE_META.active;
        return (
            <View style={{ gap: 16 }} testID="client-section-inicio">
                <View style={styles.heroCard}>
                    <Text style={styles.heroEyebrow}>ATELIER DE AUTOR · BY KATHERINE CARROLL</Text>
                    <Text style={styles.heroTitle}>Bienvenida, {client.greetingName}</Text>
                    <Text style={styles.heroBody}>
                        {meta.explanation} Perfil de estilo: {client.stylePreference}
                    </Text>
                    <View style={styles.heroMetaRow}>
                        <View style={styles.heroMetricPill}>
                            <Text style={styles.heroMetricLabel}>Creaciones visibles</Text>
                            <Text style={styles.heroMetricValue}>
                                {authorizedView.authorizedCreations.length} autorizadas
                            </Text>
                        </View>
                        <View style={styles.heroMetricPill}>
                            <Text style={styles.heroMetricLabel}>Citas visibles</Text>
                            <Text style={styles.heroMetricValue}>
                                {authorizedView.authorizedAppointments.length} confirmadas/prog.
                            </Text>
                        </View>
                        <View style={styles.heroMetricPill}>
                            <Text style={styles.heroMetricLabel}>Reglas activas</Text>
                            <Text style={styles.heroMetricValue}>
                                {authorizedView.isZeroTrustEmpty
                                    ? '0 (Zero Trust)'
                                    : `${authorizedView.enabledPermissionCount} autorizaciones`}
                            </Text>
                        </View>
                    </View>
                </View>

                {authorizedView.isZeroTrustEmpty ? (
                    <View style={styles.restrictedSectionBox} testID="client-zero-trust-notice">
                        <Text style={styles.restrictedSectionTitle}>
                            Espacio Privado Preparado en Modo Zero Trust (DEFAULT false)
                        </Text>
                        <Text style={styles.restrictedSectionBody}>
                            Tu acceso está activo, pero todas las categorías comienzan apagadas por
                            defecto. Verás tus piezas, citas o notas únicamente cuando la diseñadora
                            active cada autorización en tu expediente.
                        </Text>
                    </View>
                ) : null}

                <View style={styles.gridRow}>
                    <View style={[styles.kpiCard, styles.gridItemHalf]}>
                        <Text style={styles.kpiStatusText}>
                            {authorizedView.authorizedCreations.length > 0
                                ? `${authorizedView.authorizedCreations.length} PRENDAS HABILITADAS`
                                : 'SIN PRENDAS HABILITADAS'}
                        </Text>
                        <Text style={styles.kpiTitle}>Creaciones y Diseño</Text>
                        <Text style={styles.kpiBody}>
                            Consulta láminas de bocetos, materialidad estética y propuestas comerciales
                            únicamente en prendas desbloqueadas por Doble Candado.
                        </Text>
                        <TouchableOpacity
                            style={styles.secondaryOutlineBtn}
                            onPress={() => onSelectSection('creaciones')}
                            testID="home-cta-creaciones"
                        >
                            <Text style={styles.secondaryOutlineBtnText}>Ir a Creaciones</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.kpiCard, styles.gridItemHalf]}>
                        <Text style={styles.kpiStatusText}>
                            {authorizedView.canViewAppointments
                                ? `${authorizedView.authorizedAppointments.length} CITAS VISIBLES`
                                : 'CONSULTA DESACTIVADA'}
                        </Text>
                        <Text style={styles.kpiTitle}>Citas en el Atelier</Text>
                        <Text style={styles.kpiBody}>
                            Horarios en zona Colombia (America/Bogota), salón privado de atención y
                            recomendaciones previas para tu visita.
                        </Text>
                        <TouchableOpacity
                            style={styles.secondaryOutlineBtn}
                            onPress={() => onSelectSection('citas')}
                            testID="home-cta-citas"
                        >
                            <Text style={styles.secondaryOutlineBtnText}>Ir a Citas</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.kpiCard, styles.gridItemHalf]}>
                        <Text style={styles.kpiStatusText}>
                            {authorizedView.authorizedFittings.length > 0 ||
                            authorizedView.canViewMeasurements
                                ? `${authorizedView.authorizedFittings.length} PRUEBAS · ${authorizedView.authorizedMeasurementSessions.length} SESIONES`
                                : 'SEGUIMIENTO OCULTO'}
                        </Text>
                        <Text style={styles.kpiTitle}>Seguimiento de Calce y Medidas</Text>
                        <Text style={styles.kpiBody}>
                            Rondas físicas de prueba con resumen autorizado y fechas certificadas de
                            sesiones de toma de medidas sin exponer cotas privadas.
                        </Text>
                        <TouchableOpacity
                            style={styles.secondaryOutlineBtn}
                            onPress={() => onSelectSection('seguimiento')}
                            testID="home-cta-seguimiento"
                        >
                            <Text style={styles.secondaryOutlineBtnText}>Ir a Seguimiento</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.kpiCard, styles.gridItemHalf]}>
                        <Text style={styles.kpiStatusText}>
                            {authorizedView.canObserveMessaging
                                ? `${authorizedView.authorizedMessages.length} MENSAJES AUTORIZADOS`
                                : 'CANAL DESACTIVADO'}
                        </Text>
                        <Text style={styles.kpiTitle}>Comunicación y Observaciones</Text>
                        <Text style={styles.kpiBody}>
                            Mensajes curados de la dirección creativa para tu proyecto, completamente
                            aislados de las notas privadas internas del taller.
                        </Text>
                        <TouchableOpacity
                            style={styles.secondaryOutlineBtn}
                            onPress={() => onSelectSection('comunicacion')}
                            testID="home-cta-comunicacion"
                        >
                            <Text style={styles.secondaryOutlineBtnText}>Ir a Comunicación</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.honestyBox}>
                    <Text style={styles.honestyBoxTitle}>
                        Confidencialidad y Gobierno de Datos · Ley 1581 de 2012
                    </Text>
                    <Text style={styles.honestyBoxText}>
                        Expediente aislado para {client.fullName} ({client.city}). Nunca se muestran
                        expedientes de otras clientas, apuntes internos de taller ni medidas
                        anatómicas privadas.
                    </Text>
                </View>
            </View>
        );
    }

    if (section === 'creaciones') {
        return (
            <View style={{ gap: 14 }} testID="client-section-creaciones">
                <View style={styles.card}>
                    <Text style={styles.eyebrow}>DOBLE CANDADO POR PRENDA (CREATIONS:VIEW)</Text>
                    <Text style={styles.cardTitle}>Tus Creaciones de Autor</Text>
                    <Text style={styles.cardSubtitle}>
                        Cada prenda solo se muestra cuando está autorizada individualmente y controla por
                        separado sus bocetos, materialidad, visor 3D y cotización oficial.
                    </Text>
                </View>

                {authorizedView.authorizedCreations.length === 0 ? (
                    <View style={styles.restrictedSectionBox} testID="creations-empty-locked">
                        <Text style={styles.restrictedSectionTitle}>
                            Sin creaciones autorizadas en este momento
                        </Text>
                        <Text style={styles.restrictedSectionBody}>
                            Ninguna pieza tiene activado el candado maestro de visibilidad para tu
                            portal. Cuando la diseñadora autorice una creación, aparecerá aquí con los
                            submódulos que decida compartir.
                        </Text>
                    </View>
                ) : (
                    authorizedView.authorizedCreations.map((projection) => (
                        <CreationCard key={projection.creation.id} projection={projection} />
                    ))
                )}
            </View>
        );
    }

    if (section === 'citas') {
        return (
            <View style={{ gap: 14 }} testID="client-section-citas">
                <View style={styles.card}>
                    <Text style={styles.eyebrow}>AGENDA DE CLIENTA · HORA DE COLOMBIA (M08)</Text>
                    <Text style={styles.cardTitle}>Tus Citas en el Atelier</Text>
                    <Text style={styles.cardSubtitle}>
                        Exclusivamente sesiones reservadas para tu atención personal; se omiten
                        actividades internas de patronaje, proveedores o taller.
                    </Text>
                </View>

                {!authorizedView.canViewAppointments ? (
                    <View style={styles.restrictedSectionBox} testID="appointments-locked">
                        <Text style={styles.restrictedSectionTitle}>
                            Agenda privada no habilitada (Zero Trust)
                        </Text>
                        <Text style={styles.restrictedSectionBody}>
                            El permiso global de consulta de citas permanece desactivado. Solicita a
                            Katherine Carroll habilitar la visibilidad de agenda si deseas revisar aquí
                            tus próximas fechas.
                        </Text>
                    </View>
                ) : (
                    <View style={{ gap: 12 }}>
                        {authorizedView.authorizedAppointments.map((apt) => (
                            <View
                                key={apt.id}
                                style={styles.card}
                                testID={`client-appointment-${apt.id}`}
                            >
                                <View style={styles.cardHeaderRow}>
                                    <View style={styles.cardTitleGroup}>
                                        <Text style={styles.eyebrow}>{apt.dateBogota}</Text>
                                        <Text style={styles.cardTitle}>{apt.title}</Text>
                                    </View>
                                    <View style={styles.pillTag}>
                                        <Text style={styles.pillTagText}>{apt.statusLabel}</Text>
                                    </View>
                                </View>
                                <Text style={styles.itemRowMeta}>Horario: {apt.timeRangeBogota}</Text>
                                <Text style={styles.itemRowMeta}>Espacio: {apt.spaceLabel}</Text>
                                <Text style={styles.itemRowMeta}>
                                    Sugerencia de preparación: {apt.preparationNote}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    }

    if (section === 'seguimiento') {
        return (
            <View style={{ gap: 14 }} testID="client-section-seguimiento">
                <View style={styles.card}>
                    <Text style={styles.eyebrow}>CALCE M06 Y SESIONES CERTIFICADAS M02</Text>
                    <Text style={styles.cardTitle}>Seguimiento Técnico Autorizado</Text>
                    <Text style={styles.cardSubtitle}>
                        Resumen curado de rondas físicas de calce y registro histórico de sesiones de
                        medición verificadas.
                    </Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.subModuleHeader}>
                        <Text style={styles.subModuleTitle}>Pruebas y Ajustes de Calce (M06)</Text>
                        <View style={styles.pillTag}>
                            <Text style={styles.pillTagText}>Doble Candado requerido</Text>
                        </View>
                    </View>

                    {authorizedView.authorizedFittings.length === 0 ? (
                        <View style={styles.restrictedSectionBox} testID="fittings-locked">
                            <Text style={styles.restrictedSectionTitle}>
                                Sin rondas de prueba visibles
                            </Text>
                            <Text style={styles.restrictedSectionBody}>
                                Para consultar una ronda de prueba se requiere tener visible su creación
                                y activado específicamente el permiso de Pruebas y Calce (fittings:view).
                            </Text>
                        </View>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {authorizedView.authorizedFittings.map((fit) => (
                                <View
                                    key={fit.id}
                                    style={styles.itemRowCard}
                                    testID={`client-fitting-${fit.id}`}
                                >
                                    <View style={styles.subModuleHeader}>
                                        <Text style={styles.itemRowTitle}>
                                            {fit.roundLabel} — {fit.creationName}
                                        </Text>
                                        <View style={styles.pillTag}>
                                            <Text style={styles.pillTagText}>{fit.statusLabel}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.itemRowMeta}>Fecha: {fit.dateBogota}</Text>
                                    <Text style={styles.itemRowMeta}>{fit.clientSummary}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.card}>
                    <View style={styles.subModuleHeader}>
                        <Text style={styles.subModuleTitle}>
                            Historial de Sesiones de Medidas (M02)
                        </Text>
                        <View style={styles.pillTag}>
                            <Text style={styles.pillTagText}>Solo fechas y certificación</Text>
                        </View>
                    </View>

                    {!authorizedView.canViewMeasurements ? (
                        <View style={styles.restrictedSectionBox} testID="measurements-locked">
                            <Text style={styles.restrictedSectionTitle}>
                                Historial de sesiones desactivado (Zero Trust)
                            </Text>
                            <Text style={styles.restrictedSectionBody}>
                                Habilita el permiso global measurements:view para confirmar aquí las
                                fechas y versiones de tus sesiones certificadas de toma de medidas.
                            </Text>
                        </View>
                    ) : (
                        <View style={{ gap: 10 }}>
                            <View style={styles.honestyBox}>
                                <Text style={styles.honestyBoxTitle}>
                                    Cotas Anatómicas Protegidas
                                </Text>
                                <Text style={styles.honestyBoxText}>
                                    Por privacidad biométrica (M09-A), únicamente se informa fecha,
                                    versión, unidad métrica y estado de verificación de cada sesión.
                                </Text>
                            </View>
                            {authorizedView.authorizedMeasurementSessions.map((ms) => (
                                <View
                                    key={ms.id}
                                    style={styles.itemRowCard}
                                    testID={`client-measurement-session-${ms.id}`}
                                >
                                    <View style={styles.subModuleHeader}>
                                        <Text style={styles.itemRowTitle}>
                                            Sesión #{ms.versionNumber} · {ms.sessionDate}
                                        </Text>
                                        <View style={styles.pillTag}>
                                            <Text style={styles.pillTagText}>{ms.statusLabel}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.itemRowMeta}>
                                        Sistema métrico registrado: {ms.unitSystem} · Registro de
                                        trazabilidad verificado.
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </View>
        );
    }

    // Sección 5: Comunicación y Observaciones
    return (
        <View style={{ gap: 14 }} testID="client-section-comunicacion">
            <View style={styles.card}>
                <Text style={styles.eyebrow}>CANAL EDITORIAL MODERADO</Text>
                <Text style={styles.cardTitle}>Comunicación con el Atelier</Text>
                <Text style={styles.cardSubtitle}>
                    Mensajes autorizados y espacio previsto para futuras observaciones sobre tus
                    prendas, separado de los apuntes internos de patronaje.
                </Text>
            </View>

            {!authorizedView.canObserveMessaging ? (
                <View style={styles.restrictedSectionBox} testID="messaging-locked">
                    <Text style={styles.restrictedSectionTitle}>
                        Canal de comunicación desactivado (Zero Trust)
                    </Text>
                    <Text style={styles.restrictedSectionBody}>
                        La visualización y envío de observaciones requiere habilitar el permiso
                        messaging:observe por parte de Katherine Carroll.
                    </Text>
                </View>
            ) : (
                <View style={{ gap: 12 }}>
                    {authorizedView.authorizedMessages.map((msg) => (
                        <View
                            key={msg.id}
                            style={styles.card}
                            testID={`client-message-${msg.id}`}
                        >
                            <View style={styles.subModuleHeader}>
                                <Text style={styles.eyebrow}>{msg.dateBogota}</Text>
                                <View style={styles.pillTag}>
                                    <Text style={styles.pillTagText}>{msg.channelLabel}</Text>
                                </View>
                            </View>
                            <Text style={styles.cardTitle}>{msg.subject}</Text>
                            <Text style={styles.itemRowMeta}>De: {msg.authorLabel}</Text>
                            <Text style={styles.cardSubtitle}>{msg.body}</Text>
                        </View>
                    ))}

                    <View style={styles.card}>
                        <Text style={styles.subModuleTitle}>Enviar nueva observación de diseño</Text>
                        <Text style={styles.cardSubtitle}>
                            En esta vista previa local sin backend no se simulan envíos ni
                            confirmaciones de guardado.
                        </Text>
                        <TextInput
                            editable={false}
                            multiline
                            value=""
                            placeholder="Espacio reservado para observaciones editoriales cuando se despliegue M09-D..."
                            placeholderTextColor="#766B62"
                            style={styles.textAreaDisabled}
                            testID="client-message-composer-disabled"
                        />
                        <TouchableOpacity
                            disabled
                            accessibilityRole="button"
                            accessibilityState={{ disabled: true }}
                            style={styles.disabledActionBtn}
                            testID="client-message-send-disabled"
                        >
                            <Text style={styles.disabledActionBtnText}>
                                Enviar observación — Requiere backend M09-D (sin persistencia local)
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};
