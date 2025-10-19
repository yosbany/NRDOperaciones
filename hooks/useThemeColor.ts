/**
 * Hook para obtener colores del tema único de la aplicación
 */

import { Colors } from '../constants/Colors';

export function useThemeColor(
  props: { color?: string },
  colorName: keyof typeof Colors
) {
  const colorFromProps = props.color;

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[colorName];
  }
}
