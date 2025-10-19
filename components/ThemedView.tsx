import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '../hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  backgroundColor?: string;
};

export function ThemedView({ style, backgroundColor: customBackgroundColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ color: customBackgroundColor }, 'background');

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
