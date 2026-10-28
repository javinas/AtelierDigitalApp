import React from 'react';
import LegalDocumentLayout, { LegalSectionItem } from '../src/components/LegalDocumentLayout';
import { LEGAL_DOCUMENT_VERSIONS, LEGAL_ENTITY_INFO } from '../src/constants/legalDocuments';

const AI_TRANSPARENCY_SECTIONS: LegalSectionItem[] = [
    {
        id: 'compromiso-transparencia',
        number: '01',
        title: 'Nuestro Compromiso de Transparencia en Inteligencia Artificial',
        paragraphs: [
            `En "${LEGAL_ENTITY_INFO.brandName}" concebimos la tecnología como un aliado silencioso y riguroso que enaltece —y jamás sustituye— el talento humano, la sensibilidad artística y el oficio artesanal de la alta costura.`,
            'Con el propósito de garantizar una transparencia absoluta hacia nuestras clientas, aliadas y autoridades, esta política explica con precisión en qué componentes de nuestra plataforma intervienen sistemas algorítmicos o herramientas de Inteligencia Artificial (IA), bajo qué límites operan y cómo protegemos la autoría y la privacidad en cada etapa.',
        ],
    },
    {
        id: 'uso-en-imagenes-editoriales',
        number: '02',
        title: 'Uso de IA en Imágenes Editoriales, Guías Visuales y Activos de Referencia',
        paragraphs: [
            'La plataforma integra fotografías y composiciones visuales diseñadas para ilustrar arquetipos anatómicos, guías técnicas de toma de medidas sobre maniquí Stockman, tipologías de prendas de catálogo y ambientaciones de taller.',
            'Informamos de manera expresa y transparente que determinadas imágenes editoriales, ilustrativas y de referencia dentro de la aplicación han sido generadas o asistidas mediante modelos de síntesis visual por Inteligencia Artificial, bajo la dirección creativa, especificación técnica de sastrería y curaduría estética de By Katherine Carroll.',
        ],
        bullets: [
            'Finalidad ilustrativa y pedagógica: Las imágenes generadas o asistidas con IA en las guías de medición, el catálogo de tipologías de prendas y los encabezados informativos tienen como propósito orientar visualmente el procedimiento anatómico o el concepto estético.',
            'Identificación clara en el inventario de activos: Todos los recursos visuales cuentan con trazabilidad documental en el inventario técnico de la plataforma, distinguiendo su carácter ilustrativo.',
            'Confirmación real en el Atelier: Las prendas reales entregadas a cada clienta son confeccionadas físicamente en el taller de Barranquilla con textiles verdaderos seleccionados personalmente junto a la diseñadora.',
        ],
    },
    {
        id: 'copiloto-tecnico-y-desarrollo',
        number: '03',
        title: 'Asistencia Algorítmica en Patronaje (Copiloto Local) y Desarrollo de Software',
        paragraphs: [
            'Además de los recursos visuales ilustrativos, Atelier Digital emplea herramientas computacionales y de asistencia inteligente en dos ámbitos técnicos:',
        ],
        bullets: [
            '1. Copiloto Técnico de Patronaje y Taller (Módulo Interno Determinístico): La plataforma incorpora un motor de sugerencias técnicas (aiCopilotService) que analiza reglas geométricas, márgenes de costura, holguras recomendadas y consistencia de medidas antropométricas. Este módulo opera de forma 100% local y determinística dentro de la aplicación; NO envía los datos personales ni las medidas de las clientas a servidores externos de inteligencia artificial generativa.',
            '2. Asistencia en Ingeniería de Software y Documentación: En la construcción del código fuente, validación de pruebas automatizadas y estructuración documental de la plataforma se han utilizado herramientas avanzadas de asistencia al desarrollo asistidas por IA, siempre auditadas, probadas y validadas por el equipo de ingeniería y dirección del proyecto.',
        ],
    },
    {
        id: 'supervision-humana',
        number: '04',
        title: 'Principio Rector: Supervisión Humana y Dirección de Autor',
        paragraphs: [
            'En Atelier Digital rige el principio de supervisión humana efectiva (Human-in-the-Loop). Ninguna herramienta de IA ni algoritmo de cálculo toma decisiones autónomas que afecten los derechos de las clientas o la calidad final de una prenda:',
        ],
        bullets: [
            'Dirección creativa indelegable: Cada propuesta de diseño, selección de caída textil, proporción estilística y acabado de alta costura es definida y aprobada personalmente por la diseñadora Katherine Carroll.',
            'Validación anatómica presencial o asistida: Los cálculos de patronaje CAD 2D y las alertas del copiloto técnico son revisados por la patronista/diseñadora antes del corte en tela y corroborados en las pruebas de vestuario (fittings).',
            'Ausencia de perfilamiento automatizado: No utilizamos sistemas de IA para evaluar solvencia, discriminar precios ni tomar decisiones automatizadas sobre la admisión o rechazo de clientas.',
        ],
    },
    {
        id: 'derechos-contenido-usuario',
        number: '05',
        title: 'Derechos sobre el Contenido del Usuario y Prohibición de Entrenamiento Externo',
        paragraphs: [
            'Respetamos profundamente la intimidad de la silueta de nuestras clientas y la originalidad de sus ideas:',
        ],
        bullets: [
            'Propiedad de las referencias de la clienta: Las fotografías, bocetos o ideas que una clienta comparta en su expediente pertenecen a ella y se utilizan exclusivamente para confeccionar su prenda.',
            'No entrenamiento de modelos de terceros: Atelier Digital NO vende, cede ni utiliza las fotografías de pruebas de vestuario (fittings), rostros ni fichas de medidas antropométricas de sus clientas para entrenar modelos públicos o externos de Inteligencia Artificial.',
        ],
        highlightNote:
            'Compromiso ético: La confidencialidad del cuerpo y la imagen de cada mujer, hombre, niña o niño atendido en nuestro Atelier prevalece sobre cualquier experimentación tecnológica.',
    },
    {
        id: 'consultas-ia',
        number: '06',
        title: 'Canal de Consultas sobre el Uso de Inteligencia Artificial',
        paragraphs: [
            'Toda usuaria o clienta tiene derecho a solicitar aclaraciones sobre si un recurso visual específico o una recomendación técnica de la plataforma ha contado con asistencia de Inteligencia Artificial. Puede dirigir sus inquietudes en cualquier momento a través de nuestra sección de Contacto (/contacto).',
        ],
    },
];

export default function IaTransparenciaScreen() {
    return (
        <LegalDocumentLayout
            activeKey="ia-transparencia"
            overline="GOBERNANZA ÉTICA Y TECNOLÓGICA · ALTA COSTURA DIGITAL"
            title="Política de Transparencia en Inteligencia Artificial"
            subtitle="Declaración abierta sobre cómo combinamos la dirección artística y artesanal de Katherine Carroll con herramientas algorítmicas y de Inteligencia Artificial, protegiendo siempre su privacidad."
            version={LEGAL_DOCUMENT_VERSIONS.AI_TRANSPARENCY}
            normativeReference="Ética IA · Ley 1581/2012 · Derechos de Autor"
            heroImage={require('../assets/editorial/legal_ai_craftsmanship.jpg')}
            heroImageCaption="Imagen editorial ilustrativa generada con asistencia de IA · Dirección creativa Atelier By Katherine Carroll"
            sections={AI_TRANSPARENCY_SECTIONS}
        />
    );
}

