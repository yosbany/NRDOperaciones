const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Configuración para incluir fuentes de iconos
  config.module.rules.push({
    test: /\.(ttf|otf|eot|svg|woff(2)?)$/,
    use: {
      loader: 'file-loader',
      options: {
        name: '[name].[ext]',
        outputPath: 'assets/fonts/',
        publicPath: './assets/fonts/',
      },
    },
  });

  // Configuración para copiar fuentes de @expo/vector-icons
  const CopyPlugin = require('copy-webpack-plugin');
  config.plugins.push(
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts',
          to: 'assets/fonts',
          noErrorOnMissing: true,
        },
      ],
    })
  );

  return config;
};
