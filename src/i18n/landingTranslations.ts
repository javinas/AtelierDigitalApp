// ==============================================================================
// DICCIONARIO DE INTERNACIONALIZACIÓN DE LA LANDING PÁGINA PÚBLICA
// Atelier Digital · By Katherine Carroll (Barranquilla, Colombia)
// Soporte bilingüe estricto: Español (ES, predeterminado) e Inglés (EN)
// ==============================================================================

export type SupportedLandingLanguage = 'es' | 'en';

export interface LandingTranslations {
    seo: {
        title: string;
        description: string;
        lang: string;
    };
    nav: {
        brandSubtitle: string;
        design: string;
        creation: string;
        exclusivity: string;
        services: string;
        contact: string;
    };
    hero: {
        headline: string;
        description: string;
        specialty1: string;
        specialty2: string;
        specialty3: string;
        locationBar: string;
    };
    accessCard: {
        welcomeTitle: string;
        welcomeSubtitle: string;
        connecting: string;
        sessionActive: string;
        designerRole: string;
        clientRole: string;
        continueDesigner: string;
        continueClient: string;
        logout: string;
        login: string;
        register: string;
        ageNotice: string;
        termsLink: string;
        privacyLink: string;
        aiTransparencyLink: string;
    };
    editorialIntro: {
        overline: string;
        headline: string;
        leadText: string;
    };
    pillars: {
        pillar1Title: string;
        pillar1Text: string;
        pillar1Link: string;
        pillar2Title: string;
        pillar2Text: string;
        pillar2Link: string;
        pillar3Title: string;
        pillar3Text: string;
        pillar3Link: string;
    };
    featuredServices: {
        overline: string;
        title: string;
        subtitle: string;
        service1Title: string;
        service1Subtitle: string;
        service1Desc: string;
        service2Title: string;
        service2Subtitle: string;
        service2Desc: string;
        service3Title: string;
        service3Subtitle: string;
        service3Desc: string;
        service4Title: string;
        service4Subtitle: string;
        service4Desc: string;
        ctaCard: string;
        viewAllBtn: string;
    };
    trustGovernance: {
        overline: string;
        sectionTitle: string;
        sectionSubtitle: string;
        aiPhotoCaption: string;
        card1Eyebrow: string;
        card1Title: string;
        card1Text: string;
        card1PrivacyLink: string;
        card1NoticeLink: string;
        card2Eyebrow: string;
        card2Title: string;
        card2Text: string;
        card2AiPolicyLink: string;
        card2TermsLink: string;
    };
    contactBanner: {
        title: string;
        description: string;
        cta: string;
    };
    footer: {
        motto: string;
        brandDesc: string;
        col1Title: string;
        home: string;
        design: string;
        creation: string;
        exclusivity: string;
        services: string;
        contact: string;
        col2Title: string;
        line1: string;
        line2: string;
        line3: string;
        line4: string;
        line5: string;
        line6: string;
        col3Title: string;
        terms: string;
        privacyPolicy: string;
        privacyNotice: string;
        cookiePolicy: string;
        aiTransparency: string;
        col4Title: string;
        login: string;
        register: string;
        quoteArco: string;
        socialTitle: string;
        copyright: string;
        location: string;
    };
}

export const LANDING_TRANSLATIONS: Record<SupportedLandingLanguage, LandingTranslations> = {
    es: {
        seo: {
            title: 'By Katherine Carroll · Atelier Digital de Alta Costura',
            description: 'Atelier de alta costura, diseño a medida y confección textil en Barranquilla, Colombia. Moda de autor y soluciones textiles con excelencia artesanal.',
            lang: 'es',
        },
        nav: {
            brandSubtitle: 'ATELIER DIGITAL',
            design: 'Diseño',
            creation: 'Creación',
            exclusivity: 'Exclusividad',
            services: 'Servicios',
            contact: 'Contacto',
        },
        hero: {
            headline: 'La creatividad\ndetrás de cada creación.',
            description: 'Un espacio digital para diseñar, crear y acompañar cada prenda con la esencia y el sello de By Katherine Carroll.',
            specialty1: 'Alta Costura y\nVestidos de Ocasión',
            specialty2: 'Diseño Exclusivo\nMujer y Niña',
            specialty3: 'Detalles de Autor &\nTextiles Finos',
            locationBar: 'BARRANQUILLA  ·  COLOMBIA      |      @CARROLLKATHERINE',
        },
        accessCard: {
            welcomeTitle: 'Bienvenida a\nnuestro Atelier Digital',
            welcomeSubtitle: 'Un espacio exclusivo donde la moda, el diseño y la creatividad se encuentran para hacer realidad tus ideas.',
            connecting: 'Conectando con el atelier...',
            sessionActive: 'SESIÓN ACTIVA',
            designerRole: 'DISEÑADORA',
            clientRole: 'CLIENTA',
            continueDesigner: 'CONTINUAR AL ATELIER',
            continueClient: 'IR A MI ESPACIO DE CLIENTA',
            logout: 'Cerrar sesión activa',
            login: 'INICIAR SESIÓN',
            register: 'CREAR CUENTA',
            ageNotice: 'Acceso +18 años · ',
            termsLink: 'Términos',
            privacyLink: 'Privacidad',
            aiTransparencyLink: 'Transparencia IA',
        },
        editorialIntro: {
            overline: 'ATELIER DE AUTOR · BARRANQUILLA, COLOMBIA',
            headline: 'Moda, confección y soluciones textiles a medida',
            leadText: 'En By Katherine Carroll, el diseño no se limita a vestidos de gala: abarca un universo creativo que acompaña momentos de vida, celebraciones familiares, la magia del Carnaval, la identidad corporativa de empresas y la calidez del hogar.',
        },
        pillars: {
            pillar1Title: 'Diseño',
            pillar1Text: 'Creatividad, asesoría personalizada y propuestas adaptadas a cada silueta y necesidad particular, dando forma a piezas llenas de identidad.',
            pillar1Link: 'Descubrir Diseño →',
            pillar2Title: 'Creación',
            pillar2Text: 'Confección y elaboración minuciosa de prendas, accesorios y productos textiles con técnicas artesanales y estrictos controles de calidad.',
            pillar2Link: 'Descubrir Creación →',
            pillar3Title: 'Exclusividad',
            pillar3Text: 'Atención al detalle, selección rigurosa de materiales y propuestas para distintas ocasiones con un proceso creativo guiado de principio a fin.',
            pillar3Link: 'Descubrir Exclusividad →',
        },
        featuredServices: {
            overline: 'PROPUESTAS DESTACADAS',
            title: 'Conoce nuestras líneas de trabajo',
            subtitle: 'Desde piezas de alta costura y tradición cultural hasta confección empresarial y textiles para el hogar.',
            service1Title: 'Alta Costura y Vestidos para Toda Ocasión',
            service1Subtitle: 'Mujer y Niña',
            service1Desc: 'Diseños y confección a medida para mujer y niña, orientados a ocasiones especiales, galas y celebraciones familiares.',
            service2Title: 'Carnaval: Tocados, Apliques, Zapatos y Camisetas',
            service2Subtitle: 'Tradición y Brillo Cultural de Barranquilla',
            service2Desc: 'Tocados elaborados, apliques bordados, calzado decorado y camisetas personalizadas con el espíritu festivo del Carnaval.',
            service3Title: 'Uniformes para Empresas y Negocios',
            service3Subtitle: 'Imagen Corporativa y Elegancia Profesional',
            service3Desc: 'Diseño y confección de uniformes ejecutivos, comerciales y administrativos que proyectan la identidad y distinción de cada negocio.',
            service4Title: 'Textiles para el Hogar',
            service4Subtitle: 'Ropa de Cama, Toallas y Salidas de Baño',
            service4Desc: 'Lencería fina para el hogar, juegos de sábanas bordadas, toallas de alta absorción y salidas de baño personalizadas.',
            ctaCard: 'CONSULTAR ESTE SERVICIO',
            viewAllBtn: 'EXPLORAR TODOS LOS SERVICIOS (8 LÍNEAS)',
        },
        trustGovernance: {
            overline: 'ÉTICA DE ATELIER · LEY 1581 DE 2012 & TRANSPARENCIA TECNOLÓGICA',
            sectionTitle: 'Confidencialidad artesanal e innovación responsable',
            sectionSubtitle: 'Cada prenda nace de una relación de confianza. Protegemos rigurosamente sus datos personales y medidas antropométricas, integrando tecnología bajo la supervisión artística directa de Katherine Carroll.',
            aiPhotoCaption: '✦ Fotografía editorial ilustrativa asistida con IA · Atelier By Katherine Carroll',
            card1Eyebrow: 'PROTECCIÓN DE DATOS PERSONALES · COLOMBIA',
            card1Title: 'Custodia Reservada de su Expediente y Medidas',
            card1Text: 'Las fichas antropométricas, fotografías técnicas de fitting y datos de contacto se resguardan bajo control de acceso por roles y políticas Row Level Security (RLS). El registro de cuentas es exclusivo para mayores de 18 años, garantizando en todo momento sus derechos de conocer, actualizar, rectificar y suprimir su información.',
            card1PrivacyLink: 'Política de Privacidad →',
            card1NoticeLink: 'Aviso de Privacidad →',
            card2Eyebrow: 'DIRECCIÓN HUMANA & GOBERNANZA IA',
            card2Title: 'El Oficio de Alta Costura Apoyado por Tecnología',
            card2Text: 'Declaramos con total transparencia el uso de recursos visuales ilustrativos asistidos por IA y de nuestro copiloto local de validación geométrica. Ninguna decisión creativa o de calce es automatizada, ni compartimos fotografías o medidas de clientas para entrenar modelos externos.',
            card2AiPolicyLink: 'Política de Transparencia IA →',
            card2TermsLink: 'Términos y Condiciones →',
        },
        contactBanner: {
            title: '¿Planeas un evento o requieres confección a medida?',
            description: 'Conversa directamente con el atelier para estructurar tu idea, conocer opciones de telas y recibir una asesoría personalizada.',
            cta: 'CONTACTAR AL ATELIER',
        },
        footer: {
            motto: '«La creatividad detrás de cada creación»',
            brandDesc: 'Atelier de alta costura, diseño a medida y confección textil en Barranquilla, Colombia. Propuestas concebidas con atención al detalle, telas seleccionadas y dedicación artesanal.',
            col1Title: 'EXPLORAR',
            home: 'Inicio',
            design: 'Diseño',
            creation: 'Creación',
            exclusivity: 'Exclusividad',
            services: 'Servicios',
            contact: 'Contacto',
            col2Title: 'LÍNEAS',
            line1: 'Alta Costura & Gala',
            line2: 'Primera Comunión & Pajecitos',
            line3: 'Disfraces & Comparsas',
            line4: 'Carnaval de Barranquilla',
            line5: 'Uniformes & Dotaciones',
            line6: 'Textiles para el Hogar',
            col3Title: 'LEGAL & TRANSPARENCIA',
            terms: 'Términos y Condiciones',
            privacyPolicy: 'Política de Privacidad',
            privacyNotice: 'Aviso de Privacidad',
            cookiePolicy: 'Política de Cookies',
            aiTransparency: 'Transparencia en IA',
            col4Title: 'ATELIER DIGITAL',
            login: 'Iniciar Sesión',
            register: 'Registro de Clientas (+18)',
            quoteArco: 'Solicitar Cotización / ARCO',
            socialTitle: 'REDES OFICIALES',
            copyright: '© 2026 By Katherine Carroll · Atelier de Autor. Todos los derechos reservados.',
            location: 'BARRANQUILLA · COLOMBIA',
        },
    },
    en: {
        seo: {
            title: 'By Katherine Carroll · Digital Haute Couture Atelier',
            description: 'Bespoke fashion atelier, custom tailoring, and fine textile craft in Barranquilla, Colombia. Designer garments crafted with artisanal excellence.',
            lang: 'en',
        },
        nav: {
            brandSubtitle: 'DIGITAL ATELIER',
            design: 'Design',
            creation: 'Creation',
            exclusivity: 'Exclusivity',
            services: 'Services',
            contact: 'Contact',
        },
        hero: {
            headline: 'The creativity\nbehind each creation.',
            description: 'A curated digital space to design, craft, and celebrate every garment with the essence and signature of By Katherine Carroll.',
            specialty1: 'Haute Couture &\nOccasion Gowns',
            specialty2: 'Bespoke Design for\nWomen & Girls',
            specialty3: 'Signature Craft &\nFine Textiles',
            locationBar: 'BARRANQUILLA  ·  COLOMBIA      |      @CARROLLKATHERINE',
        },
        accessCard: {
            welcomeTitle: 'Welcome to our\nDigital Atelier',
            welcomeSubtitle: 'An exclusive sanctuary where couture, design, and bespoke craftsmanship unite to bring your vision to life.',
            connecting: 'Connecting to atelier...',
            sessionActive: 'ACTIVE SESSION',
            designerRole: 'DESIGNER',
            clientRole: 'CLIENT',
            continueDesigner: 'CONTINUE TO ATELIER',
            continueClient: 'GO TO MY CLIENT SUITE',
            logout: 'Sign out active session',
            login: 'SIGN IN',
            register: 'CREATE ACCOUNT',
            ageNotice: 'Ages 18+ only · ',
            termsLink: 'Terms',
            privacyLink: 'Privacy',
            aiTransparencyLink: 'AI Transparency',
        },
        editorialIntro: {
            overline: 'SIGNATURE ATELIER · BARRANQUILLA, COLOMBIA',
            headline: 'Couture, tailoring, and bespoke textile solutions',
            leadText: 'At By Katherine Carroll, design extends far beyond formal evening gowns: it embraces a vibrant creative world accompanying personal milestones, family celebrations, the splendor of Carnival, corporate identity, and refined home living.',
        },
        pillars: {
            pillar1Title: 'Design',
            pillar1Text: 'Pure creativity, personal silhouette consultations, and bespoke propositions tailored to each client, giving life to pieces rich with identity.',
            pillar1Link: 'Discover Design →',
            pillar2Title: 'Creation',
            pillar2Text: 'Meticulous dressmaking and artisanal garment construction with couture handwork, premium textiles, and uncompromising quality standards.',
            pillar2Link: 'Discover Creation →',
            pillar3Title: 'Exclusivity',
            pillar3Text: 'Unwavering attention to detail, rigorous material curation, and guided couture journeys from initial sketch to final fitting.',
            pillar3Link: 'Discover Exclusivity →',
        },
        featuredServices: {
            overline: 'FEATURED COUTURE COLLECTIONS',
            title: 'Explore our lines of craft',
            subtitle: 'From haute couture gowns and cultural heritage to corporate executive apparel and bespoke home textiles.',
            service1Title: 'Haute Couture & Bespoke Evening Gowns',
            service1Subtitle: 'Women & Girls',
            service1Desc: 'Custom-tailored gowns for women and girls, crafted for galas, red carpet events, weddings, and memorable milestones.',
            service2Title: 'Carnival: Headpieces, Appliqués, Footwear & Tops',
            service2Subtitle: 'Barranquilla Cultural Heritage & Festive Glamour',
            service2Desc: 'Elaborate feather crowns, sequined appliqués, embellished shoes, and festive couture infused with authentic Carnival spirit.',
            service3Title: 'Corporate Uniforms & Executive Apparel',
            service3Subtitle: 'Distinguished Business Identity & Elegance',
            service3Desc: 'Tailored executive and commercial uniforms projecting prestige, comfort, and cohesive corporate sophistication.',
            service4Title: 'Bespoke Home Textiles',
            service4Subtitle: 'Fine Bed Linens, Towels & Bath Wraps',
            service4Desc: 'High-thread-count embroidered bedding, luxury absorbent bath linen, and monogrammed loungewear for refined living.',
            ctaCard: 'INQUIRE ABOUT THIS SERVICE',
            viewAllBtn: 'EXPLORE ALL BESPOKE SERVICES (8 LINES)',
        },
        trustGovernance: {
            overline: 'ATELIER ETHICS · COLOMBIAN LAW 1581 & AI GOVERNANCE',
            sectionTitle: 'Artisanal confidentiality and responsible innovation',
            sectionSubtitle: 'Every bespoke garment begins with mutual trust. We rigorously safeguard your personal and anthropometric measurement data, integrating modern tools under Katherine Carroll’s direct artistic supervision.',
            aiPhotoCaption: '✦ Illustrative editorial photography assisted by AI · Atelier By Katherine Carroll',
            card1Eyebrow: 'PERSONAL DATA PROTECTION · COLOMBIA',
            card1Title: 'Confidential Custody of Records & Measurements',
            card1Text: 'Anthropometric files, technical fitting photos, and contact profiles are strictly guarded under Role-Based Access Control and Row Level Security (RLS). Registration is strictly 18+, guaranteeing your full statutory rights to access, update, rectify, and delete personal data at any time.',
            card1PrivacyLink: 'Privacy Policy →',
            card1NoticeLink: 'Privacy Notice →',
            card2Eyebrow: 'HUMAN MASTERY & AI ETHICS',
            card2Title: 'Haute Couture Craft Empowered by Technology',
            card2Text: 'We maintain total transparency in utilizing AI-assisted mood visuals and localized geometric validation copilots. No aesthetic, cut, or fit decisions are automated, nor are client measurements or likenesses ever shared to train external AI models.',
            card2AiPolicyLink: 'AI Transparency Policy →',
            card2TermsLink: 'Terms of Service →',
        },
        contactBanner: {
            title: 'Planning an event or seeking bespoke couture?',
            description: 'Connect directly with the atelier to discuss your vision, review fabric options, and schedule a private consultation.',
            cta: 'CONTACT THE ATELIER',
        },
        footer: {
            motto: '«The creativity behind each creation»',
            brandDesc: 'Haute couture atelier, bespoke tailoring, and fine textile craft in Barranquilla, Colombia. Pieces created with precision, handpicked fabrics, and artisanal devotion.',
            col1Title: 'EXPLORE',
            home: 'Home',
            design: 'Design',
            creation: 'Creation',
            exclusivity: 'Exclusivity',
            services: 'Services',
            contact: 'Contact',
            col2Title: 'COLLECTIONS',
            line1: 'Haute Couture & Evening',
            line2: 'First Communion & Pageantry',
            line3: 'Costumes & Troupes',
            line4: 'Barranquilla Carnival',
            line5: 'Corporate Uniforms',
            line6: 'Bespoke Home Textiles',
            col3Title: 'LEGAL & ETHICS',
            terms: 'Terms and Conditions',
            privacyPolicy: 'Privacy Policy',
            privacyNotice: 'Privacy Notice',
            cookiePolicy: 'Cookie Policy',
            aiTransparency: 'AI Transparency',
            col4Title: 'DIGITAL ATELIER',
            login: 'Sign In',
            register: 'Client Registration (18+)',
            quoteArco: 'Request Quote / ARCO Rights',
            socialTitle: 'OFFICIAL CHANNELS',
            copyright: '© 2026 By Katherine Carroll · Signature Atelier. All rights reserved.',
            location: 'BARRANQUILLA · COLOMBIA',
        },
    },
};

