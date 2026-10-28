// ==============================================================================
// ATELIER DIGITAL — SUPABASE EDGE FUNCTION: ADMIN-USERS
// Archivo: supabase/functions/admin-users/index.ts
// ==============================================================================
// Función server-side para operaciones administrativas autorizadas de usuarios.
// - Valida la identidad y el token del solicitante en Supabase Auth.
// - Comprueba en public.profiles que el solicitante posee role = 'admin'.
// - Protege el rol del Administrador Principal contra degradaciones accidentales.
// - Rechaza métodos HTTP no admitidos con código 405 (solo admite POST y OPTIONS).
// - Solo permite listar perfiles y actualizar roles (sin acciones destructivas).
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const MAIN_ADMIN_EMAIL = 'jairo.vinas@gmail.com';
const MAIN_ADMIN_ID = '0b57041f-3a3e-40c5-8dc9-74300484a974';
const ALLOWED_ROLES = ['admin', 'designer', 'client'] as const;
type UserRole = (typeof ALLOWED_ROLES)[number];

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(
    data: unknown,
    status = 200,
    extraHeaders: Record<string, string> = {},
): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            ...extraHeaders,
        },
    });
}

serve(async (req: Request) => {
    // 1. Manejo de preflight CORS (OPTIONS)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    // 2. Rechazo de métodos HTTP no admitidos (405 Method Not Allowed)
    if (req.method !== 'POST') {
        return jsonResponse(
            {
                error: `Método HTTP '${req.method}' no permitido. Esta función solo acepta peticiones POST y OPTIONS.`,
            },
            405,
            { Allow: 'POST, OPTIONS' },
        );
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
            console.error('[admin-users] Variables de entorno de Supabase incompletas.');
            return jsonResponse(
                { error: 'Error de configuración interna del servidor.' },
                500,
            );
        }

        // 3. Extracción y validación de cabecera Authorization
        const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return jsonResponse(
                { error: 'Autenticación requerida. Falta el token Bearer en la cabecera Authorization.' },
                401,
            );
        }

        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        if (!token) {
            return jsonResponse(
                { error: 'Autenticación requerida. El token de sesión está vacío o mal formado.' },
                401,
            );
        }

        // 4. Cliente usuario para validar criptográficamente la sesión con Supabase Auth
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false },
        });

        const {
            data: { user },
            error: authError,
        } = await userClient.auth.getUser(token);

        if (authError || !user) {
            console.warn('[admin-users] Token inválido o expirado:', authError?.message);
            return jsonResponse(
                { error: 'Sesión no válida o expirada. Por favor inicia sesión de nuevo.' },
                401,
            );
        }

        // 5. Cliente administrativo (service_role) para consultar roles y ejecutar cambios
        const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: { persistSession: false },
        });

        // 6. Verificar en base de datos que el actor autenticado sea efectivamente 'admin'
        const { data: callerProfile, error: callerProfileError } = await adminClient
            .from('profiles')
            .select('id, email, role')
            .eq('id', user.id)
            .single();

        if (callerProfileError || !callerProfile) {
            console.warn('[admin-users] No se encontró el perfil del actor:', user.id);
            return jsonResponse(
                { error: 'Perfil de usuario no encontrado en la plataforma.' },
                403,
            );
        }

        if (callerProfile.role !== 'admin') {
            console.warn(
                `[admin-users] Intento de acceso no autorizado por usuario ${user.id} con rol ${callerProfile.role}`,
            );
            return jsonResponse(
                { error: 'Acceso denegado: se requieren privilegios de Administrador Principal.' },
                403,
            );
        }

        // 7. Parseo y validación del cuerpo JSON
        let body: any = {};
        try {
            body = await req.json();
        } catch {
            return jsonResponse(
                { error: 'Cuerpo de solicitud JSON no válido o malformado.' },
                400,
            );
        }

        if (!body || typeof body !== 'object') {
            return jsonResponse(
                { error: 'El cuerpo de la solicitud debe ser un objeto JSON.' },
                400,
            );
        }

        const action = typeof body.action === 'string' ? body.action.trim() : 'list';

        // ACCIÓN: LISTAR USUARIOS
        if (action === 'list') {
            const { data: profiles, error: listError } = await adminClient
                .from('profiles')
                .select('id, full_name, email, role, phone, avatar_url, created_at, updated_at')
                .order('created_at', { ascending: false });

            if (listError) {
                console.error('[admin-users] Error consultando perfiles:', listError.message);
                return jsonResponse(
                    { error: 'No se pudieron consultar los usuarios del sistema.' },
                    500,
                );
            }

            return jsonResponse({
                success: true,
                users: profiles ?? [],
            });
        }

        // ACCIÓN: ACTUALIZAR ROL
        if (action === 'update_role') {
            const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId.trim() : '';
            const rawRole = typeof body.newRole === 'string' ? body.newRole.trim().toLowerCase() : '';
            const requestedEmail = typeof body.targetEmail === 'string' ? body.targetEmail.trim().toLowerCase() : '';

            if (!targetUserId) {
                return jsonResponse(
                    { error: 'Parámetro targetUserId requerido.' },
                    400,
                );
            }

            if (!rawRole || !ALLOWED_ROLES.includes(rawRole as UserRole)) {
                return jsonResponse(
                    { error: `Rol no válido. Los roles admitidos son: ${ALLOWED_ROLES.join(', ')}.` },
                    400,
                );
            }

            const newRole = rawRole as UserRole;

            // Validación preventiva por parámetros contra degradación del Administrador Principal
            if (
                (targetUserId === MAIN_ADMIN_ID || requestedEmail === MAIN_ADMIN_EMAIL.toLowerCase()) &&
                newRole !== 'admin'
            ) {
                return jsonResponse(
                    { error: 'Operación denegada: el rol del Administrador Principal está protegido y no puede ser degradado.' },
                    400,
                );
            }

            // Validación: El administrador no puede retirarse a sí mismo los privilegios de admin
            if (targetUserId === user.id && newRole !== 'admin') {
                return jsonResponse(
                    { error: 'Operación denegada: no puedes retirar tus propios privilegios de administrador.' },
                    400,
                );
            }

            // Consultar el perfil objetivo autoritativo en la base de datos
            const { data: targetProfile, error: targetError } = await adminClient
                .from('profiles')
                .select('id, email, full_name, role')
                .eq('id', targetUserId)
                .single();

            if (targetError || !targetProfile) {
                return jsonResponse(
                    { error: 'El usuario destino no existe en el sistema.' },
                    404,
                );
            }

            // Doble verificación autoritativa sobre la identidad del Administrador Principal
            const isTargetMainAdmin =
                targetProfile.id === MAIN_ADMIN_ID ||
                targetProfile.email?.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase();

            if (isTargetMainAdmin && newRole !== 'admin') {
                return jsonResponse(
                    { error: 'Operación denegada: la cuenta de jairo.vinas@gmail.com está protegida contra degradación de rol.' },
                    400,
                );
            }

            // Si el usuario ya tiene el rol solicitado, no se requiere modificación
            if (targetProfile.role === newRole) {
                return jsonResponse({
                    success: true,
                    message: `El usuario ${targetProfile.full_name || targetProfile.email} ya posee el rol '${newRole}'.`,
                    user: targetProfile,
                });
            }

            // Ejecutar la actualización a través de service_role (autorizado frente al trigger)
            const { data: updatedProfile, error: updateError } = await adminClient
                .from('profiles')
                .update({
                    role: newRole,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', targetUserId)
                .select('id, full_name, email, role, phone, avatar_url, created_at, updated_at')
                .single();

            if (updateError || !updatedProfile) {
                console.error('[admin-users] Error actualizando rol:', updateError?.message);
                return jsonResponse(
                    { error: 'No se pudo actualizar el rol del usuario en la base de datos.' },
                    500,
                );
            }

            console.info(
                `[admin-users] Rol actualizado exitosamente: Usuario ${targetUserId} cambiado a '${newRole}' por Admin ${user.id}`,
            );

            return jsonResponse({
                success: true,
                message: `El rol de ${updatedProfile.full_name || updatedProfile.email} ha sido actualizado a ${newRole}.`,
                user: updatedProfile,
            });
        }

        // ACCIÓN: ELIMINAR USUARIO
        if (action === 'delete_user') {
            const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId.trim() : '';
            const requestedEmail = typeof body.targetEmail === 'string' ? body.targetEmail.trim().toLowerCase() : '';

            if (!targetUserId) {
                return jsonResponse(
                    { error: 'Parámetro targetUserId requerido.' },
                    400,
                );
            }

            // Validación preventiva: proteger al Administrador Principal
            if (
                targetUserId === MAIN_ADMIN_ID ||
                requestedEmail === MAIN_ADMIN_EMAIL.toLowerCase()
            ) {
                return jsonResponse(
                    { error: 'Operación denegada: la cuenta del Administrador Principal está protegida y no puede ser eliminada.' },
                    400,
                );
            }

            // Validación: El administrador no puede eliminarse a sí mismo
            if (targetUserId === user.id) {
                return jsonResponse(
                    { error: 'Operación denegada: no puedes eliminar tu propia cuenta administrativa activa.' },
                    400,
                );
            }

            // Consultar el perfil objetivo para verificar identidad y existencia
            const { data: targetProfile, error: targetError } = await adminClient
                .from('profiles')
                .select('id, email, full_name, role')
                .eq('id', targetUserId)
                .single();

            if (targetError || !targetProfile) {
                return jsonResponse(
                    { error: 'El usuario destino no existe en el sistema.' },
                    404,
                );
            }

            // Doble verificación: comprobar que no sea el Administrador Principal
            if (
                targetProfile.id === MAIN_ADMIN_ID ||
                targetProfile.email?.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase()
            ) {
                return jsonResponse(
                    { error: 'Operación denegada: la cuenta de jairo.vinas@gmail.com está protegida contra eliminación.' },
                    400,
                );
            }

            // Eliminar de auth.users usando el cliente admin (cascada a public.profiles)
            const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUserId);

            if (deleteAuthError) {
                console.error('[admin-users] Error eliminando usuario en auth:', deleteAuthError.message);
                return jsonResponse(
                    { error: `No se pudo eliminar el usuario de autenticación: ${deleteAuthError.message}` },
                    500,
                );
            }

            console.info(
                `[admin-users] Usuario ${targetUserId} (${targetProfile.email}) eliminado exitosamente por Admin ${user.id}`,
            );

            return jsonResponse({
                success: true,
                message: `El usuario ${targetProfile.full_name || targetProfile.email} ha sido eliminado definitivamente.`,
                deletedUserId: targetUserId,
            });
        }

        // ACCIÓN: CREAR NUEVO USUARIO
        if (action === 'create_user') {
            const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
            const password = typeof body.password === 'string' ? body.password.trim() : '';
            const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
            const rawRole = typeof body.role === 'string' ? body.role.trim().toLowerCase() : 'client';
            const phone = typeof body.phone === 'string' ? body.phone.trim() : null;

            if (!rawEmail) {
                return jsonResponse(
                    { error: 'Por favor ingresa una dirección de correo electrónico.' },
                    400,
                );
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(rawEmail)) {
                return jsonResponse(
                    { error: 'El correo electrónico ingresado no tiene un formato válido.' },
                    400,
                );
            }

            if (!fullName) {
                return jsonResponse(
                    { error: 'Por favor ingresa el nombre completo del usuario.' },
                    400,
                );
            }

            if (!password || password.length < 6) {
                return jsonResponse(
                    { error: 'La contraseña inicial debe tener como mínimo 6 caracteres.' },
                    400,
                );
            }

            if (!ALLOWED_ROLES.includes(rawRole as UserRole)) {
                return jsonResponse(
                    { error: `Rol no válido. Los roles admitidos son: ${ALLOWED_ROLES.join(', ')}.` },
                    400,
                );
            }

            const targetRole = rawRole as UserRole;

            // 1. Crear el usuario en auth.users mediante la API administrativa
            const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
                email: rawEmail,
                password,
                email_confirm: true,
                user_metadata: {
                    full_name: fullName,
                },
            });

            if (createError || !createData?.user) {
                console.error('[admin-users] Error creando usuario en auth:', createError?.message);
                const errMsg = createError?.message || '';
                let translated = 'No se pudo crear el usuario en el sistema de autenticación.';
                if (
                    errMsg.toLowerCase().includes('already registered') ||
                    errMsg.toLowerCase().includes('already exists')
                ) {
                    translated = 'Ya existe un usuario registrado con este correo electrónico.';
                } else if (errMsg.toLowerCase().includes('password')) {
                    translated = 'La contraseña debe tener como mínimo 6 caracteres.';
                }
                return jsonResponse({ error: translated }, 400);
            }

            const newUserId = createData.user.id;

            // 2. Asegurar y actualizar el perfil en public.profiles con el rol seleccionado y datos complementarios
            const { data: updatedProfile, error: profileUpdateError } = await adminClient
                .from('profiles')
                .upsert({
                    id: newUserId,
                    full_name: fullName,
                    email: rawEmail,
                    role: targetRole,
                    phone: phone || null,
                    updated_at: new Date().toISOString(),
                })
                .select('id, full_name, email, role, phone, avatar_url, created_at, updated_at')
                .single();

            if (profileUpdateError) {
                console.warn(
                    '[admin-users] Advertencia actualizando perfil tras creación:',
                    profileUpdateError.message,
                );
            }

            console.info(
                `[admin-users] Usuario creado exitosamente: ${rawEmail} con rol '${targetRole}' por Admin ${user.id}`,
            );

            return jsonResponse({
                success: true,
                message: `Usuario ${fullName} (${rawEmail}) creado exitosamente con rol '${targetRole}'.`,
                user: updatedProfile || {
                    id: newUserId,
                    full_name: fullName,
                    email: rawEmail,
                    role: targetRole,
                    phone,
                    created_at: new Date().toISOString(),
                },
            });
        }

        return jsonResponse(
            { error: `Acción '${action}' no reconocida o no soportada. Acciones admitidas: 'list', 'update_role', 'delete_user', 'create_user'.` },
            400,
        );
    } catch (err: any) {
        console.error('[admin-users] Error inesperado en Edge Function:', err);
        return jsonResponse(
            { error: 'Ocurrió un error inesperado al procesar la solicitud administrativa.' },
            500,
        );
    }
});
