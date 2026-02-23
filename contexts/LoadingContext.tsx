import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';

interface LoadingContextType {
  showLoading: () => void;
  hideLoading: () => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const showLoading = useCallback(() => setCount(c => c + 1), []);
  const hideLoading = useCallback(() => setCount(c => Math.max(0, c - 1)), []);
  const isLoading = count > 0;

  const value = useMemo(
    () => ({ showLoading, hideLoading, isLoading }),
    [showLoading, hideLoading, isLoading]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <Modal visible={isLoading} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.box}>
            <ActivityIndicator size="large" color="#D7263D" />
          </View>
        </View>
      </Modal>
    </LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextType {
  const ctx = useContext(LoadingContext);
  if (ctx === undefined) throw new Error('useLoading must be used within LoadingProvider');
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
