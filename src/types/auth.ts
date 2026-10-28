export type UserRole = 'admin' | 'designer' | 'client';

export type ConsentType =
    | 'TERMS_OF_SERVICE'
    | 'PRIVACY_POLICY'
    | 'AGE_CONFIRMATION'
    | 'MARKETING_OPT_IN';

export interface RegistrationConsents {
    ageConfirmed: boolean;
    termsAccepted: boolean;
    privacyAccepted: boolean;
    marketingOptIn: boolean;
    termsVersion?: string;
    privacyVersion?: string;
    userAgent?: string;
}

export interface UserLegalConsentRecord {
    id: string;
    user_id: string;
    consent_type: ConsentType;
    document_version: string;
    status: 'granted' | 'revoked';
    ip_address: string | null;
    user_agent: string | null;
    accepted_at: string;
    revoked_at: string | null;
}

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
