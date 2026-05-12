module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'react' }]],
    plugins: [
      // Reanimated must be listed LAST.
      'react-native-worklets/plugin',
    ],
  };
};
