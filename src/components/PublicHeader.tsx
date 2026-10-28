import React, { useState } from 'react';
import {
    Image,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface PublicHeaderProps {
    currentRoute?: 'inicio' | 'diseno' | 'creacion' | 'exclusividad' | 'servicios' | 'contacto';
}

export default function PublicHeader({ currentRoute = 'inicio' }: PublicHeaderProps) {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 960;
    const { session, role, signOut } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { key: 'inicio', label: 'Inicio', route: '/' },
        { key: 'diseno', label: 'Diseño', route: '/diseno' },
        { key: 'creacion', label: 'Creación', route: '/creacion' },
        { key: 'exclusividad', label: 'Exclusividad', route: '/exclusividad' },
        { key: 'servicios', label: 'Servicios', route: '/servicios' },
        { key: 'contacto', label: 'Contacto', route: '/contacto' },
    ];

    const handleNavigate = (route: string) => {
        setMobileMenuOpen(false);
        router.push(route as any);
    };

    const handleAuthAction = () => {
        setMobileMenuOpen(false);
        if (session) {
            if (role === 'designer') {
                router.push('/(designer)');
            } else {
                router.push('/(client)');
            }
        } else {
            router.push('/(auth)/login');
        }
    };

    return (
        <View style={styles.headerWrapper}>
            <View style={styles.container}>
                {/* Brand / Logo */}
                <TouchableOpacity
                    style={styles.brandContainer}
                    onPress={() => handleNavigate('/')}
                    activeOpacity={0.85}
                >
                    <Image
                        source={require('../../assets/logo_transparent.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.brandSubtitle}>ATELIER DE AUTOR</Text>
                </TouchableOpacity>

                {/* Desktop Navigation Links */}
                {isDesktop ? (
                    <View style={styles.desktopNav}>
                        <View style={styles.linksRow}>
                            {navItems.map((item) => {
                                const isActive = currentRoute === item.key;
                                return (
                                    <TouchableOpacity
                                        key={item.key}
                                        style={[styles.navLink, isActive && styles.navLinkActive]}
                                        onPress={() => handleNavigate(item.route)}
                                        activeOpacity={0.7}
                                    >
                                        <Text
                                            style={[
                                                styles.navLinkText,
                                                isActive && styles.navLinkTextActive,
                                            ]}
                                        >
                                            {item.label}
                                        </Text>
                                        {isActive && <View style={styles.activeUnderline} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Auth actions in Header */}
                        <View style={styles.desktopAuthActions}>
                            {session ? (
                                <>
                                    <TouchableOpacity
                                        style={styles.atelierButton}
                                        onPress={handleAuthAction}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.atelierButtonText}>
                                            {role === 'designer' ? 'ATELIER DISEÑO' : 'MI ESPACIO'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.logoutButton}
                                        onPress={() => signOut()}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.logoutButtonText}>Salir</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={styles.registerTextBtn}
                                        onPress={() => handleNavigate('/(auth)/register')}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.registerTextBtnLabel}>CREAR CUENTA</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.atelierButton}
                                        onPress={() => handleNavigate('/(auth)/login')}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.atelierButtonText}>ACCESO AL ATELIER</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                ) : (
                    /* Mobile Toggle Button */
                    <TouchableOpacity
                        style={styles.mobileMenuToggle}
                        onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
                        activeOpacity={0.7}
                        accessibilityLabel="Abrir menú de navegación"
                    >
                        <Text style={styles.mobileMenuToggleIcon}>
                            {mobileMenuOpen ? '✕' : '☰'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Mobile Dropdown Modal */}
            {!isDesktop && mobileMenuOpen && (
                <View style={styles.mobileMenuDropdown}>
                    <View style={styles.mobileLinksList}>
                        {navItems.map((item) => {
                            const isActive = currentRoute === item.key;
                            return (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[
                                        styles.mobileNavLink,
                                        isActive && styles.mobileNavLinkActive,
                                    ]}
                                    onPress={() => handleNavigate(item.route)}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[
                                            styles.mobileNavLinkText,
                                            isActive && styles.mobileNavLinkTextActive,
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    {isActive && <Text style={styles.mobileActiveDot}>◆</Text>}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.mobileDivider} />

                    <View style={styles.mobileAuthBox}>
                        {session ? (
                            <>
                                <TouchableOpacity
                                    style={styles.mobilePrimaryBtn}
                                    onPress={handleAuthAction}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.mobilePrimaryBtnText}>
                                        {role === 'designer' ? 'IR AL ATELIER DISEÑADORA' : 'IR A MI ESPACIO DE CLIENTA'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.mobileSecondaryBtn}
                                    onPress={() => {
                                        setMobileMenuOpen(false);
                                        signOut();
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.mobileSecondaryBtnText}>CERRAR SESIÓN</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={styles.mobilePrimaryBtn}
                                    onPress={() => handleNavigate('/(auth)/login')}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.mobilePrimaryBtnText}>ACCESO AL ATELIER</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.mobileSecondaryBtn}
                                    onPress={() => handleNavigate('/(auth)/register')}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.mobileSecondaryBtnText}>CREAR CUENTA CLIENTA</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    headerWrapper: {
        backgroundColor: '#171411',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(167, 131, 80, 0.25)',
        zIndex: 50,
        position: 'relative',
    },
    container: {
        maxWidth: 1360,
        marginHorizontal: 'auto',
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 14,
    },
    brandContainer: {
        alignItems: 'flex-start',
    },
    logoImage: {
        width: 155,
        height: 38,
    },
    brandSubtitle: {
        color: colors.champagneGold,
        fontSize: 8.5,
        letterSpacing: 3,
        fontWeight: '700',
        marginTop: 3,
        marginLeft: 2,
        fontFamily: typography.sans,
    },
    desktopNav: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 32,
    },
    linksRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
    },
    navLink: {
        paddingVertical: 8,
        paddingHorizontal: 4,
        position: 'relative',
    },
    navLinkActive: {},
    navLinkText: {
        color: '#D4C8B8',
        fontSize: 13.5,
        letterSpacing: 0.8,
        fontWeight: '500',
        fontFamily: typography.sans,
    },
    navLinkTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    activeUnderline: {
        position: 'absolute',
        bottom: 0,
        left: 4,
        right: 4,
        height: 2,
        backgroundColor: colors.champagneGold,
        borderRadius: 1,
    },
    desktopAuthActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginLeft: 12,
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(167, 131, 80, 0.3)',
        paddingLeft: 20,
    },
    registerTextBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    registerTextBtnLabel: {
        color: '#D4C8B8',
        fontSize: 11.5,
        letterSpacing: 1.5,
        fontWeight: '600',
        fontFamily: typography.sans,
    },
    atelierButton: {
        backgroundColor: colors.champagneGold,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
    },
    atelierButtonText: {
        color: '#171411',
        fontSize: 11,
        letterSpacing: 1.5,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    logoutButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    logoutButtonText: {
        color: '#968A7E',
        fontSize: 11.5,
        fontFamily: typography.sans,
    },
    mobileMenuToggle: {
        padding: 8,
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.4)',
        borderRadius: 6,
    },
    mobileMenuToggleIcon: {
        color: colors.champagneGold,
        fontSize: 18,
        fontWeight: '600',
    },
    mobileMenuDropdown: {
        backgroundColor: '#1E1A16',
        borderTopWidth: 1,
        borderTopColor: 'rgba(167, 131, 80, 0.25)',
        paddingHorizontal: 24,
        paddingVertical: 18,
    },
    mobileLinksList: {
        gap: 6,
    },
    mobileNavLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    mobileNavLinkActive: {
        borderBottomColor: 'rgba(167, 131, 80, 0.4)',
    },
    mobileNavLinkText: {
        color: '#D4C8B8',
        fontSize: 15,
        fontFamily: typography.sans,
        letterSpacing: 0.5,
    },
    mobileNavLinkTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    mobileActiveDot: {
        color: colors.champagneGold,
        fontSize: 10,
    },
    mobileDivider: {
        height: 1,
        backgroundColor: 'rgba(167, 131, 80, 0.25)',
        marginVertical: 16,
    },
    mobileAuthBox: {
        gap: 10,
    },
    mobilePrimaryBtn: {
        backgroundColor: colors.champagneGold,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 4,
    },
    mobilePrimaryBtnText: {
        color: '#171411',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.5,
        fontFamily: typography.sans,
    },
    mobileSecondaryBtn: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 4,
    },
    mobileSecondaryBtnText: {
        color: colors.champagneGold,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.5,
        fontFamily: typography.sans,
    },
});
