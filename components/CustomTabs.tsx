import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';

// Importar las pantallas directamente
import ContactosScreen from '../app/(tabs)/contactos';
import CostosScreen from '../app/(tabs)/costos';
import InicioScreen from '../app/(tabs)/index';
import OrdenesScreen from '../app/(tabs)/ordenes';
import ProductosScreen from '../app/(tabs)/productos';

interface CustomTabsProps {
  userData: any;
}

export default function CustomTabs({ userData }: CustomTabsProps) {
  const [activeTab, setActiveTab] = useState('inicio');
  const insets = useSafeAreaInsets();

  const tabs = [
    { id: 'inicio', title: 'Inicio', icon: 'home-outline', component: InicioScreen },
    { id: 'ordenes', title: 'Órdenes', icon: 'list-outline', component: OrdenesScreen },
    { id: 'productos', title: 'Productos', icon: 'cube-outline', component: ProductosScreen },
    { id: 'contactos', title: 'Contactos', icon: 'people-outline', component: ContactosScreen },
    { id: 'costos', title: 'Costos', icon: 'calculator-outline', component: CostosScreen },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {ActiveComponent && <ActiveComponent />}
      </View>
      
      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={24}
              color={activeTab === tab.id ? Colors.tint : '#666'}
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.activeTabText
            ]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(215, 38, 61, 0.1)',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activeTabText: {
    color: Colors.tint,
    fontWeight: '600',
  },
});
