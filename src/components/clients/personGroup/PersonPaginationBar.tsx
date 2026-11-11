// ==============================================================================
// BARRA DE PAGINACIÓN DE PERSONAS
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React from 'react';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { styles } from './personGroupStyles';

interface PersonPaginationBarProps {
    safeCurrentPage: number;
    totalPages: number;
    onPrevPage: () => void;
    onNextPage: () => void;
}

export const PersonPaginationBar: React.FC<PersonPaginationBarProps> = ({
    safeCurrentPage,
    totalPages,
    onPrevPage,
    onNextPage,
}) => {
    if (totalPages <= 1) return null;

    return (
        <View style={styles.paginationRow}>
            <TouchableOpacity
                style={[styles.pageNavBtn, safeCurrentPage === 1 && styles.pageNavBtnDisabled]}
                disabled={safeCurrentPage === 1}
                onPress={onPrevPage}
            >
                <Text style={[styles.pageNavBtnText, safeCurrentPage === 1 && styles.pageNavBtnTextDisabled]}>
                    ← Anterior
                </Text>
            </TouchableOpacity>

            <Text style={styles.paginationInfoText}>
                Página <Text style={{ fontWeight: '700', color: colors.atelierBlack }}>{safeCurrentPage}</Text> de {totalPages}
            </Text>

            <TouchableOpacity
                style={[styles.pageNavBtn, safeCurrentPage === totalPages && styles.pageNavBtnDisabled]}
                disabled={safeCurrentPage === totalPages}
                onPress={onNextPage}
            >
                <Text style={[styles.pageNavBtnText, safeCurrentPage === totalPages && styles.pageNavBtnTextDisabled]}>
                    Siguiente →
                </Text>
            </TouchableOpacity>
        </View>
    );
};

