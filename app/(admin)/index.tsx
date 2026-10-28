// ==============================================================================
// ATELIER DIGITAL — PANEL DE ADMINISTRACIÓN PRINCIPAL
// Archivo: app/(admin)/index.tsx
// ==============================================================================
// Interfaz administrativa para el Administrador Principal (jairo.vinas@gmail.com).
// Permite consultar usuarios y gestionar roles mediante la Edge Function autorizada,
// con estricta protección contra degradaciones y respetando la identidad visual
// de By Katherine Carroll · Atelier de Autor.
// ==============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { UserRole } from '../../src/types/auth';
import {
    AdminUserItem,
    createAdminUser,
    deleteUser,
    fetchAdminUsers,
    MAIN_ADMIN_EMAIL,
    MAIN_ADMIN_ID,
    updateUserRole,
} from '../../src/services/adminService';

type FilterRole = 'all' | 'admin' | 'designer' | 'client';

export default function AdminHomeScreen() {
    const { profile, signOut } = useAuth();

    // Estado de la lista de usuarios
    const [users, setUsers] = useState<AdminUserItem[]>([]);
    const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
    const [userError, setUserError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [dataSource, setDataSource] = useState<'edge_function' | 'database_direct'>('edge_function');

    // Filtros y búsqueda
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedFilter, setSelectedFilter] = useState<FilterRole>('all');

    // Estado de edición de rol
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [targetRole, setTargetRole] = useState<UserRole>('client');
    const [isUpdatingRole, setIsUpdatingRole] = useState<boolean>(false);

    // Estado para confirmación y eliminación de usuario
    const [userToDelete, setUserToDelete] = useState<AdminUserItem | null>(null);
    const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);

    // Estado para modal de creación de nuevo usuario
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [newFullName, setNewFullName] = useState<string>('');
    const [newEmail, setNewEmail] = useState<string>('');
    const [newPassword, setNewPassword] = useState<string>('');
    const [newPhone, setNewPhone] = useState<string>('');
    const [newRole, setNewRole] = useState<UserRole>('designer');
    const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
    const [isCreatingUser, setIsCreatingUser] = useState<boolean>(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const handleOpenCreateModal = () => {
        setNewFullName('');
        setNewEmail('');
        setNewPassword('');
        setNewPhone('');
        setNewRole('designer');
        setShowNewPassword(false);
        setCreateError(null);
        setIsCreateModalOpen(true);
    };

    const handleCloseCreateModal = () => {
        if (isCreatingUser) return;
        setIsCreateModalOpen(false);
    };

    const handleConfirmCreateUser = async () => {
        setCreateError(null);

        if (!newFullName.trim()) {
            setCreateError('Por favor ingresa el nombre completo del usuario.');
            return;
        }

        if (!newEmail.trim()) {
            setCreateError('Por favor ingresa el correo electrónico.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail.trim())) {
            setCreateError('El correo electrónico ingresado no tiene un formato válido.');
            return;
        }

        if (!newPassword.trim() || newPassword.trim().length < 6) {
            setCreateError('La contraseña inicial debe tener como mínimo 6 caracteres.');
            return;
        }

        setIsCreatingUser(true);

        const result = await createAdminUser({
            fullName: newFullName.trim(),
            email: newEmail.trim().toLowerCase(),
            password: newPassword.trim(),
            role: newRole,
            phone: newPhone.trim() || undefined,
        });

        setIsCreatingUser(false);

        if (!result.success) {
            setCreateError(result.error || 'No se pudo crear el usuario.');
        } else {
            setSuccessMessage(
                result.message || `Usuario ${newFullName.trim()} creado exitosamente con rol '${newRole}'.`,
            );
            setIsCreateModalOpen(false);
            if (result.user) {
                setUsers((prev) => [result.user!, ...prev]);
            } else {
                loadUsers();
            }
        }
    };

    // Cargar usuarios al montar
    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoadingUsers(true);
        setUserError(null);

        const result = await fetchAdminUsers();
        if (result.error) {
            setUserError(result.error);
        } else {
            setUsers(result.users);
            setDataSource(result.source);
        }
        setLoadingUsers(false);
    };

    const handleSignOut = async () => {
        await signOut();
    };

    // Iniciar edición de rol
    const handleStartEditRole = (user: AdminUserItem) => {
        // Validación preventiva en cliente
        if (
            user.id === MAIN_ADMIN_ID ||
            user.email?.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase()
        ) {
            setUserError('El rol del Administrador Principal está protegido contra degradaciones.');
            return;
        }

        if (profile?.id && user.id === profile.id) {
            setUserError('No puedes modificar tu propio rol de administrador desde la interfaz.');
            return;
        }

        setUserError(null);
        setSuccessMessage(null);
        setEditingUserId(user.id);
        setTargetRole(user.role);
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
    };

    const handleConfirmRoleChange = async (user: AdminUserItem) => {
        if (targetRole === user.role) {
            setEditingUserId(null);
            return;
        }

        setIsUpdatingRole(true);
        setUserError(null);
        setSuccessMessage(null);

        const response = await updateUserRole(
            user.id,
            targetRole,
            user.email,
            profile?.id,
        );

        if (!response.success) {
            setUserError(response.error || 'No se pudo actualizar el rol.');
        } else {
            setSuccessMessage(
                response.message || `Rol actualizado exitosamente a ${targetRole}.`,
            );
            // Actualizar el estado local
            setUsers((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, role: targetRole } : u)),
            );
            setEditingUserId(null);
        }

        setIsUpdatingRole(false);
    };

    // Solicitar confirmación para eliminar usuario
    const handleRequestDeleteUser = (user: AdminUserItem) => {
        if (
            user.id === MAIN_ADMIN_ID ||
            user.email?.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase()
        ) {
            setUserError(
                'La cuenta del Administrador Principal está estrictamente protegida contra eliminación.',
            );
            return;
        }

        if (profile?.id && user.id === profile.id) {
            setUserError('No puedes eliminar tu propia cuenta administrativa activa.');
            return;
        }

        setUserError(null);
        setSuccessMessage(null);
        setUserToDelete(user);
    };

    // Confirmar y procesar la eliminación del usuario
    const handleConfirmDeleteUser = async () => {
        if (!userToDelete) return;

        setIsDeletingUser(true);
        setUserError(null);
        setSuccessMessage(null);

        const result = await deleteUser(
            userToDelete.id,
            userToDelete.email,
            profile?.id,
        );

        if (!result.success) {
            setUserError(result.error || 'No se pudo eliminar el usuario.');
        } else {
            const targetIdentifier = userToDelete.email || userToDelete.full_name || 'seleccionado';
            setSuccessMessage(
                result.message || `Usuario (${targetIdentifier}) eliminado exitosamente.`,
            );
            setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
            setUserToDelete(null);
        }

        setIsDeletingUser(false);
    };

    // Usuarios filtrados por término de búsqueda y rol
    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            const matchesFilter =
                selectedFilter === 'all' || u.role === selectedFilter;
            const term = searchQuery.toLowerCase().trim();
            const matchesSearch =
                !term ||
                u.full_name?.toLowerCase().includes(term) ||
                u.email?.toLowerCase().includes(term);
            return matchesFilter && matchesSearch;
        });
    }, [users, selectedFilter, searchQuery]);

    const isMainAdmin = (u: AdminUserItem): boolean => {
        return (
            u.id === MAIN_ADMIN_ID ||
            u.email?.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase()
        );
    };

    const formatDate = (dateStr?: string): string => {
        if (!dateStr) return 'Fecha no registrada';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const getRoleBadgeStyle = (role: UserRole) => {
        switch (role) {
            case 'admin':
                return {
                    bg: colors.atelierBlack,
                    text: colors.champagneGold,
                    label: 'ADMINISTRADOR',
                };
            case 'designer':
                return {
                    bg: colors.champagneGold,
                    text: '#FFFFFF',
                    label: 'DISEÑADORA',
                };
            case 'client':
            default:
                return {
                    bg: colors.surfaceSubtle,
                    text: colors.textSecondary,
                    label: 'CLIENTA',
                };
        }
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <StatusBar style="dark" />

            {/* Encabezado y Marca */}
            <View style={styles.header}>
                <Text style={styles.brand}>ATELIER DIGITAL</Text>
                <View style={styles.divider} />
                <Text style={styles.eyebrow}>BY KATHERINE CARROLL</Text>
                <Text style={styles.title}>Panel de Administración</Text>
                <Text style={styles.subtitle}>
                    Centro de control de usuarios, permisos y seguridad de la plataforma
                </Text>
            </View>

            {/* Tarjeta del Administrador Principal */}
            <View style={styles.welcomeCard}>
                <View style={styles.cardHeaderRow}>
                    <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>ADMINISTRADOR PRINCIPAL</Text>
                    </View>
                    <View style={styles.statusIndicator}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Sesión activa</Text>
                    </View>
                </View>

                <Text style={styles.adminName}>
                    {profile?.full_name || 'Jairo Viñas'}
                </Text>
                <Text style={styles.adminEmail}>
                    {profile?.email || 'jairo.vinas@gmail.com'}
                </Text>

                <View style={styles.cardInfoDivider} />

                <Text style={styles.adminDescription}>
                    Esta cuenta cuenta con permisos globales de administración. Los cambios
                    de roles y configuraciones están protegidos por el backend de Supabase.
                </Text>
            </View>

            {/* Accesos de Navegación del Panel Administrativo */}
            <View style={styles.navBar}>
                <View style={[styles.navItem, styles.navItemActive]}>
                    <Text style={[styles.navItemText, styles.navItemTextActive]}>
                        👥 Usuarios y Permisos
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={() => router.push('/(admin)/settings')}
                    style={styles.navItem}
                    activeOpacity={0.8}
                >
                    <Text style={styles.navItemText}>
                        ⚙️ Configuración Global
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/(admin)/clients')}
                    style={styles.navItem}
                    activeOpacity={0.8}
                >
                    <Text style={styles.navItemText}>
                        📇 Directorio de Clientes
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/(admin)/patterns')}
                    style={styles.navItem}
                    activeOpacity={0.8}
                >
                    <Text style={styles.navItemText}>
                        📐 Motor de Patronaje
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Notificaciones globales de éxito y error */}
            {successMessage && (
                <View style={styles.successBanner}>
                    <Text style={styles.successText}>✦ {successMessage}</Text>
                    <TouchableOpacity
                        onPress={() => setSuccessMessage(null)}
                        style={styles.dismissButton}
                    >
                        <Text style={styles.dismissText}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {userError && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>⚠ {userError}</Text>
                    <TouchableOpacity
                        onPress={() => setUserError(null)}
                        style={styles.dismissButton}
                    >
                        <Text style={styles.dismissText}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* MÓDULO 1: GESTIÓN DE USUARIOS Y ROLES */}
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                    <Text style={styles.sectionTitle}>Usuarios y Permisos</Text>
                    <Text style={styles.sectionSubtitle}>
                        Control de cuentas autorizadas y roles en Atelier Digital
                    </Text>
                </View>

                <View style={styles.sectionActionsRow}>
                    <TouchableOpacity
                        onPress={handleOpenCreateModal}
                        style={styles.createUserButton}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.createUserButtonText}>+ Nuevo Usuario</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={loadUsers}
                        disabled={loadingUsers}
                        style={styles.refreshButton}
                        activeOpacity={0.8}
                    >
                        {loadingUsers ? (
                            <ActivityIndicator size="small" color={colors.champagneGold} />
                        ) : (
                            <Text style={styles.refreshButtonText}>Actualizar</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Barra de filtros y búsqueda */}
            <View style={styles.filterCard}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nombre o correo electrónico..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                />

                <View style={styles.filterTabs}>
                    {(
                        [
                            { key: 'all', label: `Todos (${users.length})` },
                            {
                                key: 'admin',
                                label: `Admins (${users.filter((u) => u.role === 'admin').length})`,
                            },
                            {
                                key: 'designer',
                                label: `Diseñadora (${users.filter((u) => u.role === 'designer').length})`,
                            },
                            {
                                key: 'client',
                                label: `Clientas (${users.filter((u) => u.role === 'client').length})`,
                            },
                        ] as const
                    ).map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => setSelectedFilter(tab.key)}
                            style={[
                                styles.filterTab,
                                selectedFilter === tab.key && styles.filterTabActive,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.filterTabText,
                                    selectedFilter === tab.key && styles.filterTabTextActive,
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Lista de usuarios */}
            {loadingUsers && users.length === 0 ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={colors.champagneGold} />
                    <Text style={styles.loadingText}>Cargando cuentas de usuario...</Text>
                </View>
            ) : filteredUsers.length === 0 ? (
                <View style={styles.emptyBox}>
                    <Text style={styles.emptyTitle}>No se encontraron usuarios</Text>
                    <Text style={styles.emptySubtitle}>
                        {searchQuery
                            ? 'No hay registros que coincidan con el término de búsqueda.'
                            : 'No hay usuarios registrados con el filtro seleccionado.'}
                    </Text>
                </View>
            ) : (
                <View style={styles.usersList}>
                    {filteredUsers.map((userItem) => {
                        const badge = getRoleBadgeStyle(userItem.role);
                        const isMain = isMainAdmin(userItem);
                        const isSelf = profile?.id === userItem.id;
                        const isEditing = editingUserId === userItem.id;

                        return (
                            <View
                                key={userItem.id}
                                style={[
                                    styles.userCard,
                                    isMain && styles.userCardMainAdmin,
                                ]}
                            >
                                <View style={styles.userCardTop}>
                                    <View style={styles.userInfoCol}>
                                        <Text style={styles.userName}>
                                            {userItem.full_name || 'Sin nombre registrado'}
                                        </Text>
                                        <Text style={styles.userEmail}>
                                            {userItem.email || 'Correo no disponible'}
                                        </Text>
                                        <Text style={styles.userDate}>
                                            Registro: {formatDate(userItem.created_at)}
                                        </Text>
                                    </View>

                                    <View style={styles.badgeCol}>
                                        <View
                                            style={[
                                                styles.roleBadge,
                                                { backgroundColor: badge.bg },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.roleBadgeText,
                                                    { color: badge.text },
                                                ]}
                                            >
                                                {badge.label}
                                            </Text>
                                        </View>

                                        {isMain && (
                                            <View style={styles.protectedBadge}>
                                                <Text style={styles.protectedBadgeText}>
                                                    PROTEGIDO
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Opciones de edición de rol */}
                                {isEditing ? (
                                    <View style={styles.editRoleBox}>
                                        <Text style={styles.editRoleTitle}>
                                            Selecciona el nuevo rol para este usuario:
                                        </Text>

                                        <View style={styles.roleSelectorRow}>
                                            {(['client', 'designer', 'admin'] as const).map(
                                                (roleOpt) => (
                                                    <TouchableOpacity
                                                        key={roleOpt}
                                                        onPress={() => setTargetRole(roleOpt)}
                                                        style={[
                                                            styles.roleOptButton,
                                                            targetRole === roleOpt &&
                                                                styles.roleOptButtonActive,
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.roleOptText,
                                                                targetRole === roleOpt &&
                                                                    styles.roleOptTextActive,
                                                            ]}
                                                        >
                                                            {roleOpt === 'admin'
                                                                ? 'Administrador'
                                                                : roleOpt === 'designer'
                                                                ? 'Diseñadora'
                                                                : 'Clienta'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ),
                                            )}
                                        </View>

                                        <Text style={styles.confirmPrompt}>
                                            ¿Confirmas que deseas cambiar el rol a «
                                            {targetRole === 'admin'
                                                ? 'Administrador'
                                                : targetRole === 'designer'
                                                ? 'Diseñadora'
                                                : 'Clienta'}
                                            »?
                                        </Text>

                                        <View style={styles.actionButtonsRow}>
                                            <TouchableOpacity
                                                onPress={() =>
                                                    handleConfirmRoleChange(userItem)
                                                }
                                                disabled={isUpdatingRole}
                                                style={styles.confirmButton}
                                            >
                                                {isUpdatingRole ? (
                                                    <ActivityIndicator
                                                        size="small"
                                                        color="#FFFFFF"
                                                    />
                                                ) : (
                                                    <Text style={styles.confirmButtonText}>
                                                        Confirmar cambio
                                                    </Text>
                                                )}
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                onPress={handleCancelEdit}
                                                disabled={isUpdatingRole}
                                                style={styles.cancelButton}
                                            >
                                                <Text style={styles.cancelButtonText}>
                                                    Cancelar
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.userCardFooter}>
                                        {isMain ? (
                                            <Text style={styles.lockedNotice}>
                                                ✦ Rol protegido · Administrador Principal
                                            </Text>
                                        ) : isSelf ? (
                                            <Text style={styles.lockedNotice}>
                                                ✦ Tu propia cuenta administrativa activa
                                            </Text>
                                        ) : (
                                            <View style={styles.userActionButtonsRow}>
                                                <TouchableOpacity
                                                    onPress={() => handleStartEditRole(userItem)}
                                                    style={styles.editRoleButton}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.editRoleButtonText}>
                                                        Modificar Rol
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => handleRequestDeleteUser(userItem)}
                                                    style={styles.deleteUserButton}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.deleteUserButtonText}>
                                                        Eliminar
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            )}

            {/* MÓDULO 2: CONFIGURACIÓN GLOBAL */}
            <Text style={styles.sectionTitleSecondary}>Configuración Global</Text>

            <View style={styles.moduleCard}>
                <View style={styles.moduleCardHeader}>
                    <Text style={styles.moduleTitle}>Parámetros de la Plataforma</Text>
                    <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>
                            DISPONIBLE
                        </Text>
                    </View>
                </View>
                <Text style={styles.moduleDescription}>
                    Consulta y edita los datos comerciales del atelier (nombre, correo y teléfono de contacto), así como las preferencias regionales de idioma, moneda y formato de fecha.
                </Text>

                <TouchableOpacity
                    onPress={() => router.push('/(admin)/settings')}
                    style={styles.openSettingsButton}
                    activeOpacity={0.85}
                >
                    <Text style={styles.openSettingsButtonText}>
                        Gestionar Configuración Global →
                    </Text>
                </TouchableOpacity>
            </View>

            {/* MÓDULO 3: DIRECTORIO DE CLIENTES */}
            <Text style={styles.sectionTitleSecondary}>Directorio de Clientes</Text>

            <View style={styles.moduleCard}>
                <View style={styles.moduleCardHeader}>
                    <Text style={styles.moduleTitle}>Fichas de Clientes</Text>
                    <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>
                            DISPONIBLE
                        </Text>
                    </View>
                </View>
                <Text style={styles.moduleDescription}>
                    Consulta, registra y actualiza clientes del atelier con información de contacto, ciudad, preferencias de alta costura y notas privadas.
                </Text>

                <TouchableOpacity
                    onPress={() => router.push('/(admin)/clients')}
                    style={styles.openSettingsButton}
                    activeOpacity={0.85}
                >
                    <Text style={styles.openSettingsButtonText}>
                        Gestionar Directorio de Clientes →
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Botón de Cierre de Sesión */}
            <TouchableOpacity
                onPress={handleSignOut}
                style={styles.signOutButton}
                activeOpacity={0.8}
            >
                <Text style={styles.signOutText}>Cerrar Sesión de Administrador</Text>
            </TouchableOpacity>

            {/* Modal de confirmación para eliminar usuario */}
            <Modal
                visible={!!userToDelete}
                transparent
                animationType="fade"
                onRequestClose={() => !isDeletingUser && setUserToDelete(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalBadge}>SEGURIDAD · ACCIÓN IRREVERSIBLE</Text>
                            <Text style={styles.modalTitle}>¿Eliminar usuario?</Text>
                        </View>

                        <Text style={styles.modalDescription}>
                            Estás a punto de eliminar permanentemente la cuenta de{' '}
                            <Text style={styles.modalHighlight}>
                                {userToDelete?.full_name || userToDelete?.email}
                            </Text>
                            {userToDelete?.email ? ` (${userToDelete.email})` : ''}.
                        </Text>
                        <Text style={styles.modalWarning}>
                            Esta acción borrará sus credenciales de acceso, su perfil y sus registros asociados en la base de datos de manera definitiva.
                        </Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalDeleteButton}
                                onPress={handleConfirmDeleteUser}
                                disabled={isDeletingUser}
                                activeOpacity={0.85}
                            >
                                {isDeletingUser ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.modalDeleteButtonText}>
                                        Eliminar Usuario Definitivamente
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => !isDeletingUser && setUserToDelete(null)}
                                disabled={isDeletingUser}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal para crear nuevo usuario */}
            <Modal
                visible={isCreateModalOpen}
                transparent
                animationType="fade"
                onRequestClose={handleCloseCreateModal}
            >
                <View style={styles.modalOverlay}>
                    <ScrollView
                        contentContainerStyle={styles.createModalScroll}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={[styles.modalContent, styles.createModalCard]}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.createModalBadge}>
                                    ADMINISTRACIÓN · NUEVA CUENTA
                                </Text>
                                <Text style={styles.modalTitle}>Crear Nuevo Usuario</Text>
                                <Text style={styles.createModalSubtitle}>
                                    Crea una cuenta con acceso directo y asigna su rol en Atelier Digital.
                                </Text>
                            </View>

                            {createError && (
                                <View style={styles.createErrorBox}>
                                    <Text style={styles.createErrorText}>⚠ {createError}</Text>
                                </View>
                            )}

                            <View style={styles.createFormGroup}>
                                <Text style={styles.createInputLabel}>Nombre Completo *</Text>
                                <TextInput
                                    style={styles.createTextInput}
                                    placeholder="Ej. María Katherine Carroll"
                                    placeholderTextColor={colors.sand}
                                    value={newFullName}
                                    onChangeText={(t) => {
                                        setNewFullName(t);
                                        if (createError) setCreateError(null);
                                    }}
                                    editable={!isCreatingUser}
                                />
                            </View>

                            <View style={styles.createFormGroup}>
                                <Text style={styles.createInputLabel}>Correo Electrónico *</Text>
                                <TextInput
                                    style={styles.createTextInput}
                                    placeholder="usuario@bykatherinecarroll.com"
                                    placeholderTextColor={colors.sand}
                                    value={newEmail}
                                    onChangeText={(t) => {
                                        setNewEmail(t);
                                        if (createError) setCreateError(null);
                                    }}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    editable={!isCreatingUser}
                                />
                            </View>

                            <View style={styles.createFormGroup}>
                                <View style={styles.labelRow}>
                                    <Text style={styles.createInputLabel}>Contraseña Inicial *</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowNewPassword((p) => !p)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Text style={styles.togglePasswordText}>
                                            {showNewPassword ? 'Ocultar' : 'Mostrar'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <TextInput
                                    style={styles.createTextInput}
                                    placeholder="Mínimo 6 caracteres"
                                    placeholderTextColor={colors.sand}
                                    value={newPassword}
                                    onChangeText={(t) => {
                                        setNewPassword(t);
                                        if (createError) setCreateError(null);
                                    }}
                                    secureTextEntry={!showNewPassword}
                                    editable={!isCreatingUser}
                                />
                            </View>

                            <View style={styles.createFormGroup}>
                                <Text style={styles.createInputLabel}>Teléfono de Contacto (Opcional)</Text>
                                <TextInput
                                    style={styles.createTextInput}
                                    placeholder="+57 300 123 4567"
                                    placeholderTextColor={colors.sand}
                                    value={newPhone}
                                    onChangeText={setNewPhone}
                                    keyboardType="phone-pad"
                                    editable={!isCreatingUser}
                                />
                            </View>

                            <View style={styles.createFormGroup}>
                                <Text style={styles.createInputLabel}>Rol Asignado *</Text>
                                <View style={styles.rolePickerRow}>
                                    <TouchableOpacity
                                        style={[
                                            styles.rolePickerOption,
                                            newRole === 'designer' && styles.rolePickerOptionActive,
                                        ]}
                                        onPress={() => setNewRole('designer')}
                                        disabled={isCreatingUser}
                                        activeOpacity={0.8}
                                    >
                                        <Text
                                            style={[
                                                styles.rolePickerOptionText,
                                                newRole === 'designer' &&
                                                    styles.rolePickerOptionTextActive,
                                            ]}
                                        >
                                            Diseñadora
                                        </Text>
                                        <Text style={styles.rolePickerOptionDesc}>
                                            Atelier y Creación
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.rolePickerOption,
                                            newRole === 'admin' && styles.rolePickerOptionActive,
                                        ]}
                                        onPress={() => setNewRole('admin')}
                                        disabled={isCreatingUser}
                                        activeOpacity={0.8}
                                    >
                                        <Text
                                            style={[
                                                styles.rolePickerOptionText,
                                                newRole === 'admin' &&
                                                    styles.rolePickerOptionTextActive,
                                            ]}
                                        >
                                            Administrador
                                        </Text>
                                        <Text style={styles.rolePickerOptionDesc}>
                                            Control Total
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.rolePickerOption,
                                            newRole === 'client' && styles.rolePickerOptionActive,
                                        ]}
                                        onPress={() => setNewRole('client')}
                                        disabled={isCreatingUser}
                                        activeOpacity={0.8}
                                    >
                                        <Text
                                            style={[
                                                styles.rolePickerOptionText,
                                                newRole === 'client' &&
                                                    styles.rolePickerOptionTextActive,
                                            ]}
                                        >
                                            Clienta
                                        </Text>
                                        <Text style={styles.rolePickerOptionDesc}>
                                            Espacio Personal
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalSubmitButton}
                                    onPress={handleConfirmCreateUser}
                                    disabled={isCreatingUser}
                                    activeOpacity={0.85}
                                >
                                    {isCreatingUser ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.modalSubmitButtonText}>
                                            Crear y Autorizar Usuario
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.modalCancelButton}
                                    onPress={handleCloseCreateModal}
                                    disabled={isCreatingUser}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.modalCancelButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.ivoryWarm,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 60,
        maxWidth: 900,
        width: '100%',
        alignSelf: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 28,
    },
    brand: {
        color: colors.champagneGold,
        fontFamily: typography.sans,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 4,
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: colors.champagneGold,
        width: 60,
        marginTop: 14,
        marginBottom: 16,
    },
    eyebrow: {
        color: colors.textSecondary,
        fontSize: 11,
        letterSpacing: 2,
        textAlign: 'center',
    },
    title: {
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        fontSize: 32,
        textAlign: 'center',
        marginTop: 10,
    },
    subtitle: {
        color: colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    welcomeCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 24,
        marginBottom: 24,
        borderRadius: 4,
        shadowColor: '#171411',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    adminBadge: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 3,
    },
    adminBadgeText: {
        color: colors.champagneGold,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: colors.success,
    },
    statusText: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '500',
    },
    adminName: {
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        fontSize: 26,
    },
    adminEmail: {
        color: colors.textSecondary,
        fontSize: 14,
        marginTop: 4,
    },
    cardInfoDivider: {
        height: 1,
        backgroundColor: colors.sand,
        marginVertical: 16,
    },
    adminDescription: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 20,
    },
    successBanner: {
        backgroundColor: colors.successBg,
        borderColor: colors.successBorder,
        borderWidth: 1,
        borderRadius: 4,
        padding: 14,
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    successText: {
        color: colors.success,
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
    errorBanner: {
        backgroundColor: colors.errorBg,
        borderColor: colors.errorBorder,
        borderWidth: 1,
        borderRadius: 4,
        padding: 14,
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    errorText: {
        color: colors.error,
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
    dismissButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    dismissText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: 'bold',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 10,
        marginBottom: 16,
    },
    sectionTitle: {
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        fontSize: 22,
    },
    sectionSubtitle: {
        color: colors.textSecondary,
        fontSize: 13,
        marginTop: 4,
    },
    refreshButton: {
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 4,
    },
    refreshButtonText: {
        color: colors.bronze,
        fontSize: 12,
        fontWeight: '600',
    },
    filterCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 14,
        marginBottom: 16,
        borderRadius: 4,
    },
    searchInput: {
        backgroundColor: colors.ivoryWarm,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        color: colors.atelierBlack,
        marginBottom: 12,
    },
    filterTabs: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterTab: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        backgroundColor: colors.ivoryWarm,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    filterTabActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    filterTabText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    filterTabTextActive: {
        color: colors.champagneGold,
    },
    loadingBox: {
        padding: 40,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
    },
    loadingText: {
        marginTop: 12,
        color: colors.textSecondary,
        fontSize: 13,
    },
    emptyBox: {
        padding: 36,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
    },
    emptyTitle: {
        color: colors.atelierBlack,
        fontSize: 16,
        fontWeight: '600',
    },
    emptySubtitle: {
        color: colors.textSecondary,
        fontSize: 13,
        marginTop: 6,
        textAlign: 'center',
    },
    usersList: {
        gap: 12,
        marginBottom: 32,
    },
    userCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
        padding: 18,
    },
    userCardMainAdmin: {
        borderColor: colors.champagneGold,
        backgroundColor: '#FCFAF6',
    },
    userCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    userInfoCol: {
        flex: 1,
        paddingRight: 12,
    },
    userName: {
        color: colors.atelierBlack,
        fontSize: 16,
        fontWeight: '600',
    },
    userEmail: {
        color: colors.textSecondary,
        fontSize: 13,
        marginTop: 2,
    },
    userDate: {
        color: colors.textMuted,
        fontSize: 11,
        marginTop: 6,
    },
    badgeCol: {
        alignItems: 'flex-end',
        gap: 6,
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 3,
    },
    roleBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
    },
    protectedBadge: {
        backgroundColor: colors.sand,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 2,
    },
    protectedBadgeText: {
        color: colors.bronze,
        fontSize: 8,
        fontWeight: '700',
        letterSpacing: 1,
    },
    userCardFooter: {
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.sand,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    lockedNotice: {
        color: colors.bronze,
        fontSize: 11,
        fontStyle: 'italic',
    },
    editRoleButton: {
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        backgroundColor: colors.ivoryWarm,
    },
    editRoleButtonText: {
        color: colors.atelierBlack,
        fontSize: 12,
        fontWeight: '600',
    },
    editRoleBox: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.sand,
        backgroundColor: colors.ivoryWarm,
        padding: 14,
        borderRadius: 4,
    },
    editRoleTitle: {
        color: colors.atelierBlack,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 10,
    },
    roleSelectorRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    roleOptButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
    },
    roleOptButtonActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    roleOptText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    roleOptTextActive: {
        color: colors.champagneGold,
        fontWeight: '700',
    },
    confirmPrompt: {
        color: colors.textSecondary,
        fontSize: 12,
        marginBottom: 14,
        fontStyle: 'italic',
    },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    confirmButton: {
        flex: 1,
        backgroundColor: colors.atelierBlack,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 4,
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    cancelButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: '#FFFFFF',
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 4,
    },
    cancelButtonText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
    sectionTitleSecondary: {
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        fontSize: 22,
        marginTop: 8,
        marginBottom: 14,
    },
    moduleCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 20,
        borderRadius: 4,
        marginBottom: 24,
    },
    moduleCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    moduleTitle: {
        color: colors.atelierBlack,
        fontSize: 16,
        fontWeight: '600',
    },
    pendingBadge: {
        backgroundColor: colors.ivoryWarm,
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 3,
    },
    pendingBadgeText: {
        color: colors.bronze,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
    },
    activeBadge: {
        backgroundColor: colors.successBg,
        borderWidth: 1,
        borderColor: colors.successBorder,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 2,
    },
    activeBadgeText: {
        color: colors.success,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
        fontFamily: typography.sans,
    },
    openSettingsButton: {
        backgroundColor: colors.atelierBlack,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 2,
        alignItems: 'center',
        marginTop: 14,
    },
    openSettingsButtonText: {
        color: colors.ivoryWarm,
        fontFamily: typography.sans,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    navBar: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    navItem: {
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: '#FFFFFF',
    },
    navItemActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.champagneGold,
    },
    navItemText: {
        fontFamily: typography.sans,
        fontSize: 12,
        fontWeight: '600',
        color: colors.atelierBlack,
        letterSpacing: 0.5,
    },
    navItemTextActive: {
        color: colors.ivoryWarm,
    },
    moduleDescription: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 19,
    },
    signOutButton: {
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        alignItems: 'center',
        borderRadius: 4,
        marginTop: 10,
    },
    signOutText: {
        color: colors.bronze,
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    userActionButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deleteUserButton: {
        borderWidth: 1,
        borderColor: '#FCA5A5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        backgroundColor: '#FEF2F2',
    },
    deleteUserButtonText: {
        color: '#DC2626',
        fontSize: 12,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 24,
        width: '100%',
        maxWidth: 460,
    },
    modalHeader: {
        marginBottom: 14,
    },
    modalBadge: {
        color: '#DC2626',
        fontFamily: typography.sans,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 6,
    },
    modalTitle: {
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        fontSize: 20,
        fontWeight: '600',
    },
    modalDescription: {
        color: colors.atelierBlack,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 10,
    },
    modalHighlight: {
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    modalWarning: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 20,
        fontStyle: 'italic',
    },
    modalActions: {
        flexDirection: 'column',
        gap: 10,
    },
    modalDeleteButton: {
        backgroundColor: '#DC2626',
        paddingVertical: 12,
        borderRadius: 4,
        alignItems: 'center',
    },
    modalDeleteButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    modalCancelButton: {
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: '#FFFFFF',
        paddingVertical: 11,
        borderRadius: 4,
        alignItems: 'center',
    },
    modalCancelButtonText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    sectionTitleContainer: {
        flex: 1,
        marginRight: 12,
    },
    sectionActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    createUserButton: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    createUserButtonText: {
        color: colors.champagneGold,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    createModalScroll: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 24,
    },
    createModalCard: {
        maxWidth: 500,
    },
    createModalBadge: {
        color: colors.champagneGold,
        fontFamily: typography.sans,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 6,
    },
    createModalSubtitle: {
        color: colors.textSecondary,
        fontSize: 13,
        marginTop: 4,
        lineHeight: 18,
    },
    createErrorBox: {
        backgroundColor: colors.errorBg,
        borderColor: colors.errorBorder,
        borderWidth: 1,
        borderRadius: 4,
        padding: 10,
        marginBottom: 14,
    },
    createErrorText: {
        color: colors.error,
        fontSize: 12,
        lineHeight: 16,
    },
    createFormGroup: {
        marginBottom: 14,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    createInputLabel: {
        color: colors.atelierBlack,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
    },
    togglePasswordText: {
        color: colors.champagneGold,
        fontSize: 11,
        fontWeight: '600',
    },
    createTextInput: {
        backgroundColor: colors.ivoryWarm,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        color: colors.atelierBlack,
    },
    rolePickerRow: {
        flexDirection: 'row',
        gap: 8,
    },
    rolePickerOption: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
        paddingVertical: 10,
        paddingHorizontal: 8,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    rolePickerOptionActive: {
        borderColor: colors.champagneGold,
        backgroundColor: colors.atelierBlack,
    },
    rolePickerOptionText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 2,
    },
    rolePickerOptionTextActive: {
        color: colors.champagneGold,
    },
    rolePickerOptionDesc: {
        fontSize: 10,
        color: colors.textMuted,
        textAlign: 'center',
    },
    modalSubmitButton: {
        backgroundColor: colors.atelierBlack,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingVertical: 12,
        borderRadius: 4,
        alignItems: 'center',
    },
    modalSubmitButtonText: {
        color: colors.champagneGold,
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
