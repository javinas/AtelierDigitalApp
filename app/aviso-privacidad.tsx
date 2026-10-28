import React from 'react';
import LegalDocumentLayout, { LegalSectionItem } from '../src/components/LegalDocumentLayout';
import { LEGAL_DOCUMENT_VERSIONS, LEGAL_ENTITY_INFO } from '../src/constants/legalDocuments';

const PRIVACY_NOTICE_SECTIONS: LegalSectionItem[] = [
    {
        id: 'quien-trata',
        number: '01',
        title: '¿Quién es el Responsable del Tratamiento de sus Datos?',
        paragraphs: [
            `El Responsable del Tratamiento de los datos personales recolectados a través de los formularios de registro, contacto, perfiles de clienta y expedientes de confección de la plataforma "${LEGAL_ENTITY_INFO.brandName}" es:`,
        ],
        bullets: [
            `Denominación Comercial: ${LEGAL_ENTITY_INFO.commercialName} (${LEGAL_ENTITY_INFO.brandName})`,
            `Titular / Razón Social: ${LEGAL_ENTITY_INFO.legalNamePlaceholder}`,
            `NIT / Identificación: ${LEGAL_ENTITY_INFO.taxIdPlaceholder}`,
            `Ubicación Principal: ${LEGAL_ENTITY_INFO.cityCountry}`,
            `Dirección de Contacto: ${LEGAL_ENTITY_INFO.addressPlaceholder}`,
            `Correo Electrónico Oficial: ${LEGAL_ENTITY_INFO.contactEmailPlaceholder}`,
            `Teléfono / WhatsApp de Atención: ${LEGAL_ENTITY_INFO.phonePlaceholder}`,
        ],
    },
    {
        id: 'que-informacion',
        number: '02',
        title: '¿Qué Tipo de Información Solicitamos?',
        paragraphs: [
            'Recopilamos únicamente los datos pertinentes y necesarios para nuestra relación de diseño y confección a medida:',
        ],
        bullets: [
            'Datos de registro y contacto: Nombre completo, correo electrónico, teléfono opcional y credenciales de acceso seguro.',
            'Datos de diseño, medidas y confección (cuando contrata o solicita prendas a medida): Medidas corporales antropométricas para patronaje, preferencias textiles, cotizaciones, programación de citas y fotografías técnicas de pruebas de vestuario (fittings).',
            'Datos de trazabilidad legal: Confirmación de mayoría de edad (+18 años), fecha/hora y versión aceptada de nuestros documentos legales.',
        ],
        highlightNote:
            'Tratamiento de datos sensibles y de menores: Se informa que es de carácter facultativo suministrar datos sensibles (como fotografías que revelen rasgos físicos íntimos) o datos de niños, niñas y adolescentes (los cuales solo pueden ser registrados por sus padres o representantes legales para líneas de confección infantil).',
    },
    {
        id: 'para-que',
        number: '03',
        title: '¿Para Qué Utilizamos sus Datos Personales?',
        paragraphs: [
            'Sus datos personales serán tratados para las siguientes finalidades principales:',
        ],
        bullets: [
            'Crear y gestionar su cuenta personal en el portal de clientas de Atelier Digital.',
            'Atender sus solicitudes de cotización, asesoría de diseño y consultas comerciales.',
            'Desarrollar moldes anatómicos personalizados, confeccionar sus prendas de alta costura y coordinar citas de prueba (fittings).',
            'Llevar el historial técnico de sus órdenes, materiales seleccionados y entregas.',
            'Cumplir con las obligaciones legales, contractuales y contables vigentes en Colombia.',
            'Enviar comunicaciones sobre nuevas colecciones o eventos del Atelier, única y exclusivamente si usted otorgó su consentimiento separado y opcional para ello.',
        ],
    },
    {
        id: 'derechos-y-consulta',
        number: '04',
        title: '¿Cómo Ejercer sus Derechos y Dónde Consultar la Política Completa?',
        paragraphs: [
            'Como titular de sus datos personales, usted tiene derecho en todo momento a conocer, actualizar, rectificar y solicitar la supresión de su información, así como a revocar la autorización otorgada y presentar consultas o reclamos gratuitos conforme a la Ley 1581 de 2012 y el Decreto 1074 de 2015.',
            'Puede consultar el texto íntegro de nuestra Política de Tratamiento de Datos Personales directamente en la ruta /politica-privacidad de esta plataforma, y radicar cualquier solicitud o reclamo a través de nuestro canal de Contacto (/contacto) o en el correo oficial indicado en el numeral 01.',
        ],
    },
];

export default function AvisoPrivacidadScreen() {
    return (
        <LegalDocumentLayout
            activeKey="aviso-privacidad"
            overline="INFORMACIÓN SINTÉTICA AL TITULAR · DECRETO 1074 DE 2015"
            title="Aviso de Privacidad"
            subtitle="Resumen ejecutivo, claro y accesible sobre quién trata su información personal en Atelier Digital, con qué propósito y cómo ejercer sus derechos constitucionales de Habeas Data."
            version={LEGAL_DOCUMENT_VERSIONS.PRIVACY_NOTICE}
            normativeReference="Art. 2.2.2.25.3.2 Decreto 1074/2015"
            heroImage={require('../assets/editorial/legal_privacy_custody.jpg')}
            heroImageCaption="Imagen editorial ilustrativa generada con asistencia de IA · Dirección creativa Atelier By Katherine Carroll"
            sections={PRIVACY_NOTICE_SECTIONS}
        />
    );
}

