import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { Profile, UserRole } from '../types/auth';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    role: UserRole | null;
    loading: boolean;
    profileError: string | null;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signUp: (
        email: string,
        password: string,
        fullName: string,
    ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
    signOut: () => Promise<{ error: string | null }>;
    resetPassword: (email: string) => Promise<{ error: string | null }>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function translateAuthError(errorMsg: string): string {
    const msg = errorMsg.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        return 'El correo o la contraseña son incorrectos. Por favor verifica tus datos.';
    }
    if (msg.includes('user already registered') || msg.includes('already exists')) {
        return 'Ya existe una cuenta registrada con este correo electrónico.';
    }
    if (msg.includes('email not confirmed')) {
        return 'Tu correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada o spam.';
    }
    if (msg.includes('password should be at least')) {
        return 'La contraseña debe tener como mínimo 6 caracteres.';
    }
    if (msg.includes('same password') || msg.includes('should be different')) {
        return 'La nueva contraseña debe ser diferente a la contraseña anterior.';
    }
    if (msg.includes('valid email') || msg.includes('invalid email')) {
        return 'Por favor ingresa una dirección de correo electrónico válida.';
    }
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
        return 'Demasiados intentos seguidos. Por favor espera unos minutos antes de reintentar.';
    }
    return errorMsg;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchProfile = async (
        userId: string,
    ): Promise<{ profile: Profile | null; error: string | null }> => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.warn('[Atelier Auth] No se pudo cargar el perfil:', error.message);
                return { profile: null, error: error.message };
            }

            return { profile: data as Profile, error: null };
        } catch (err: any) {
            console.error('[Atelier Auth] Error inesperado consultando perfil:', err);
            return {
                profile: null,
                error: err?.message || 'Error inesperado consultando perfil.',
            };
        }
    };

    const ALLOWED_ROLES: UserRole[] = ['admin', 'designer', 'client'];

    const sanitizeRole = (roleValue: unknown): UserRole | null => {
        if (typeof roleValue === 'string' && ALLOWED_ROLES.includes(roleValue as UserRole)) {
            return roleValue as UserRole;
        }
        return null;
    };

    const updateAuthState = async (currentSession: Session | null) => {
        try {
            setSession(currentSession);
            const currentUser = currentSession?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                const { profile: prof, error: pError } = await fetchProfile(currentUser.id);
                setProfile(prof);
                setProfileError(pError);
                setRole(sanitizeRole(prof?.role));
            } else {
                setProfile(null);
                setProfileError(null);
                setRole(null);
            }
        } catch (err) {
            console.error('[Atelier Auth] Error en updateAuthState:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Cargar sesión inicial persistida
        supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
            updateAuthState(initialSession);
        }).catch((err) => {
            console.error('[Atelier Auth] Error obteniendo sesión inicial:', err);
            setLoading(false);
        });

        // Suscribirse a cambios de estado de autenticación (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, newSession) => {
                await updateAuthState(newSession);
            },
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const refreshProfile = async () => {
        if (user) {
            const { profile: prof, error: pError } = await fetchProfile(user.id);
            setProfile(prof);
            setProfileError(pError);
            setRole(sanitizeRole(prof?.role));
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) {
                return { error: translateAuthError(error.message) };
            }

            if (data?.user) {
                const { profile: prof, error: pError } = await fetchProfile(data.user.id);
                if (pError) {
                    console.error('[Atelier Auth] Error cargando perfil tras login:', pError);
                    return {
                        error: `Sesión iniciada, pero ocurrió un problema cargando su perfil: ${pError}`,
                    };
                }
                if (!prof) {
                    console.warn('[Atelier Auth] Perfil no encontrado tras login para usuario:', data.user.id);
                    return {
                        error: 'Su cuenta no tiene un perfil registrado en la base de datos de Atelier Digital.',
                    };
                }
                if (!sanitizeRole(prof.role)) {
                    console.warn('[Atelier Auth] Perfil sin rol válido:', prof.role);
                    return {
                        error: `Su cuenta no tiene asignado un rol autorizado ('${prof.role ?? 'ninguno'}').`,
                    };
                }
            }

            return { error: null };
        } catch (err: any) {
            console.error('[Atelier Auth] Error inesperado en signIn:', err);
            return {
                error:
                    err?.message ||
                    'Ocurrió un problema de conexión al iniciar sesión. Inténtalo nuevamente.',
            };
        }
    };

    const signUp = async (
        email: string,
        password: string,
        fullName: string,
    ) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        full_name: fullName.trim(),
                    },
                },
            });

            if (error) {
                return {
                    error: translateAuthError(error.message),
                    needsEmailConfirmation: false,
                };
            }

            // Si Supabase tiene confirmación de correo activa y no devolvió sesión
            const needsEmailConfirmation = !data.session;

            return {
                error: null,
                needsEmailConfirmation,
            };
        } catch (err: any) {
            return {
                error: 'Ocurrió un problema de conexión durante el registro.',
                needsEmailConfirmation: false,
            };
        }
    };

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                return { error: translateAuthError(error.message) };
            }
            return { error: null };
        } catch (err: any) {
            return {
                error: 'Ocurrió un problema al cerrar sesión.',
            };
        }
    };

    const resetPassword = async (email: string) => {
        try {
            const redirectUrl =
                typeof window !== 'undefined'
                    ? `${window.location.origin}/reset-password`
                    : undefined;

            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: redirectUrl,
            });

            if (error) {
                return { error: translateAuthError(error.message) };
            }

            return { error: null };
        } catch (err: any) {
            return {
                error: 'Ocurrió un problema al solicitar el restablecimiento de contraseña.',
            };
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                profile,
                profileError,
                role,
                loading,
                signIn,
                signUp,
                signOut,
                resetPassword,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
    }
    return context;
}
