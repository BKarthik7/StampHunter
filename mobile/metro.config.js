// metro.config.js — monorepo-aware Metro config for StampHunter mobile workspace
// Docs: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// The root of the monorepo (two levels up from mobile/)
const monorepoRoot = path.resolve(__dirname, '../..');

const config = getDefaultConfig(__dirname);

// 1. Watch the monorepo root so Metro sees all workspaces
config.watchFolders = [monorepoRoot];

// 2. Tell Metro where to look for node_modules, in priority order:
//    a) the mobile workspace's own node_modules
//    b) the monorepo root node_modules (where expo packages were hoisted)
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),       // mobile/node_modules
  path.resolve(monorepoRoot, 'node_modules'),    // root node_modules
];

// 3. Disable symlinks to prevent resolution loops in npm workspaces
config.resolver.disableHierarchicalLookup = false;

// 4. Force a SINGLE copy of React (and friends) into the bundle.
//    The monorepo root pins react@18 (for the Next.js web workspace); without
//    this, packages hoisted to the root node_modules resolve react@18 while the
//    app resolves mobile's react@19 — producing two Reacts and the runtime error
//    "Cannot read property 'ReactCurrentDispatcher' of undefined".
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: path.resolve(__dirname, 'node_modules/react'),
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
  // react-dom@18 (pulled transitively by @clerk/expo) crashes when evaluated
  // against react@19; force the matching react-dom@19 installed in mobile/.
  'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
};

module.exports = config;
