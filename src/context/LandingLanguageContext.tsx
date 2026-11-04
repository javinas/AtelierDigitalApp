// ==============================================================================
// CONTEXTO DE IDIOMA PARA LA LANDING PÁGINA PÚBLICA (ES / EN)
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    LANDING_TRANSLATIONS,
    LandingTranslations,
    SupportedLandingLanguage,
} from '../i18n/landingTranslations';

const STORAGE_KEY = '@atelier_landing_language';

interface LandingLanguageContextValue {
    language: SupportedLandingLanguage;
    setLanguage: (lang: SupportedLandingLanguage) => void;
    toggleLanguage: () => void;
    t: LandingTranslations;
    isEnglish: boolean;
}

const LandingLanguageContext = createContext<LandingLanguageContextValue | undefined>(undefined);

export function LandingLanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<SupportedLandingLanguage>('es');

    // Carga inicial no bloqueante desde AsyncStorage o localStorage en web
    useEffect(() => {
        let isMounted = true;

        const loadStoredLanguage = async () => {
            try {
                // En Web se revisa primero localStorage para sincronía instantánea
                if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
                    const localVal = window.localStorage.getItem(STORAGE_KEY);
                    if (localVal === 'es' || localVal === 'en') {
                        if (isMounted) setLanguageState(localVal);
                        return;
                    }
                }

                // Fallback / Entorno móvil nativo
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (isMounted && (stored === 'es' || stored === 'en')) {
                    setLanguageState(stored);
                }
            } catch (err) {
                // Silencioso: en caso de fallo, se conserva 'es' como idioma por defecto
                console.warn('[LandingLanguageContext] Error leyendo preferencia de idioma:', err);
            }
        };

        loadStoredLanguage();

        return () => {
            isMounted = false;
        };
    }, []);

    // Sincronización de SEO web y persistencia al cambiar de idioma
    const setLanguage = (newLang: SupportedLandingLanguage) => {
        setLanguageState(newLang);

        // Persistir en background
        try {
            if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(STORAGE_KEY, newLang);
            }
            AsyncStorage.setItem(STORAGE_KEY, newLang).catch(() => {});
        } catch {
            // Ignorar fallos de cuota o cookies restringidas
        }

        // Actualizar metadatos del documento HTML en Web
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            try {
                document.documentElement.lang = newLang;
                const trans = LANDING_TRANSLATIONS[newLang];
                document.title = trans.seo.title;

                const metaDesc = document.querySelector('meta[name="description"]');
                if (metaDesc) {
                    metaDesc.setAttribute('content', trans.seo.description);
                }
            } catch {
                // Entornos no navegables
            }
        }
    };

    const toggleLanguage = () => {
        setLanguage(language === 'es' ? 'en' : 'es');
    };

    const t = useMemo(() => LANDING_TRANSLATIONS[language], [language]);

    const value = useMemo(
        () => ({
            language,
            setLanguage,
            toggleLanguage,
            t,
            isEnglish: language === 'en',
        }),
        [language, t]
    );

    return (
        <LandingLanguageContext.Provider value={value}>
            {children}
        </LandingLanguageContext.Provider>
    );
}

export function useLandingLanguage(): LandingLanguageContextValue {
    const context = useContext(LandingLanguageContext);
    if (!context) {
        // En caso de renderizarse fuera del provider, retornar fallback seguro en español
        return {
            language: 'es',
            setLanguage: () => {},
            toggleLanguage: () => {},
            t: LANDING_TRANSLATIONS.es,
            isEnglish: false,
        };
    }
    return context;
}

