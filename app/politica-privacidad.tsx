import React from 'react';
import LegalDocumentLayout, { LegalSectionItem } from '../src/components/LegalDocumentLayout';
import { LEGAL_DOCUMENT_VERSIONS, LEGAL_ENTITY_INFO } from '../src/constants/legalDocuments';

const PRIVACY_SECTIONS: LegalSectionItem[] = [
    {
        id: 'responsable',
        number: '01',
        title: 'Identificación del Responsable del Tratamiento',
        paragraphs: [
            `En cumplimiento de lo dispuesto por el artículo 15 de la Constitución Política de Colombia, la Ley Estatutaria 1581 de 2012, el Decreto Único Reglamentario 1074 de 2015 y demás normas concordantes, se informa a las clientas, usuarios registrados y visitantes de la plataforma "${LEGAL_ENTITY_INFO.brandName}" los datos de identificación del Responsable del Tratamiento:`,
        ],
        bullets: [
            `Marca y Plataforma Digital: ${LEGAL_ENTITY_INFO.brandName} (${LEGAL_ENTITY_INFO.commercialName})`,
            `Dirección Creativa: ${LEGAL_ENTITY_INFO.creativeDirector}`,
            `Razón Social / Nombre del Titular Legal: ${LEGAL_ENTITY_INFO.legalNamePlaceholder}`,
            `Identificación Tributaria (NIT / CC): ${LEGAL_ENTITY_INFO.taxIdPlaceholder}`,
            `Domicilio y Ciudad: ${LEGAL_ENTITY_INFO.cityCountry}`,
            `Dirección de Notificaciones Físicas: ${LEGAL_ENTITY_INFO.addressPlaceholder}`,
            `Correo Electrónico para Protección de Datos: ${LEGAL_ENTITY_INFO.contactEmailPlaceholder}`,
            `Teléfono / Canal de Contacto Oficial: ${LEGAL_ENTITY_INFO.phonePlaceholder} · Formulario oficial en ${LEGAL_ENTITY_INFO.contactRoute}`,
        ],
        highlightNote:
            'Canal directo de atención al titular: Cualquier solicitud relacionada con el ejercicio de derechos de Habeas Data (Ley 1581 de 2012) es atendida directamente a través de info@bykatherinecarroll.com, la línea +57 305 243 0400 o el formulario oficial en /contacto.',
    },
    {
        id: 'datos-tratados',
        number: '02',
        title: 'Categorías de Datos Personales Objeto de Tratamiento',
        paragraphs: [
            'De acuerdo con la auditoría técnica real de la arquitectura y base de datos de Atelier Digital, el sistema únicamente solicita, almacena y procesa información estrictamente vinculada con la relación comercial, el diseño de moda a medida, el patronaje anatómico y la gestión de proyectos de alta costura.',
            'No recopilamos datos que no tengan soporte funcional en los módulos activos de la plataforma. Las categorías de información que pueden ser tratadas son:',
        ],
        bullets: [
            'Datos de identificación y contacto de cuenta (tabla profiles): nombre completo, dirección de correo electrónico, número telefónico opcional, fotografía o avatar de perfil y rol asignado en la plataforma (clienta, diseñadora o administración).',
            'Datos de acceso y trazabilidad de consentimiento (auth.users y user_legal_consents): credenciales cifradas de autenticación, fecha y hora de registro, confirmación de mayoría de edad (+18 años), versión aceptada de los documentos legales y estado de autorizaciones opcionales.',
            'Datos de expedientes de clientas del Atelier (tabla clients): nombres, apellidos, documento de identidad cuando se requiera para facturación o contrato, correo electrónico, teléfono/WhatsApp, dirección o ciudad, notas de estilo y preferencias de confección.',
            'Medidas antropométricas e historial anatómico (tablas measurements y measurement_values): contornos corporales (busto, bajo busto, cintura, cadera, cuello, brazo, muñeca, muslo, etc.), largos longitudinales (talle delantero, talle espalda, largo de hombro, brazo, entrepierna, estatura total) y observaciones técnicas de postura o calce.',
            'Información de proyectos, prendas y órdenes de confección (tablas projects, garments, project_timelines): tipo de prenda, ocasión de uso, estado de avance del taller, fechas estimadas de entrega y registros de control de calidad.',
            'Citas, pruebas de vestuario (fittings) y fotografías de proceso (tablas appointments, fittings, project_files): fechas programadas de prueba, ajustes requeridos sobre el toile o prenda, fotografías de referencia estética, fotografías de telas/insumos y fotografías técnicas de calce durante las pruebas de taller.',
            'Propuestas económicas, cotizaciones y materiales (tablas quotes, quote_items, fabrics, garment_materials): presupuestos detallados, selección de textiles, metraje estimado, costos de confección y aprobaciones de propuesta.',
            'Información técnica de sesión: tokens locales de autenticación necesarios para mantener la sesión segura en el navegador o dispositivo móvil y metadatos básicos del navegador (User-Agent) al momento de otorgar el consentimiento legal.',
        ],
    },
    {
        id: 'medidas-y-datos-sensibles',
        number: '03',
        title: 'Tratamiento Especial de Medidas Corporales, Fotografías y Datos Sensibles',
        paragraphs: [
            'En el ejercicio del diseño de alta costura y patronaje sobre medida, la toma de medidas antropométricas y el registro fotográfico de pruebas de calce (fittings) constituyen insumos técnicos esenciales para garantizar que la prenda se adapte con precisión a la anatomía de cada persona.',
            'Aunque las medidas corporales estándar (como contornos y largos de sastrería) no constituyen por sí mismas datos sensibles en todos los contextos, Atelier Digital les otorga un estándar reforzado de confidencialidad y custodia restringida. Cuando una fotografía de prueba de vestuario o una anotación anatómica pueda revelar aspectos íntimos de la imagen física o condiciones particulares del cuerpo, será tratada bajo las garantías de los artículos 5 y 6 de la Ley 1581 de 2012.',
        ],
        bullets: [
            'Carácter facultativo: Se informa expresamente a toda titular que no está obligada a autorizar el tratamiento de datos sensibles (como fotografías donde sea reconocible su rostro o silueta en pruebas internas), salvo que resulten estrictamente indispensables para la prestación de un servicio específico solicitado por ella misma.',
            'Minimización de datos: En las fotografías técnicas de fitting se prioriza el encuadre sobre la caída del tejido, costuras y entalle de la prenda, evitando capturas innecesarias.',
            'Acceso restringido por políticas RLS (Row Level Security): Las medidas y fotografías del expediente solo son accesibles por la diseñadora titular, la administración autorizada del Atelier y la propia clienta titular de la cuenta.',
        ],
    },
    {
        id: 'menores-de-edad',
        number: '04',
        title: 'Mayoría de Edad y Protección de Niños, Niñas y Adolescentes',
        paragraphs: [
            'El registro de cuentas de usuario y la celebración de contratos o cotizaciones en Atelier Digital están dirigidos exclusivamente a personas mayores de dieciocho (18) años con plena capacidad legal, conforme a la Ley 27 de 1977 en Colombia.',
            'No obstante, dado que By Katherine Carroll cuenta con líneas de confección infantil (como Primera Comunión, Pajecitos, Disfraces y Vestidos para Niña), cualquier registro de medidas antropométricas o referencias de confección correspondientes a un menor de edad deberá ser suministrado y autorizado única y exclusivamente por su madre, padre o representante legal debidamente facultado, en estricto respeto del interés superior de los niños, niñas y adolescentes consagrado en el artículo 7 de la Ley 1581 de 2012 y la Ley 1098 de 2006.',
        ],
        highlightNote:
            'Si el Atelier detecta que un menor de 18 años ha creado una cuenta de usuario directamente sin representación legal, procederá a la suspensión preventiva de la cuenta y a la eliminación segura de los datos asociados.',
    },
    {
        id: 'finalidades',
        number: '05',
        title: 'Finalidades del Tratamiento de la Información',
        paragraphs: [
            'Los datos personales recolectados con autorización previa, expresa e informada serán utilizados exclusivamente para las siguientes finalidades:',
        ],
        bullets: [
            'Finalidades esenciales del servicio (Obligatorias): (i) Crear, autenticar y administrar la cuenta de clienta en Atelier Digital; (ii) Elaborar fichas antropométricas, moldes de patronaje CAD 2D y escalados personalizados; (iii) Gestionar proyectos de confección, propuestas de diseño, cotizaciones, selección de textiles y programación de citas o pruebas de vestuario (fittings); (iv) Mantener comunicación directa sobre el estado de las prendas encargadas; y (v) Cumplir obligaciones contractuales, contables, fiscales y legales aplicables en Colombia.',
            'Finalidades de seguridad y auditoría (Obligatorias): Conservar evidencia trazable de la aceptación de Términos, Política de Privacidad y mayoría de edad, prevenir accesos no autorizados y garantizar la integridad técnica de la plataforma.',
            'Finalidades comerciales y de novedades (Opcionales y separadas): Únicamente cuando la usuaria haya marcado voluntariamente la casilla opcional correspondiente, enviar invitaciones a lanzamientos de colección, cápsulas de temporada, eventos de alta costura y novedades editoriales de By Katherine Carroll. La titular podrá revocar este consentimiento comercial en cualquier momento sin afectar sus servicios de confección activos.',
        ],
    },
    {
        id: 'derechos-titular',
        number: '06',
        title: 'Derechos de los Titulares de los Datos (Habeas Data)',
        paragraphs: [
            'De conformidad con el artículo 8 de la Ley 1581 de 2012, toda titular de datos personales registrados en Atelier Digital cuenta con los siguientes derechos:',
        ],
        bullets: [
            'Conocer, acceder y consultar de forma gratuita sus datos personales, fichas de medidas y registros que sean objeto de tratamiento por parte del Atelier.',
            'Actualizar y rectificar su información personal o de contacto cuando sea parcial, inexacta, incompleta o induzca a error.',
            'Solicitar prueba de la autorización otorgada al Responsable del Tratamiento, salvo en los casos en que la ley exceptúe dicho requisito.',
            'Ser informada, previa solicitud, respecto del uso y finalidades que se le ha dado a sus datos personales.',
            'Revocar la autorización y/o solicitar la supresión del dato cuando en el tratamiento no se respeten los principios, derechos y garantías constitucionales y legales, o cuando no exista un deber legal o contractual de permanecer en la base de datos.',
            'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a lo dispuesto en la Ley 1581 de 2012, una vez agotado el trámite de consulta o reclamo directo ante el Responsable del Tratamiento.',
        ],
    },
    {
        id: 'procedimiento-arco',
        number: '07',
        title: 'Procedimiento para Consultas, Reclamos, Rectificación y Eliminación',
        paragraphs: [
            'Para ejercer cualquiera de sus derechos (conocer, actualizar, rectificar, suprimir datos o revocar autorizaciones), la titular o sus causahabientes podrán formular su solicitud a través del formulario oficial en la sección de Contacto (/contacto) o mediante comunicación escrita dirigida al correo electrónico oficial de protección de datos del Atelier, indicando su nombre completo, correo registrado, descripción clara de la solicitud y documentos que acrediten su identidad.',
        ],
        bullets: [
            'Trámite de Consultas (Art. 14 Ley 1581 de 2012): Las consultas serán atendidas en un término máximo de diez (10) días hábiles contados a partir de la fecha de recibo. Cuando no fuere posible atender la consulta dentro de dicho término, se informará a la interesada expresando los motivos de la demora y señalando la fecha en que se atenderá su consulta, la cual en ningún caso podrá superar los cinco (5) días hábiles siguientes al vencimiento del primer término.',
            'Trámite de Reclamos, Corrección, Supresión o Revocatoria (Art. 15 Ley 1581 de 2012): El término máximo para atender el reclamo será de quince (15) días hábiles contados a partir del día siguiente a la fecha de su recibo. Si el reclamo resulta incompleto, se requerirá a la interesada dentro de los cinco (5) días siguientes a su recepción para que subsane las fallas. Cuando no fuere posible atender el reclamo dentro del término inicial, se informará a la interesada los motivos de la demora y la fecha en que se atenderá, sin superar ocho (8) días hábiles adicionales.',
        ],
    },
    {
        id: 'seguridad-proveedores-conservacion',
        number: '08',
        title: 'Medidas de Seguridad, Proveedores Tecnológicos y Vigencia',
        paragraphs: [
            'Atelier Digital implementa medidas técnicas, humanas y administrativas razonables para proteger la confidencialidad, integridad y disponibilidad de la información y evitar su adulteración, pérdida, consulta o acceso no autorizado.',
        ],
        bullets: [
            'Seguridad técnica: Control de acceso basado en roles (RBAC), políticas de seguridad a nivel de fila (Row Level Security - RLS) en base de datos PostgreSQL, cifrado de contraseñas, comunicaciones bajo protocolo seguro HTTPS/TLS y almacenamiento privado con URLs firmadas temporales para archivos de proyectos.',
            'Proveedores de infraestructura y encargados tecnológicos: La plataforma utiliza servicios de infraestructura en la nube provistos por Supabase (autenticación, base de datos relacional y almacenamiento de objetos) y Vercel (despliegue y entrega de la aplicación web). Dichos proveedores operan bajo estándares internacionales de seguridad de la información. En caso de que el alojamiento en la nube implique transmisión o almacenamiento en servidores ubicados fuera de Colombia, el tratamiento se sujeta a las cláusulas de confidencialidad y seguridad aplicables.',
            'Inteligencia Artificial y Privacidad: El copiloto técnico de patronaje integrado en la plataforma opera mediante reglas determinísticas locales en la aplicación; no enviamos fichas de medidas corporales ni fotografías privadas de clientas a servicios externos de entrenamiento de modelos de inteligencia artificial.',
            'Temporalidad y conservación: Los datos personales se conservarán durante el tiempo en que se mantenga activa la cuenta de la clienta o la relación comercial y creativa con el Atelier, y posteriormente durante el término adicional que exijan las normas contables, tributarias o contractuales colombianas aplicables. Cumplidas las finalidades y los plazos legales, se procederá a su supresión o anonimización segura.',
        ],
    },
];

export default function PoliticaPrivacidadScreen() {
    return (
        <LegalDocumentLayout
            activeKey="politica-privacidad"
            overline="PROTECCIÓN DE DATOS PERSONALES · LEY 1581 DE 2012"
            title="Política de Tratamiento de Datos Personales"
            subtitle="Directrices de confidencialidad, custodia de fichas antropométricas, finalidades de uso y ejercicio de derechos de Habeas Data para las clientas y usuarias de Atelier Digital · By Katherine Carroll."
            version={LEGAL_DOCUMENT_VERSIONS.PRIVACY_POLICY}
            normativeReference="Ley 1581/2012 · Decreto 1074/2015"
            heroImage={require('../assets/editorial/legal_privacy_custody.jpg')}
            heroImageCaption="Imagen editorial ilustrativa generada con asistencia de IA · Dirección creativa Atelier By Katherine Carroll"
            sections={PRIVACY_SECTIONS}
        />
    );
}

