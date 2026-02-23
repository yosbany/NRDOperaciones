import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FormFooterButtonsProps {
  onCancel: () => void;
  onSave: () => void;
  saveText?: string;
  saveIcon?: string;
  cancelText?: string;
  cancelIcon?: string;
  disabled?: boolean;
  loading?: boolean;
  additionalActions?: React.ReactNode;
  fixed?: boolean;
  /** Si true, los botones se muestran flotantes sobre el contenido (estilo FAB) */
  floating?: boolean;
  /** Si true, no se muestra el botón de guardar cuando disabled es true (evita mostrar "Crear (0)") */
  hideSaveWhenDisabled?: boolean;
  /** Si se pasa, reemplaza el botón de cancelar por este (ej: menú de tres puntos en edición) */
  customLeftButton?: React.ReactNode;
}

export default function FormFooterButtons({
  onCancel,
  onSave,
  saveText = 'Guardar',
  saveIcon = 'save-outline',
  cancelText,
  cancelIcon = 'close',
  disabled = false,
  loading = false,
  additionalActions,
  fixed = false,
  floating = true,
  hideSaveWhenDisabled = false,
  customLeftButton
}: FormFooterButtonsProps) {
  const showSaveButton = !(hideSaveWhenDisabled && disabled);
  const containerStyle = [
    styles.formFooterRow,
    fixed && styles.formFooterRowFixed,
    floating && styles.formFooterRowFloating
  ];
  const cancelBtnStyle = [
    styles.formFooterBtn,
    styles.formFooterBtnSecondary,
    floating && styles.formFooterBtnFloatingSecondary
  ];
  const saveBtnStyle = [
    styles.formFooterBtn,
    styles.formFooterBtnPrimary,
    disabled && { backgroundColor: '#ccc' },
    floating && styles.formFooterBtnFloatingPrimary
  ];

  return (
    <View style={containerStyle}>
      <View style={styles.leftActions}>
        {customLeftButton ?? (
          <TouchableOpacity
            style={cancelBtnStyle}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <View style={styles.formFooterBtnContent}>
              <Ionicons name={cancelIcon as any} size={24} color="#D7263D" />
              {cancelText && <Text style={styles.formFooterBtnTextSecondary}>{cancelText}</Text>}
            </View>
          </TouchableOpacity>
        )}
        {!customLeftButton && additionalActions}
      </View>
      
      {showSaveButton && (
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={saveBtnStyle}
            onPress={onSave}
            disabled={disabled || loading}
            activeOpacity={0.8}
          >
            <View style={styles.formFooterBtnContent}>
              <Ionicons 
                name={loading ? 'hourglass-outline' : saveIcon as any} 
                size={28} 
                color="#fff" 
                style={styles.formFooterBtnIcon} 
              />
              <Text style={styles.formFooterBtnText}>
                {loading ? 'Guardando...' : saveText}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  formFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  formFooterRowFixed: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  formFooterRowFloating: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  formFooterBtnFloatingSecondary: {
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minWidth: 56,
    borderWidth: 2,
    borderColor: '#D7263D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formFooterBtnFloatingPrimary: {
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 56,
    borderWidth: 2,
    borderColor: '#8b1c28',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formFooterBtn: {
    flex: 0,
    minWidth: 40,
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'transparent',
    flexShrink: 0,
    flexGrow: 0,
    flexBasis: 'auto',
    width: 'auto',
    maxWidth: 'none',
  },
  formFooterBtnPrimary: {
    backgroundColor: '#D7263D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  formFooterBtnSecondary: {
    flex: 0,
    minWidth: 40,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formFooterBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#fff',
    flexShrink: 0,
    numberOfLines: 1,
    lineHeight: 16,
  },
  formFooterBtnTextSecondary: {
    color: '#D7263D',
    fontWeight: 'bold',
    fontSize: 14,
    flexShrink: 0,
    flex: 0,
    flexGrow: 0,
    flexBasis: 'auto',
    numberOfLines: 1,
    width: 'auto',
    maxWidth: 'none',
    lineHeight: 16,
    alignSelf: 'flex-start',
  },
  formFooterBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    gap: 6,
  },
  formFooterBtnIcon: {
    flexShrink: 0,
  },
});
