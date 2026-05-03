const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/**
 * Expo Metro defaults plus Windows workaround for `react-native-svg` `./fabric` resolution.
 */
/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;

/**
 * Metro on Windows sometimes fails to resolve `import … from './fabric'` in
 * react-native-svg's TypeScript source (expects fabric/index.ts). Map it explicitly.
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = context.originModulePath;
  const originPosix = origin ? origin.replace(/\\/g, '/') : '';
  if (
    moduleName === './fabric' &&
    originPosix.includes('react-native-svg/') &&
    originPosix.endsWith('ReactNativeSVG.ts')
  ) {
    return {
      filePath: path.join(
        __dirname,
        'node_modules',
        'react-native-svg',
        'src',
        'fabric',
        'index.ts',
      ),
      type: 'sourceFile',
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
