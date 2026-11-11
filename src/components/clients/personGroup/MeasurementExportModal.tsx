import React from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
} from 'react-native';
import { styles } from './personGroupStyles';

interface MeasurementExportModalProps {
    visible: boolean;
    count: number;
    onExportExcel: () => void;
    onExportCSV: () => void;
    onDownloadTemplate: () => void;
    onClose: () => void;
}

export const MeasurementExportModal: React.FC<MeasurementExportModalProps> = ({
    visible,
    count,
    onExportExcel,
    onExportCSV,
    onDownloadTemplate,
    onClose,
}) => {
    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={[styles.modalDialog, { maxWidth: 540 }]}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Exportar Personas y Medidas</Text>
                            <Text style={styles.modalSub}>
                                {count} personas seleccionadas según los filtros actuales
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ padding: 20, gap: 14 }}>
                        <TouchableOpacity
                            style={styles.exportOptionCard}
                            onPress={onExportExcel}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.exportOptionIcon}>📊</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.exportOptionTitle}>Excel Profesional Estilizado (.xls)</Text>
                                <Text style={styles.exportOptionDesc}>
                                    Libro formateado con membrete de Alta Costura Katherine Carroll, encabezados dorados, bordes y columnas anatómicas ordenadas.
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.exportOptionCard}
                            onPress={onExportCSV}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.exportOptionIcon}>📄</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.exportOptionTitle}>Archivo de Datos Crudos (.csv)</Text>
                                <Text style={styles.exportOptionDesc}>
                                    Compatible con cualquier hoja de cálculo o sistema externo, delimitado por comas con codificación UTF-8 BOM.
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.exportOptionCard, { borderColor: '#E0D2C0' }]}
                            onPress={onDownloadTemplate}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.exportOptionIcon}>📥</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.exportOptionTitle}>Descargar Plantilla Oficial en Blanco (.xls)</Text>
                                <Text style={styles.exportOptionDesc}>
                                    Plantilla vacía con instrucciones y ejemplos para enviar a colegios, empresas o familias antes de la toma de medidas.
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.modalCancelBtn}
                            onPress={onClose}
                        >
                            <Text style={styles.modalCancelBtnText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

