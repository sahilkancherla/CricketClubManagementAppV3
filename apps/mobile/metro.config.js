const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Resolve from mobile first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force these packages to always resolve from mobile's node_modules
// to prevent duplicate React instances
const mobileModules = path.resolve(projectRoot, 'node_modules');
const forcedModules = ['react', 'react-native', 'react/jsx-runtime', 'react/jsx-dev-runtime'];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const forced of forcedModules) {
    if (moduleName === forced) {
      return {
        type: 'sourceFile',
        filePath: require.resolve(forced, { paths: [mobileModules] }),
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
