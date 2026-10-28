export interface ServiceItem {
    id: string;
    title: string;
    subtitle?: string;
    shortDescription: string;
    designDescription: string;
    creationDescription: string;
    image: any;
    categoryGroup: 'diseno' | 'creacion' | 'ambos';
}

export const SERVICES: ServiceItem[] = [
    {
        id: 'alta-costura',
        title: 'Alta Costura y Vestidos para Toda Ocasión',
        subtitle: 'Mujer y Niña',
        shortDescription: 'Diseños y confección a medida para mujer y niña, orientados a ocasiones especiales, galas y celebraciones familiares.',
        designDescription: 'Diseño personalizado de vestidos de gala, fiesta y ocasiones especiales para mujer y niña, adaptados a la silueta, estilo y preferencia de cada clienta.',
        creationDescription: 'Confección artesanal y patronaje de alta precisión con telas finas, sedas, encajes y acabados minuciosos para ocasiones inolvidables.',
        image: require('../../assets/service_couture.jpg'),
        categoryGroup: 'ambos',
    },
    {
        id: 'primera-comunion',
        title: 'Primera Comunión y Pajecitos',
        subtitle: 'Ceremonias y Celebraciones Familiares',
        shortDescription: 'Prendas para ceremonias religiosas y cortejos nupciales, elaboradas con pureza, delicadeza y atención a cada detalle.',
        designDescription: 'Propuestas de diseño para vestidos de Primera Comunión y trajes de pajecitos, combinando tradición, elegancia y confort para los más pequeños.',
        creationDescription: 'Elaboración con telas de alta calidad como organza, lino, encajes y brocados, cuidando terminaciones y apliques sutiles.',
        image: require('../../assets/service_comunion.jpg'),
        categoryGroup: 'ambos',
    },
    {
        id: 'disfraces',
        title: 'Disfraces para Colegios, Comparsas y Particulares',
        subtitle: 'Expresión Artística y Teatral',
        shortDescription: 'Propuestas de vestuario temático y de fantasía para colegios, grupos de danza, comparsas y clientes particulares.',
        designDescription: 'Conceptualización y diseño visual de indumentarias de fantasía, personajes y temáticas teatrales con creatividad sin límites.',
        creationDescription: 'Confección estructurada, resistente y llamativa, con combinación de texturas, pedrería, plumas y acabados escénicos.',
        image: require('../../assets/service_disfraces.jpg'),
        categoryGroup: 'ambos',
    },
    {
        id: 'carnaval',
        title: 'Carnaval: Tocados, Apliques, Zapatos y Camisetas',
        subtitle: 'Tradición y Brillo Cultural de Barranquilla',
        shortDescription: 'Tocados elaborados, apliques bordados, calzado decorado y camisetas personalizadas con el espíritu festivo del Carnaval.',
        designDescription: 'Diseño editorial festivo y rescate de la tradición barranquillera en piezas únicas de gala carnavalesca y comparsas.',
        creationDescription: 'Elaboración manual de tocados de gran impacto, apliques en lentejuelas, pedrería, bordados artesanales y camisetas alegóricas.',
        image: require('../../assets/service_carnaval.jpg'),
        categoryGroup: 'ambos',
    },
    {
        id: 'uniformes',
        title: 'Uniformes para Empresas y Negocios',
        subtitle: 'Imagen Corporativa y Elegancia Profesional',
        shortDescription: 'Diseño y confección de uniformes ejecutivos, comerciales y administrativos que proyectan la identidad y distinción de cada negocio.',
        designDescription: 'Propuestas de corte corporativo elegante, seleccionando paletas cromáticas y estilos que reflejen solidez y buen gusto.',
        creationDescription: 'Confección en sastrería de alta durabilidad, tejidos transpirables y confortables con bordados institucionales de precisión.',
        image: require('../../assets/service_uniformes.jpg'),
        categoryGroup: 'creacion',
    },
    {
        id: 'dotaciones',
        title: 'Dotaciones de Trabajo y Seguridad',
        subtitle: 'Funcionalidad, Protección y Resistencia',
        shortDescription: 'Soluciones textiles para dotaciones laborales, prendas técnicas de seguridad industrial y trabajo operativo.',
        designDescription: 'Estructuración técnica adaptada a los requerimientos de seguridad, movimiento y durabilidad del sector productivo.',
        creationDescription: 'Fabricación bajo estándares de resistencia, costuras reforzadas, cintas reflectivas y telas certificadas para alta exigencia.',
        image: require('../../assets/service_dotaciones.jpg'),
        categoryGroup: 'creacion',
    },
    {
        id: 'hogar',
        title: 'Textiles para el Hogar',
        subtitle: 'Ropa de Cama, Toallas y Salidas de Baño',
        shortDescription: 'Lencería fina para el hogar, juegos de sábanas bordadas, toallas de alta absorción y salidas de baño personalizadas.',
        designDescription: 'Diseño de piezas textiles con monogramas, vivos contrastantes y proporciones a medida para crear espacios acogedores y refinados.',
        creationDescription: 'Confección cuidadosa en algodones de alta densidad, linos y tejidos absorbentes, con remates y bordados de alta costura.',
        image: require('../../assets/service_hogar.jpg'),
        categoryGroup: 'creacion',
    },
    {
        id: 'accesorios',
        title: 'Accesorios y Bolsos',
        subtitle: 'Complementos de Autor',
        shortDescription: 'Bolsos de noche, clutches de fiesta, cinturones y complementos textiles que acompañan distintos estilos y ocasiones.',
        designDescription: 'Diseño de complementos exclusivos que dialogan armónicamente con las prendas principales o destacan como pieza central.',
        creationDescription: 'Elaboración minuciosa con brocados, pedrería fina, estructuras artesanales y forros interiores de seda.',
        image: require('../../assets/service_accesorios.jpg'),
        categoryGroup: 'ambos',
    },
];
