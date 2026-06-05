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

module.exports = config;
