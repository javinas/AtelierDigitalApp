// ==============================================================================
// CABECERA EDITORIAL DE PERSONAS, GRUPOS Y JORNADAS
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React from 'react';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { styles } from './personGroupStyles';

interface PersonGroupHeaderProps {
    filteredPersonsCount: number;
    onOpenImport: () => void;
    onOpenExport: () => void;
    onOpenCreatePerson: () => void;
    onOpenCreateGroup: () => void;
    onOpenCreateCampaign: () => void;
}

export const PersonGroupHeader: React.FC<PersonGroupHeaderProps> = ({
    filteredPersonsCount,
    onOpenImport,
    onOpenExport,
    onOpenCreatePerson,
    onOpenCreateGroup,
    onOpenCreateCampaign,
}) => {
    return (
        <View style={styles.header}>
            <View style={{ flex: 1 }}>
                <Text style={styles.superTitle}>MÓDULO 02 · GESTIÓN ANATÓMICA Y JORNADAS</Text>
                <Text style={styles.title}>Personas, Grupos y Jornadas</Text>
                <Text style={styles.subtitle}>
                    Administre los sujetos medidos, núcleos y jornadas de captura masiva asociadas al responsable comercial.
                </Text>
            </View>

            <View style={styles.headerActionBtns}>
                <TouchableOpacity
                    style={styles.importHeaderBtn}
                    onPress={onOpenImport}
                    activeOpacity={0.85}
                >
                    <Text style={styles.importHeaderBtnText}>📥 Importar (Excel/PDF/Foto)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.exportHeaderBtn}
                    onPress={onOpenExport}
                    activeOpacity={0.85}
                >
                    <Text style={styles.exportHeaderBtnText}>📤 Exportar ({filteredPersonsCount})</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.primaryGoldBtn}
                    onPress={onOpenCreatePerson}
                    activeOpacity={0.85}
                >
                    <Text style={styles.primaryGoldBtnText}>+ Nueva Persona</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryDarkBtn}
                    onPress={onOpenCreateGroup}
                    activeOpacity={0.85}
                >
                    <Text style={styles.secondaryDarkBtnText}>+ Nuevo Grupo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.campaignHeaderBtn}
                    onPress={onOpenCreateCampaign}
                    activeOpacity={0.85}
                >
                    <Text style={styles.campaignHeaderBtnText}>+ Nueva Jornada</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

