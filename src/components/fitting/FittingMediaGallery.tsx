// ==============================================================================
// ATELIER DIGITAL — MÓDULO 06: GALERÍA DE EVIDENCIA MULTIMEDIA DE PRUEBA
// Archivo: src/components/fitting/FittingMediaGallery.tsx
// ==============================================================================
// Visor y galería privada de fotos de calce y actas de entrega, con URLs firmadas,
// preview modal, confirmación de borrado seguro y sellado inmutable.
// ==============================================================================

import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CommercialMediaAsset } from '../../types/commercial';
import { FittingSession } from '../../types/fitting';
import {
    deleteFittingMediaAsset,
    uploadFittingMediaAsset,
} from '../../services/fittingService';
import { formatFittingDate } from './fittingLabels';
import { fittingStyles as styles } from './fittingStyles';

export interface FittingMediaGalleryProps {
    session: FittingSession;
    mediaAssets: CommercialMediaAsset[];
    signedUrls?: Record<string, string | null>;
    onMediaUpdated?: () => void;
}

export const FittingMediaGallery: React.FC<FittingMediaGalleryProps> = ({
    session,
    mediaAssets,
    signedUrls = {},
    onMediaUpdated,
}) => {
    const [selectedAsset, setSelectedAsset] = useState<CommercialMediaAsset | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isSealed =
        session.status === 'approved' ||
        session.status === 'cancelled' ||
        Boolean(session.delivery_confirmed_at);

    const handlePickAndUpload = async () => {
        if (isSealed) return;
        setErrorMessage(null);

        try {
            const permRes = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permRes.granted) {
                setErrorMessage('Permiso denegado para acceder a la galería de fotos.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.85,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const picked = result.assets[0];
            setIsUploading(true);

            const uploadRes = await uploadFittingMediaAsset({
                creationId: session.creation_id,
                sessionId: session.id,
                expectedSessionRowVersion: session.row_version,
                assetType: 'fitting_photo',
                fileUri: picked.uri,
                fileName: picked.fileName || `fitting_${Date.now()}.jpg`,
                mimeType: picked.mimeType || 'image/jpeg',
                fileSizeBytes: picked.fileSize || null,
                description: `Fotografía de calce · ${session.title}`,
            });

            setIsUploading(false);

            if (uploadRes.error) {
                setErrorMessage(uploadRes.error.message);
                return;
            }

            if (onMediaUpdated) {
                onMediaUpdated();
            }
        } catch (err: unknown) {
            setIsUploading(false);
            const msg = err instanceof Error ? err.message : 'Error al adjuntar fotografía de prueba.';
            setErrorMessage(msg);
        }
    };

    const handleDelete = async (asset: CommercialMediaAsset) => {
        if (isSealed) return;
        setErrorMessage(null);
        setIsDeleting(asset.id);

        try {
            const delRes = await deleteFittingMediaAsset({
                assetId: asset.id,
                sessionId: session.id,
                expectedSessionRowVersion: session.row_version,
                idempotencyKey: `del_${asset.id.slice(0, 8)}_${Date.now()}`,
            });

            setIsDeleting(null);

            if (delRes.error) {
                setErrorMessage(delRes.error.message);
                return;
            }

            if (selectedAsset?.id === asset.id) {
                setSelectedAsset(null);
            }

            if (onMediaUpdated) {
                onMediaUpdated();
            }
        } catch (err: unknown) {
            setIsDeleting(null);
            const msg = err instanceof Error ? err.message : 'Error al retirar activo multimedia.';
            setErrorMessage(msg);
        }
    };

    return (
        <View style={{ marginVertical: 8 }}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={[styles.metaLabel, { marginBottom: 2 }]}>Evidencia Fotográfica & Soportes</Text>
                    <Text style={styles.subtitleEditorial}>
                        {mediaAssets.length} archivo(s) registrado(s) en Storage privado
                    </Text>
                </View>

                {!isSealed && (
                    <TouchableOpacity
                        style={[styles.secondaryBtn, { minHeight: 34, paddingVertical: 6 }, isUploading && styles.disabledBtn]}
                        disabled={isUploading}
                        onPress={handlePickAndUpload}
                        activeOpacity={0.8}
                    >
                        {isUploading ? (
                            <ActivityIndicator size="small" color="#A78350" />
                        ) : (
                            <Text style={styles.secondaryBtnText}>+ Adjuntar Fotografía</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {/* Banner de error inline */}
            {errorMessage && (
                <View style={[styles.feedbackBanner, styles.errorBanner]}>
                    <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
                    <TouchableOpacity
                        style={styles.bannerDismissBtn}
                        onPress={() => setErrorMessage(null)}
                    >
                        <Text style={styles.bannerDismissText}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Cuadrícula de fotos */}
            {mediaAssets.length === 0 ? (
                <View style={[styles.notesBlock, { marginVertical: 4 }]}>
                    <Text style={[styles.notesText, { color: '#766B62' }]}>
                        No hay fotografías adjuntas a esta prueba de vestuario.
                    </Text>
                </View>
            ) : (
                <View style={styles.mediaGrid}>
                    {mediaAssets.map((asset) => {
                        const signedUrl = signedUrls[asset.file_path] || null;
                        const isPdf = asset.file_name.toLowerCase().endsWith('.pdf');
                        const isDeletingThis = isDeleting === asset.id;

                        return (
                            <View key={asset.id} style={styles.mediaThumbnail}>
                                <TouchableOpacity
                                    style={{ flex: 1 }}
                                    onPress={() => setSelectedAsset(asset)}
                                    activeOpacity={0.85}
                                >
                                    {isPdf ? (
                                        <View style={styles.mediaDocPlaceholder}>
                                            <Text style={styles.mediaDocIcon}>📄</Text>
                                            <Text style={styles.mediaDocLabel} numberOfLines={2}>
                                                {asset.file_name}
                                            </Text>
                                        </View>
                                    ) : signedUrl ? (
                                        <Image
                                            source={{ uri: signedUrl }}
                                            style={styles.mediaImage}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={styles.mediaDocPlaceholder}>
                                            <Text style={styles.mediaDocIcon}>🖼️</Text>
                                            <Text style={styles.mediaDocLabel} numberOfLines={2}>
                                                {asset.file_name}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                {/* Botón de borrado seguro con confirmación */}
                                {!isSealed && (
                                    <TouchableOpacity
                                        style={styles.mediaDeleteButton}
                                        disabled={isDeletingThis}
                                        onPress={() => handleDelete(asset)}
                                        activeOpacity={0.8}
                                    >
                                        {isDeletingThis ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <Text style={styles.mediaDeleteButtonText}>✕</Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Modal de visualización / zoom en alta resolución */}
            <Modal
                visible={Boolean(selectedAsset)}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedAsset(null)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalContainer, { maxWidth: 520 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {selectedAsset?.asset_type === 'delivery_note' ? 'Acta de Entrega' : 'Fotografía de Calce'}
                            </Text>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setSelectedAsset(null)}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.modalBody, { alignItems: 'center' }]}>
                            {selectedAsset && (
                                <>
                                    {selectedAsset.file_name.toLowerCase().endsWith('.pdf') ? (
                                        <View style={{ padding: 30, alignItems: 'center' }}>
                                            <Text style={{ fontSize: 48, marginBottom: 12 }}>📄</Text>
                                            <Text style={[styles.titleEditorial, { textAlign: 'center' }]}>
                                                Documento PDF Protegido
                                            </Text>
                                            <Text style={[styles.subtitleEditorial, { textAlign: 'center', marginTop: 4 }]}>
                                                {selectedAsset.file_name}
                                            </Text>
                                        </View>
                                    ) : signedUrls[selectedAsset.file_path] ? (
                                        <Image
                                            source={{ uri: signedUrls[selectedAsset.file_path] || '' }}
                                            style={{ width: '100%', height: 320, borderRadius: 6 }}
                                            resizeMode="contain"
                                        />
                                    ) : (
                                        <Text style={styles.notesText}>Cargando vista previa segura...</Text>
                                    )}

                                    <View style={{ width: '100%', marginTop: 14 }}>
                                        <Text style={styles.metaLabel}>Archivo:</Text>
                                        <Text style={styles.metaValue}>{selectedAsset.file_name}</Text>
                                        <Text style={[styles.traceabilityText, { marginTop: 4 }]}>
                                            Registrado el {formatFittingDate(selectedAsset.created_at)}
                                            {selectedAsset.description ? ` · "${selectedAsset.description}"` : ''}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>

                        <View style={styles.modalFooter}>
                            {!isSealed && selectedAsset && (
                                <TouchableOpacity
                                    style={styles.dangerBtn}
                                    onPress={() => handleDelete(selectedAsset)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.dangerBtnText}>Retirar de Prueba</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.secondaryBtn}
                                onPress={() => setSelectedAsset(null)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.secondaryBtnText}>Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

