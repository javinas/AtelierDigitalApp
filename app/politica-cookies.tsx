import React from 'react';
import LegalDocumentLayout, { LegalSectionItem } from '../src/components/LegalDocumentLayout';
import { LEGAL_DOCUMENT_VERSIONS } from '../src/constants/legalDocuments';

const COOKIES_SECTIONS: LegalSectionItem[] = [
    {
        id: 'que-son-cookies',
        number: '01',
        title: '¿Qué son las Cookies y las Tecnologías de Almacenamiento Local?',
        paragraphs: [
            'Las cookies y las tecnologías equivalentes de almacenamiento en el navegador (como localStorage y sessionStorage en aplicaciones web modernas, o AsyncStorage en dispositivos móviles) son pequeños registros técnicos que una aplicación guarda en el dispositivo del usuario para recordar su sesión autenticada, mantener la seguridad del acceso o conservar preferencias de visualización.',
            'En cumplimiento del principio de transparencia y de las orientaciones de la Superintendencia de Industria y Comercio (SIC) sobre tecnologías de rastreo en entornos digitales, Atelier Digital informa de manera clara y verificable qué tecnologías utiliza realmente.',
        ],
    },
    {
        id: 'auditoria-real-atelier',
        number: '02',
        title: 'Resultado de la Auditoría Técnica de Atelier Digital',
        paragraphs: [
            'Tras realizar una auditoría técnica integral del código fuente y las dependencias de la versión Web y Móvil de Atelier Digital · By Katherine Carroll, se certifica que la plataforma aplica una arquitectura de privacidad por diseño (Privacy by Design):',
        ],
        bullets: [
            'Cero cookies publicitarias o de rastreo comercial: Atelier Digital NO instala cookies de redes publicitarias, píxeles de seguimiento ocultos, ni perfiladores de comportamiento de terceros.',
            'Cero cookies de analítica invasiva: Actualmente la aplicación NO ejecuta scripts de rastreo analítico de terceros que recopilen hábitos de navegación entre sitios web.',
            'Uso exclusivo de Almacenamiento Local Técnico Esencial: La aplicación utiliza únicamente el almacenamiento local nativo del navegador (window.localStorage en Web y AsyncStorage en iOS/Android) para gestionar la sesión de usuario autenticada mediante Supabase Auth.',
        ],
        highlightNote:
            '¿Por qué no mostramos un banner emergente invasivo de cookies? Porque Atelier Digital no utiliza cookies no esenciales, publicitarias ni de rastreo. El único almacenamiento técnico empleado es estrictamente necesario para que usted pueda iniciar sesión de forma segura.',
    },
    {
        id: 'detalle-almacenamiento',
        number: '03',
        title: 'Inventario de Elementos Técnicos Esenciales Utilizados',
        paragraphs: [
            'A continuación se detallan los únicos registros técnicos que pueden almacenarse en su navegador cuando interactúa con Atelier Digital:',
        ],
        bullets: [
            'Token de Sesión de Autenticación (Clave: sb-<project-ref>-auth-token en localStorage): Almacenamiento estrictamente necesario provisto por Supabase Auth. Contiene el token JWT cifrado de sesión y el token de refresco cuando la clienta o diseñadora inicia sesión. Sin este elemento, el usuario tendría que introducir su correo y contraseña en cada cambio de pantalla. Se elimina automáticamente al pulsar "Cerrar Sesión".',
            'Estado Temporal de Navegación (Memoria de sesión de Expo Router): Mantiene la ruta activa mientras la pestaña permanece abierta, sin persistir datos personales tras cerrar el navegador.',
        ],
    },
    {
        id: 'categorias-potenciales',
        number: '04',
        title: 'Política frente a Futuras Cookies de Preferencias o Analítica',
        paragraphs: [
            'En caso de que en futuras versiones de Atelier Digital se decida incorporar herramientas opcionales de medición de rendimiento o preferencias avanzadas que impliquen el uso de cookies no esenciales:',
        ],
        bullets: [
            'Se actualizará previamente la presente Política indicando el nombre, proveedor, finalidad y duración de cada cookie.',
            'Se habilitará un mecanismo de consentimiento previo y granular (opt-in) para que la usuaria pueda aceptar o rechazar libremente cualquier tecnología no esencial sin que ello impida el acceso a su cuenta de clienta.',
        ],
    },
    {
        id: 'gestion-y-eliminacion',
        number: '05',
        title: '¿Cómo Gestionar o Eliminar el Almacenamiento Local desde su Navegador?',
        paragraphs: [
            'Usted tiene control total sobre los datos técnicos guardados en su navegador o dispositivo:',
        ],
        bullets: [
            'Desde la aplicación: Al hacer clic en el botón "Cerrar Sesión" o "Salir" en la cabecera de Atelier Digital, el sistema instruye inmediatamente la eliminación del token de sesión local.',
            'Desde la configuración de su navegador (Chrome, Safari, Edge, Firefox): Puede acceder a Configuración > Privacidad y Seguridad > Borrar datos de navegación (o Datos de sitios web) para limpiar en cualquier momento las cookies y el almacenamiento local (localStorage). Tenga en cuenta que al borrar el almacenamiento local, cualquier sesión abierta se cerrará por seguridad.',
        ],
    },
];

export default function PoliticaCookiesScreen() {
    return (
        <LegalDocumentLayout
            activeKey="politica-cookies"
            overline="TRANSPARENCIA TÉCNICA EN NAVEGACIÓN WEB Y MÓVIL"
            title="Política de Cookies y Almacenamiento Local"
            subtitle="Explicación transparente sobre el uso exclusivo de almacenamiento local técnico para seguridad de sesión en Atelier Digital · By Katherine Carroll, libre de rastreadores publicitarios."
            version={LEGAL_DOCUMENT_VERSIONS.COOKIES_POLICY}
            normativeReference="Ley 1581/2012 · Directrices SIC"
            heroImage={require('../assets/editorial/legal_editorial_archive.jpg')}
            heroImageCaption="Imagen editorial ilustrativa generada con asistencia de IA · Dirección creativa Atelier By Katherine Carroll"
            sections={COOKIES_SECTIONS}
        />
    );
}

