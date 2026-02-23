import { Ionicons } from '@expo/vector-icons';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';

interface AppHeaderProps {
  title: string;
  onBack?: () => void;
  showBackButton?: boolean;
  actions?: Array<{
    icon: string;
    onPress: () => void;
    color?: string;
    size?: number;
  }>;
}

export default function AppHeader({
  title,
  onBack,
  showBackButton = true,
  actions = []
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  // Limitar a máximo 3 acciones
  const displayActions = actions.slice(0, 3);

  return (
    <View style={[
      styles.header,
      {
        paddingTop: insets.top + 8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
      },
    ]}>
      <StatusBar backgroundColor={Colors.tint} barStyle="light-content" />
      
      {/* Botón de regreso */}
      {showBackButton && onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ) : null}
      
      {/* Título alineado a la izquierda */}
      <Text style={[styles.headerText, { flex: 1, textAlign: 'left' }]}>
        {title}
      </Text>
      
      {/* Acciones alineadas a la derecha */}
      <View style={styles.actionsContainer}>
        {displayActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            onPress={action.onPress}
            style={styles.actionButton}
          >
            <Ionicons 
              name={action.icon as any} 
              size={action.size || 24} 
              color={action.color || "#fff"} 
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.tint,
    paddingBottom: 8,
  },
  backButton: {
    marginRight: 12,
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 12,
    padding: 4,
  },
});
