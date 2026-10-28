
export type UserRole = 'admin' | 'designer' | 'client';

export interface Profile {
    id: string;
    full_name: string;
    role: UserRole;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface AuthState {
    user: import('@supabase/supabase-js').User | null;
    session: import('@supabase/supabase-js').Session | null;
    profile: Profile | null;
    role: UserRole | null;
    loading: boolean;
}
