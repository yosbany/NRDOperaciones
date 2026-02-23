import { Image, ImageStyle, StyleSheet, View, ViewStyle } from 'react-native';

interface LogoProps {
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  width?: number;
  height?: number;
  borderRadius?: number;
}

export default function Logo({ style, imageStyle, width = 200, height = 80, borderRadius = 0 }: LogoProps) {
  const containerStyle = { width, height, borderRadius };
  const clipStyle = borderRadius > 0 ? { overflow: 'hidden' as const, borderRadius } : {};
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.imageContainer, containerStyle, clipStyle]}>
        <Image
          source={require('../assets/images/nrd-logo.png')}
          style={[styles.logo, containerStyle, imageStyle]}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    overflow: 'hidden',
  },
  logo: {
    width: 200,
    height: 80,
  },
});

