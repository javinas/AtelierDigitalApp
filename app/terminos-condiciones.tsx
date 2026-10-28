import React from 'react';
import LegalDocumentLayout, { LegalSectionItem } from '../src/components/LegalDocumentLayout';
import { LEGAL_DOCUMENT_VERSIONS, LEGAL_ENTITY_INFO } from '../src/constants/legalDocuments';

const TERMS_SECTIONS: LegalSectionItem[] = [
    {
        id: 'identificacion-servicio',
        number: '01',
        title: 'Identificación del Servicio y del Titular',
        paragraphs: [
            `"${LEGAL_ENTITY_INFO.brandName}" es una plataforma digital especializada en diseño de moda de autor, alta costura, patronaje sobre medida y gestión integral del proceso creativo y de confección textil, operada bajo la dirección creativa de ${LEGAL_ENTITY_INFO.creativeDirector} en ${LEGAL_ENTITY_INFO.cityCountry}.`,
            'El acceso, navegación, registro de cuenta y uso de cualquiera de los módulos de la plataforma implican la lectura, comprensión y aceptación expresa de los presentes Términos y Condiciones de Uso, los cuales constituyen un acuerdo vinculante conforme a la legislación civil, comercial y de comercio electrónico colombiana (Ley 527 de 1999 y Ley 1480 de 2011 en lo que resulte aplicable).',
        ],
        bullets: [
            `Titular de la Plataforma: ${LEGAL_ENTITY_INFO.legalNamePlaceholder}`,
            `Identificación Tributaria (NIT): ${LEGAL_ENTITY_INFO.taxIdPlaceholder}`,
            `Domicilio Principal: ${LEGAL_ENTITY_INFO.cityCountry} · ${LEGAL_ENTITY_INFO.addressPlaceholder}`,
            `Contacto Oficial: ${LEGAL_ENTITY_INFO.contactEmailPlaceholder} · ${LEGAL_ENTITY_INFO.phonePlaceholder}`,
        ],
    },
    {
        id: 'objeto',
        number: '02',
        title: 'Objeto y Alcance de la Plataforma',
        paragraphs: [
            'Atelier Digital tiene por objeto brindar un ecosistema digital de comunicación, seguimiento y gestión técnica entre el Atelier y sus clientas, así como herramientas internas de diseño y patronaje para el equipo creativo. Entre sus funcionalidades se incluyen:',
        ],
        bullets: [
            'Exposición editorial de las líneas de diseño y confección de By Katherine Carroll (Alta Costura y Gala, Primera Comunión y Pajecitos, Disfraces y Comparsas, Carnaval de Barranquilla, Uniformes y Dotaciones, Textiles para el Hogar, Accesorios y Arreglos).',
            'Solicitud de asesorías personalizadas, cotizaciones y consultas de diseño a medida.',
            'Portal privado de clientas para consultar el estado de sus prendas, fichas de medidas registradas, propuestas económicas y programación de pruebas de vestuario (fittings).',
            'Módulos técnicos de uso exclusivo interno del Atelier (banco de patrones CAD 2D, escalado anatómico, inventario textil y expediente técnico de confección).',
        ],
    },
    {
        id: 'cuenta-usuario-mayoria-edad',
        number: '03',
        title: 'Registro de Cuenta, Mayoría de Edad (+18) y Seguridad de Credenciales',
        paragraphs: [
            'Para acceder al portal privado de clientas es necesario crear una cuenta personal suministrando información veraz, exacta y actualizada. El registro de cuentas está reservado exclusivamente a personas mayores de dieciocho (18) años con capacidad legal para contratar conforme a la Ley 27 de 1977 en Colombia.',
        ],
        bullets: [
            'Declaración de mayoría de edad: Al registrarse, la usuaria declara bajo su responsabilidad que tiene 18 años cumplidos o más. Los menores de edad no están autorizados para abrir cuentas por sí mismos.',
            'Custodia de credenciales: La contraseña elegida por la usuaria es personal e intransferible. La titular de la cuenta es responsable de mantener la confidencialidad de su clave y de notificar de inmediato al Atelier cualquier uso no autorizado.',
            'Asignación de roles: Toda cuenta creada desde el formulario público recibe exclusivamente el rol de "Clienta". Los privilegios de "Diseñadora" y "Administración" son de asignación interna y restringida.',
            'Suspensión o cancelación: El Atelier se reserva el derecho de suspender o cancelar cuentas que suministren identidad falsa, incumplan estos Términos o vulneren la seguridad del sistema.',
        ],
    },
    {
        id: 'uso-permitido',
        number: '04',
        title: 'Uso Permitido y Conductas Prohibidas',
        paragraphs: [
            'El usuario se compromete a utilizar Atelier Digital de buena fe, con fines estrictamente personales o profesionales legítimos vinculados a los servicios del Atelier. Queda expresamente prohibido:',
        ],
        bullets: [
            'Intentar vulnerar los controles de autenticación, políticas Row Level Security (RLS), funciones administrativas o mecanismos de seguridad de la base de datos.',
            'Extraer, copiar, reproducir o comercializar sin autorización los moldes digitales, algoritmos de patronaje paramétrico, fotografías editoriales, bocetos o diseños de autor contenidos en la plataforma.',
            'Introducir código malicioso, realizar ataques de denegación de servicio o emplear sistemas automatizados (scraping) sobre la aplicación.',
            'Registrar datos personales, fotografías o medidas corporales de terceras personas sin contar con su autorización previa o representación legal válida.',
        ],
    },
    {
        id: 'propiedad-intelectual',
        number: '05',
        title: 'Propiedad Intelectual e Industrial',
        paragraphs: [
            'La totalidad de los elementos que integran Atelier Digital se encuentran protegidos por las normas nacionales y comunitarias sobre derechos de autor y propiedad industrial (Decisión Andina 351 de 1993, Decisión Andina 486 de 2000 y Ley 23 de 1982). Se establece una diferenciación clara sobre la titularidad de los activos:',
        ],
        bullets: [
            '1. Propiedad exclusiva de Atelier Digital · By Katherine Carroll: La denominación comercial, logotipos, emblemas, paleta visual, arquitectura de software, código fuente, motor de patronaje geométrico, plantillas paramétricas, textos editoriales y fotografías de catálogo son titularidad exclusiva del Atelier o de sus licenciantes. Su visualización en la plataforma no concede licencia alguna de reproducción o explotación comercial.',
            '2. Contenido introducido por la clienta o usuaria: Las fotografías de referencia personal, comentarios e información suministrada por la clienta continúan siendo de su titularidad. Al cargarlos en la plataforma, la usuaria concede al Atelier una licencia no exclusiva, limitada y confidencial con el único propósito de ejecutar el diseño, patronaje y confección solicitados.',
            '3. Activos generados o asistidos con Inteligencia Artificial: Determinadas imágenes editoriales ilustrativas y recursos de apoyo técnico han sido creados con asistencia de herramientas de IA bajo la curaduría, dirección estética y edición de By Katherine Carroll, conforme se detalla en nuestra Política de Transparencia en IA (/ia-transparencia).',
        ],
    },
    {
        id: 'informacion-usuario-y-terceros',
        number: '06',
        title: 'Responsabilidad sobre Información, Medidas, Fotografías y Datos de Clientes',
        paragraphs: [
            'Cuando una usuaria, clienta o diseñadora autorizada introduce en la plataforma fotografías, medidas antropométricas, especificaciones de prendas, notas de taller o datos de contacto, garantiza que:',
        ],
        bullets: [
            'La información es veraz y no infringe derechos de imagen, intimidad ni propiedad intelectual de terceros.',
            'En caso de suministrar medidas o referencias para prendas destinadas a menores de edad (ej. vestidos de Primera Comunión, pajecitos o disfraces infantiles), actúa en calidad de madre, padre o representante legal debidamente facultado.',
            'En caso de que una usuaria profesional o empresa gestione dotaciones o vestuario grupal (ej. comparsas de Carnaval o uniformes corporativos), cuenta con la autorización previa y expresa de cada uno de los titulares cuyas medidas o tallas sean registradas.',
        ],
    },
    {
        id: 'tecnologias-ia',
        number: '07',
        title: 'Uso de Tecnologías de Inteligencia Artificial y Supervisión Humana',
        paragraphs: [
            'Atelier Digital incorpora innovación tecnológica al servicio del oficio artesanal de la alta costura. Toda sugerencia técnica del sistema (como validaciones geométricas del copiloto de patronaje o previsualizaciones ilustrativas) tiene carácter meramente orientativo y auxiliar.',
            'Ninguna decisión relevante sobre el diseño final, el corte de telas nobles, el ajuste anatómico sobre el cuerpo de la clienta o las condiciones contractuales de una prenda es adoptada de forma automatizada por una inteligencia artificial. Toda creación cuenta siempre con la revisión, criterio profesional y supervisión humana directa de Katherine Carroll y su equipo de taller.',
        ],
    },
    {
        id: 'cotizaciones-y-confeccion',
        number: '08',
        title: 'Naturaleza de las Cotizaciones y Especificidad de la Confección a Medida',
        paragraphs: [
            'Las solicitudes enviadas a través de la plataforma y las estimaciones iniciales tienen carácter informativo y preparatorio hasta tanto se apruebe formalmente la propuesta económica, la selección definitiva de textiles y la toma o confirmación presencial/asistida de medidas.',
            'Por tratarse de bienes confeccionados conforme a las especificaciones y medidas estrictamente personalizadas de la clienta, aplican las disposiciones especiales previstas en el Estatuto del Consumidor colombiano (Ley 1480 de 2011, incluyendo el artículo 47 numeral 3 respecto de bienes confeccionados a la medida) en lo que corresponda a la relación contractual acordada en cada orden de trabajo.',
        ],
    },
    {
        id: 'disponibilidad-y-limitaciones',
        number: '09',
        title: 'Disponibilidad Técnica y Limitaciones Razonables de Responsabilidad',
        paragraphs: [
            'El Atelier procura mantener la plataforma operativa de manera continua y segura. No obstante, el servicio digital puede experimentar interrupciones temporales programadas por mantenimiento, actualizaciones de software o eventos de fuerza mayor ajenos al control razonable del Atelier (como fallas en redes de telecomunicaciones o proveedores de nube).',
            'Las tonalidades de las telas, sedas y acabados visualizados en pantalla pueden presentar ligeras variaciones cromáticas dependiendo de la calibración del monitor o dispositivo móvil del usuario, razón por la cual la confirmación final de materiales se realiza de manera personalizada con el Atelier.',
        ],
    },
    {
        id: 'modificaciones-versiones',
        number: '10',
        title: 'Modificaciones y Control de Versiones de los Términos',
        paragraphs: [
            'Atelier Digital podrá actualizar o modificar los presentes Términos y Condiciones cuando se incorporen nuevas funcionalidades tecnológicas, módulos de servicio o cambios normativos.',
            'Cada actualización llevará un número de versión identificable y su fecha de entrada en vigor. Cuando los cambios sean sustanciales, se informará a las usuarias registradas a través de la plataforma o por correo electrónico y, cuando la ley lo requiera, se solicitará la renovación del consentimiento.',
        ],
    },
    {
        id: 'terminacion',
        number: '11',
        title: 'Terminación y Cierre de Cuenta',
        paragraphs: [
            'La clienta podrá solicitar en cualquier momento el cierre de su cuenta digital y la supresión de sus datos personales a través de nuestros canales oficiales de contacto, siempre que no existan órdenes de confección en curso u obligaciones contractuales o legales pendientes de cumplimiento.',
        ],
    },
    {
        id: 'legislacion-aplicable',
        number: '12',
        title: 'Legislación Aplicable, Jurisdicción y Revisión Jurídica',
        paragraphs: [
            'Los presentes Términos y Condiciones se rigen e interpretan de conformidad con las leyes de la República de Colombia. Para cualquier controversia derivada del uso de la plataforma, las partes se someten a las autoridades y jueces competentes en Colombia, sin perjuicio de los mecanismos de arreglo directo y conciliación.',
        ],
        highlightNote:
            'Aviso de gobernanza: Este documento ha sido estructurado para cubrir la operativa real de Atelier Digital · By Katherine Carroll y debe ser validado por el asesor jurídico de confianza del Atelier antes de su publicación comercial definitiva.',
    },
];

export default function TerminosCondicionesScreen() {
    return (
        <LegalDocumentLayout
            activeKey="terminos-condiciones"
            overline="MARCO CONTRACTUAL Y REGLAS DE USO · REPÚBLICA DE COLOMBIA"
            title="Términos y Condiciones de Uso"
            subtitle="Condiciones que regulan el acceso, registro de cuenta, propiedad intelectual, uso de herramientas tecnológicas y servicios de diseño a medida en Atelier Digital · By Katherine Carroll."
            version={LEGAL_DOCUMENT_VERSIONS.TERMS_OF_SERVICE}
            normativeReference="Ley 527/1999 · Ley 1480/2011 · Ley 27/1977"
            heroImage={require('../assets/editorial/legal_atelier_workspace.jpg')}
            heroImageCaption="Imagen editorial ilustrativa generada con asistencia de IA · Dirección creativa Atelier By Katherine Carroll"
            sections={TERMS_SECTIONS}
        />
    );
}

