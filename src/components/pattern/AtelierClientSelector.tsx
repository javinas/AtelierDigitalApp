// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: SELECTOR Y BUSCADOR DE CLIENTAS (OPCIÓN A PREMIUM)
// Archivo: src/components/pattern/AtelierClientSelector.tsx
// ==============================================================================
// Diseñado para talleres de alta costura con cientos de clientas:
// - Buscador en tiempo real por nombre, teléfono, ciudad o email
// - Lista ergonómica con avatares monograma, badges de estado y ciudad
// - Resumen táctil de la clienta seleccionada y preferencias de confección
// ==============================================================================

import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Client } from '../../types/client';
import { colors } from '../../theme/colors';

interface AtelierClientSelectorProps {
    clients: Client[];
    selectedClient: Client | null;
    onSelectClient: (client: Client) => void;
    loading?: boolean;
    onNewClientPress?: () => void;
    showSelectedSummary?: boolean;
}

export function AtelierClientSelector({
    clients,
    selectedClient,
    onSelectClient,
    loading = false,
    onNewClientPress,
    showSelectedSummary = true,
}: AtelierClientSelectorProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'recent'>('all');

    // Filtrado en memoria de alto rendimiento para cientos de clientas
    const filteredClients = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return clients.filter((client) => {
            if (filterStatus === 'active' && client.status !== 'active') return false;

            if (!query) return true;

            const nameMatch = (client.full_name || '').toLowerCase().includes(query);
            const cityMatch = (client.city || '').toLowerCase().includes(query);
            const phoneMatch = (client.phone || '').toLowerCase().includes(query);
            const emailMatch = (client.email || '').toLowerCase().includes(query);

            return nameMatch || cityMatch || phoneMatch || emailMatch;
        });
    }, [clients, searchQuery, filterStatus]);

    // Generador de iniciales para el monograma de alta costura
    const getInitials = (fullName: string): string => {
        if (!fullName) return 'KC';
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
        <View style={styles.cardContainer}>
            {/* Cabecera del Selector de Clientas */}
            <View style={styles.headerRow}>
                <View style={styles.headerTitles}>
                    <View style={styles.badgeRow}>
                        <Text style={styles.stepBadge}>PASO 1</Text>
                        <Text style={styles.counterBadge}>
                            {clients.length} {clients.length === 1 ? 'Clienta' : 'Clientas'}
                        </Text>
                    </View>
                    <Text style={styles.mainTitle}>CLIENTA DEL ATELIER</Text>
                    <Text style={styles.subtitle}>Directorio de Alta Costura</Text>
                </View>

                {onNewClientPress && (
                    <TouchableOpacity
                        style={styles.newClientBtn}
                        onPress={onNewClientPress}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.newClientBtnText}>+ Nueva</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Buscador en Tiempo Real */}
            <View style={styles.searchBoxContainer}>
                <View style={styles.searchIconWrap}>
                    <Text style={styles.searchIcon}>🔍</Text>
                </View>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nombre, ciudad, teléfono..."
                    placeholderTextColor="#8F877C"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity
                        onPress={() => setSearchQuery('')}
                        style={styles.clearSearchBtn}
                    >
                        <Text style={styles.clearSearchText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Filtros Rápidos (Todas / Activas / Recientes) */}
            <View style={styles.filterTabsRow}>
                <TouchableOpacity
                    style={[styles.filterTab, filterStatus === 'all' && styles.filterTabActive]}
                    onPress={() => setFilterStatus('all')}
                >
                    <Text
                        style={[
                            styles.filterTabText,
                            filterStatus === 'all' && styles.filterTabTextActive,
                        ]}
                    >
                        Todas ({clients.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterTab, filterStatus === 'active' && styles.filterTabActive]}
                    onPress={() => setFilterStatus('active')}
                >
                    <Text
                        style={[
                            styles.filterTabText,
                            filterStatus === 'active' && styles.filterTabTextActive,
                        ]}
                    >
                        Activas
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Lista Scrollable con soporte para cientos de registros */}
            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color="#C5A059" />
                    <Text style={styles.loadingText}>Cargando directorio de clientas...</Text>
                </View>
            ) : filteredClients.length === 0 ? (
                <View style={styles.emptyResultsBox}>
                    <Text style={styles.emptyResultsIcon}>🧵</Text>
                    <Text style={styles.emptyResultsTitle}>No se encontraron clientas</Text>
                    <Text style={styles.emptyResultsDesc}>
                        Prueba con otro término de búsqueda o registra una nueva clienta.
                    </Text>
                </View>
            ) : (
                <View style={styles.scrollWrapper}>
                    <ScrollView
                        style={styles.clientsScrollView}
                        contentContainerStyle={styles.clientsScrollContent}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                    >
                        {filteredClients.map((client) => {
                            const isSelected = selectedClient?.id === client.id;
                            const initials = getInitials(client.full_name);

                            return (
                                <TouchableOpacity
                                    key={client.id}
                                    style={[
                                        styles.clientRowCard,
                                        isSelected && styles.clientRowCardSelected,
                                    ]}
                                    onPress={() => onSelectClient(client)}
                                    activeOpacity={0.82}
                                >
                                    {/* Monograma Avatar */}
                                    <View
                                        style={[
                                            styles.avatarCircle,
                                            isSelected && styles.avatarCircleSelected,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.avatarText,
                                                isSelected && styles.avatarTextSelected,
                                            ]}
                                        >
                                            {initials}
                                        </Text>
                                    </View>

                                    {/* Información de la Clienta */}
                                    <View style={styles.clientDetailsCol}>
                                        <View style={styles.clientNameRow}>
                                            <Text
                                                style={[
                                                    styles.clientNameText,
                                                    isSelected && styles.clientNameTextSelected,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {client.full_name}
                                            </Text>
                                            {isSelected && (
                                                <View style={styles.selectedCheckBadge}>
                                                    <Text style={styles.selectedCheckText}>✓ ACTIVA</Text>
                                                </View>
                                            )}
                                        </View>

                                        <View style={styles.clientMetaRow}>
                                            {client.city ? (
                                                <Text style={styles.clientCityText}>
                                                    📍 {client.city}
                                                </Text>
                                            ) : null}
                                            {client.phone ? (
                                                <Text style={styles.clientPhoneText}>
                                                    📞 {client.phone}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* Ficha de la Clienta Seleccionada */}
            {showSelectedSummary && selectedClient && (
                <View style={styles.selectedSummaryCard}>
                    <View style={styles.selectedSummaryTop}>
                        <Text style={styles.selectedSummaryLabel}>CLIENTA SELECCIONADA</Text>
                        <Text style={styles.selectedSummaryName}>{selectedClient.full_name}</Text>
                    </View>
                    {selectedClient.style_preferences ? (
                        <View style={styles.selectedPrefBox}>
                            <Text style={styles.selectedPrefLabel}>Preferencias de Estilo:</Text>
                            <Text style={styles.selectedPrefText}>
                                {selectedClient.style_preferences}
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.selectedPrefEmpty}>
                            Sin preferencias de confección registradas.
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E6DFC8',
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 14px rgba(44, 39, 32, 0.05)',
            },
            default: {
                elevation: 2,
            },
        }),
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    headerTitles: {
        flex: 1,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    stepBadge: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        color: '#A78350',
        backgroundColor: '#FAF5EA',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E7D9B8',
        textTransform: 'uppercase',
    },
    counterBadge: {
        fontSize: 11,
        fontWeight: '600',
        color: '#7D7569',
    },
    mainTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F1E1C',
        letterSpacing: 0.8,
    },
    subtitle: {
        fontSize: 11,
        color: '#8A8275',
        marginTop: 1,
    },
    newClientBtn: {
        backgroundColor: '#2A2927',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    newClientBtnText: {
        color: '#FAF7F2',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    searchBoxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F6F1',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E4DCBD',
        paddingHorizontal: 10,
        height: 38,
        marginBottom: 8,
    },
    searchIconWrap: {
        marginRight: 6,
    },
    searchIcon: {
        fontSize: 13,
    },
    searchInput: {
        flex: 1,
        fontSize: 12,
        color: '#2A2723',
        paddingVertical: 0,
        ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
    },
    clearSearchBtn: {
        padding: 4,
    },
    clearSearchText: {
        fontSize: 12,
        color: '#9C9487',
        fontWeight: '700',
    },
    filterTabsRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 10,
    },
    filterTab: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 14,
        backgroundColor: '#F1EFEA',
    },
    filterTabActive: {
        backgroundColor: '#C5A059',
    },
    filterTabText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6E6659',
    },
    filterTabTextActive: {
        color: '#FFFFFF',
    },
    scrollWrapper: {
        borderWidth: 1,
        borderColor: '#EDE7D5',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#FDFBF7',
        marginBottom: 12,
    },
    clientsScrollView: {
        maxHeight: 220,
    },
    clientsScrollContent: {
        padding: 6,
        gap: 6,
    },
    clientRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ECE5D3',
        paddingVertical: 8,
        paddingHorizontal: 10,
        gap: 10,
    },
    clientRowCardSelected: {
        backgroundColor: '#FFFDF9',
        borderColor: '#C5A059',
        borderWidth: 1.5,
        ...Platform.select({
            web: {
                boxShadow: '0 2px 8px rgba(197, 160, 89, 0.16)',
            },
        }),
    },
    avatarCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#F5EFE1',
        borderWidth: 1,
        borderColor: '#E2D1AB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarCircleSelected: {
        backgroundColor: '#C5A059',
        borderColor: '#A78350',
    },
    avatarText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#7D632F',
        letterSpacing: 0.5,
    },
    avatarTextSelected: {
        color: '#FFFFFF',
    },
    clientDetailsCol: {
        flex: 1,
    },
    clientNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    clientNameText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#23211E',
    },
    clientNameTextSelected: {
        fontWeight: '700',
        color: '#7D632F',
    },
    selectedCheckBadge: {
        backgroundColor: '#EBF6EE',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#C3E2CC',
    },
    selectedCheckText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#28733E',
        letterSpacing: 0.4,
    },
    clientMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 2,
    },
    clientCityText: {
        fontSize: 11,
        color: '#8C8476',
    },
    clientPhoneText: {
        fontSize: 11,
        color: '#8C8476',
    },
    loadingBox: {
        paddingVertical: 30,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    loadingText: {
        fontSize: 12,
        color: '#8C8476',
    },
    emptyResultsBox: {
        paddingVertical: 26,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAF8F3',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EBE4D3',
        paddingHorizontal: 16,
    },
    emptyResultsIcon: {
        fontSize: 24,
        marginBottom: 6,
    },
    emptyResultsTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#3B362F',
        marginBottom: 2,
    },
    emptyResultsDesc: {
        fontSize: 11,
        color: '#8A8174',
        textAlign: 'center',
    },
    selectedSummaryCard: {
        backgroundColor: '#FAF7F0',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E6DCC5',
        padding: 10,
    },
    selectedSummaryTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    selectedSummaryLabel: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1,
        color: '#8C7749',
    },
    selectedSummaryName: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2B2720',
    },
    selectedPrefBox: {
        marginTop: 2,
    },
    selectedPrefLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#7D7568',
    },
    selectedPrefText: {
        fontSize: 11,
        fontStyle: 'italic',
        color: '#474136',
    },
    selectedPrefEmpty: {
        fontSize: 10,
        color: '#9C9588',
        fontStyle: 'italic',
    },
});
