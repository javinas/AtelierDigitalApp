// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: PALETA CROMÁTICA Y ACABADOS TEXTILES (M04)
// Archivo: src/components/design/ColorPaletteSection.tsx
// ==============================================================================

import React, { useState } from 'react';
import {
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    ColorFinishType,
    ColorRoleType,
    MoodboardColorSwatch,
} from '../../types/design';
import { SIGNATURE_COLOR_PALETTES } from '../../services/designMockData';
import { designStyles as styles } from './designStyles';

export interface ColorPaletteSectionProps {
    palette: MoodboardColorSwatch[];
    onUpdatePalette: (newPalette: MoodboardColorSwatch[]) => void;
}

const FINISH_LABELS: Record<ColorFinishType, string> = {
    silk_sheen: 'Brillo Seda',
    satin: 'Satén Duchesse',
    matte: 'Crepé Mate',
    metallic: 'Hilo Metálico',
    translucent: 'Tul Ilusión',
    velvet: 'Terciopelo',
};

const ROLE_LABELS: Record<ColorRoleType, string> = {
    primary: 'Tela Principal',
    secondary: 'Contraste',
    accent: 'Acento Sastre',
    lining: 'Forrería Seda',
    embroidery: 'Bordado / Pedrería',
};

const PRESET_HEX_SWATCHES = [
    { name: 'Marfil Imperial', hex: '#F7F2E7' },
    { name: 'Oro Florentino', hex: '#C5A880' },
    { name: 'Negro Azabache', hex: '#171411' },
    { name: 'Rosa Ceniza', hex: '#D8B4A6' },
    { name: 'Terracota Seda', hex: '#9E4738' },
    { name: 'Verde Esmeralda Real', hex: '#234B3C' },
    { name: 'Azul Medianoche', hex: '#1E293B' },
    { name: 'Vino Barroco', hex: '#5E2129' },
];

export const ColorPaletteSection: React.FC<ColorPaletteSectionProps> = ({
    palette,
    onUpdatePalette,
}) => {
    const [isAddingSwatch, setIsAddingSwatch] = useState<boolean>(false);
    const [newName, setNewName] = useState<string>('Rosa Ceniza Seda');
    const [newHex, setNewHex] = useState<string>('#D8B4A6');
    const [newFinish, setNewFinish] = useState<ColorFinishType>('silk_sheen');
    const [newRole, setNewRole] = useState<ColorRoleType>('primary');

    const handleApplySignaturePalette = (swatches: MoodboardColorSwatch[]) => {
        const cloned = swatches.map((s, idx) => ({
            ...s,
            id: `sw-${Date.now()}-${idx}`,
        }));
        onUpdatePalette(cloned);
    };

    const handleAddCustomSwatch = () => {
        if (!newName.trim()) return;
        const cleanHex = newHex.trim().startsWith('#') ? newHex.trim() : `#${newHex.trim()}`;
        const item: MoodboardColorSwatch = {
            id: `sw-${Date.now()}`,
            name: newName.trim(),
            hex: cleanHex || '#C5A880',
            finish: newFinish,
            role: newRole,
        };
        onUpdatePalette([...palette, item]);
        setIsAddingSwatch(false);
    };

    const handleRemoveSwatch = (id: string) => {
        onUpdatePalette(palette.filter((s) => s.id !== id));
    };

    return (
        <View style={styles.paletteBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <View>
                    <Text style={styles.eyebrowGold}>✦ ARMONÍA CROMÁTICA & TEXTURAS</Text>
                    <Text style={{ fontFamily: 'serif', fontSize: 15, fontWeight: '700', color: '#171411', marginTop: 2 }}>
                        Paleta de Color de la Creación ({palette.length} tonos)
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.outlineBtn}
                    onPress={() => setIsAddingSwatch(!isAddingSwatch)}
                >
                    <Text style={styles.outlineBtnText}>
                        {isAddingSwatch ? '✕ Cerrar Selector' : '+ Añadir Tono Textil'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Selector rápido de Paletas de Colección de la Casa */}
            <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 11, color: '#8A7E72', fontWeight: '600', marginBottom: 6 }}>
                    Cargar armonía de autor By Katherine Carroll:
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {SIGNATURE_COLOR_PALETTES.map((sig) => (
                        <TouchableOpacity
                            key={sig.id}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#FAF8F5',
                                borderWidth: 1,
                                borderColor: '#E6D9C8',
                                borderRadius: 8,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                gap: 6,
                            }}
                            onPress={() => handleApplySignaturePalette(sig.swatches)}
                        >
                            <View style={{ flexDirection: 'row' }}>
                                {sig.swatches.slice(0, 3).map((sw) => (
                                    <View
                                        key={sw.id}
                                        style={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: 6,
                                            backgroundColor: sw.hex,
                                            borderWidth: 1,
                                            borderColor: '#D6C7B2',
                                            marginRight: -3,
                                        }}
                                    />
                                ))}
                            </View>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#4A4036', marginLeft: 4 }}>
                                {sig.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Formulario desplegable para nuevo tono */}
            {isAddingSwatch && (
                <View style={{ backgroundColor: '#FAF8F5', borderWidth: 1, borderColor: '#E6D9C8', borderRadius: 10, padding: 14, marginTop: 12 }}>
                    <Text style={styles.formLabel}>Tonos Clásicos de Alta Costura (Clic para elegir):</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                        {PRESET_HEX_SWATCHES.map((preset) => (
                            <TouchableOpacity
                                key={preset.hex}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: newHex === preset.hex ? '#171411' : '#FFFFFF',
                                    borderWidth: 1,
                                    borderColor: '#E6D9C8',
                                    borderRadius: 6,
                                    paddingHorizontal: 8,
                                    paddingVertical: 5,
                                    gap: 6,
                                }}
                                onPress={() => {
                                    setNewName(preset.name);
                                    setNewHex(preset.hex);
                                }}
                            >
                                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: preset.hex, borderWidth: 1, borderColor: '#CCC' }} />
                                <Text style={{ fontSize: 11, fontWeight: '600', color: newHex === preset.hex ? '#FAF8F5' : '#171411' }}>
                                    {preset.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                        <View style={{ flex: 2, minWidth: 180 }}>
                            <Text style={styles.formLabel}>Nombre Poético / Textil</Text>
                            <TextInput
                                style={styles.formInput}
                                value={newName}
                                onChangeText={setNewName}
                                placeholder="Ej: Marfil Mikado"
                            />
                        </View>
                        <View style={{ flex: 1, minWidth: 110 }}>
                            <Text style={styles.formLabel}>Código HEX</Text>
                            <TextInput
                                style={styles.formInput}
                                value={newHex}
                                onChangeText={setNewHex}
                                placeholder="#C5A880"
                            />
                        </View>
                    </View>

                    <Text style={styles.formLabel}>Acabado Superficial de la Tela</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {(Object.keys(FINISH_LABELS) as ColorFinishType[]).map((fin) => (
                            <TouchableOpacity
                                key={fin}
                                style={[
                                    styles.archOptionChip,
                                    newFinish === fin && styles.archOptionChipActive,
                                ]}
                                onPress={() => setNewFinish(fin)}
                            >
                                <Text style={[styles.archOptionChipText, newFinish === fin && styles.archOptionChipTextActive]}>
                                    {FINISH_LABELS[fin]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.formLabel}>Rol en la Prenda</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {(Object.keys(ROLE_LABELS) as ColorRoleType[]).map((r) => (
                            <TouchableOpacity
                                key={r}
                                style={[
                                    styles.archOptionChip,
                                    newRole === r && styles.archOptionChipActive,
                                ]}
                                onPress={() => setNewRole(r)}
                            >
                                <Text style={[styles.archOptionChipText, newRole === r && styles.archOptionChipTextActive]}>
                                    {ROLE_LABELS[r]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                        <TouchableOpacity style={styles.outlineBtn} onPress={() => setIsAddingSwatch(false)}>
                            <Text style={styles.outlineBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.goldBtn} onPress={handleAddCustomSwatch}>
                            <Text style={styles.goldBtnText}>✓ Fijar Tono en Paleta</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Muestras activas */}
            <View style={styles.swatchesRow}>
                {palette.map((sw) => (
                    <View key={sw.id} style={styles.swatchCard}>
                        <View style={[styles.swatchCircle, { backgroundColor: sw.hex }]} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.swatchName}>{sw.name}</Text>
                            <Text style={styles.swatchMeta}>
                                {ROLE_LABELS[sw.role] || 'Tela'} · {FINISH_LABELS[sw.finish] || 'Seda'} ({sw.hex})
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => handleRemoveSwatch(sw.id)}
                            style={{ padding: 4 }}
                        >
                            <Text style={{ fontSize: 12, color: '#9E3B3B', fontWeight: '700' }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        </View>
    );
};

