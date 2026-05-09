const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/**
 * Expo Metro defaults plus Windows workaround for `react-native-svg` `./fabric` resolution.
 */
/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;
const shimReactNative = path.join(__dirname, 'shims', 'react-native.js');
const realReactNativeEntry = require.resolve('react-native');

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

  // App source uses a Text/TextInput shim (React 19 drops defaultProps on RN's function Text).
  if (moduleName === 'react-native') {
    const fromShim =
      originPosix.endsWith('/shims/react-native.js') ||
      originPosix.endsWith('\\shims\\react-native.js');
    const fromNodeModules = originPosix.includes('/node_modules/');
    if (fromShim) {
      return { filePath: realReactNativeEntry, type: 'sourceFile' };
    }
    if (!fromNodeModules && origin) {
      return { filePath: shimReactNative, type: 'sourceFile' };
    }
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
