// ==============================================================================
// ATELIER DIGITAL — DICCIONARIOS Y ETIQUETAS: MÓDULO 08 — AGENDA
// Archivo: src/components/agenda/agendaLabels.ts
// ==============================================================================

import {
    AgendaSourceKind,
    AppointmentStatus,
    AppointmentType,
    AtelierLocationSpace,
} from '../../types/agenda';

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
    consultation: 'Consulta & Asesoría',
    measurement_session: 'Toma de Medidas',
    design_presentation: 'Presentación de Diseño & Telas',
    toile_fitting: 'Prueba en Glasilla (Toile)',
    garment_fitting: 'Prueba en Tela Definitiva',
    final_fitting: 'Prueba Final & Acabados',
    delivery_ceremony: 'Entrega de Prenda',
    pickup_return: 'Recogida / Compostura',
    alteration_review: 'Revisión de Ajuste',
    supplier_meeting: 'Reunión con Proveedor',
    group_campaign: 'Jornada de Medición Grupal',
    internal_activity: 'Actividad Interna de Taller',
    other: 'Otro Compromiso',
};

export const APPOINTMENT_TYPE_OPTIONS: { value: AppointmentType; label: string; requiresClient: boolean }[] = [
    { value: 'consultation', label: 'Consulta & Asesoría', requiresClient: true },
    { value: 'measurement_session', label: 'Toma de Medidas', requiresClient: true },
    { value: 'design_presentation', label: 'Presentación de Diseño & Telas', requiresClient: true },
    { value: 'toile_fitting', label: 'Prueba en Glasilla (Toile)', requiresClient: true },
    { value: 'garment_fitting', label: 'Prueba en Tela Definitiva', requiresClient: true },
    { value: 'final_fitting', label: 'Prueba Final & Acabados', requiresClient: true },
    { value: 'delivery_ceremony', label: 'Entrega de Prenda', requiresClient: true },
    { value: 'pickup_return', label: 'Recogida / Compostura', requiresClient: true },
    { value: 'alteration_review', label: 'Revisión de Ajuste', requiresClient: true },
    { value: 'supplier_meeting', label: 'Reunión con Proveedor', requiresClient: false },
    { value: 'internal_activity', label: 'Actividad Interna de Taller', requiresClient: false },
    { value: 'group_campaign', label: 'Jornada de Medición Grupal', requiresClient: true },
    { value: 'other', label: 'Otro Compromiso', requiresClient: false },
];

export const APPOINTMENT_STATUS_META: Record<
    AppointmentStatus,
    { label: string; bg: string; border: string; color: string }
> = {
    scheduled: { label: 'Programada', bg: '#F8F2E9', border: '#A78350', color: '#8A6A4A' },
    confirmed: { label: 'Confirmada', bg: '#EBF3FB', border: '#B8D5E5', color: '#2C5E8A' },
    rescheduled: { label: 'Reprogramada', bg: '#FFF8E7', border: '#F2D48E', color: '#B37D14' },
    completed: { label: 'Realizada', bg: '#F1F7F2', border: '#C2DFCA', color: '#3D6346' },
    cancelled: { label: 'Cancelada', bg: '#FAF2F2', border: '#E8C5C5', color: '#9E3B3B' },
    no_show: { label: 'Inasistencia', bg: '#F4F1EC', border: '#D6C8B6', color: '#766B62' },
};

export const LOCATION_SPACE_LABELS: Record<AtelierLocationSpace, string> = {
    probador_principal: 'Probador Principal',
    salon_privado: 'Salón Privado',
    mesa_corte_taller: 'Mesa de Corte & Patronaje',
    taller_general: 'Taller Interno',
    visita_externa: 'Visita Externa',
    virtual: 'Videollamada / Virtual',
};

export const LOCATION_SPACE_OPTIONS: { value: AtelierLocationSpace; label: string }[] = [
    { value: 'probador_principal', label: 'Probador Principal' },
    { value: 'salon_privado', label: 'Salón Privado' },
    { value: 'mesa_corte_taller', label: 'Mesa de Corte & Patronaje' },
    { value: 'taller_general', label: 'Taller Interno' },
    { value: 'visita_externa', label: 'Visita Externa' },
    { value: 'virtual', label: 'Videollamada / Virtual (sin bloqueo)' },
];

export const AGENDA_SOURCE_META: Record<
    AgendaSourceKind,
    { badge: string; accent: string; bg: string; border: string }
> = {
    m08_appointment: { badge: 'Agenda M08', accent: '#A78350', bg: '#FBF7EF', border: '#E6D9C8' },
    m06_fitting_session: { badge: 'Fitting M06', accent: '#8A6A4A', bg: '#F8F2E9', border: '#DFC7A5' },
    m03_delivery_milestone: { badge: 'Entrega M03', accent: '#3D6346', bg: '#F1F7F2', border: '#C2DFCA' },
    m02_measurement_campaign: { badge: 'Jornada M02', accent: '#2C5E8A', bg: '#EBF3FB', border: '#B8D5E5' },
};

export const DURATION_PRESET_MINUTES = [30, 45, 60, 90, 120] as const;

export const WEEKDAY_SHORT_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
