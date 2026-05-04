const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const escape = require('escape-string-regexp');
const pak = require('../package.json');

const root = path.resolve(__dirname, '..');
const peers = Object.keys({ ...pak.peerDependencies });

/**
 * Metro configuration for the example app.
 *
 * - `watchFolders: [root]` lets Metro follow edits in `../src/` (library source).
 * - `blockList` prevents Metro from resolving peer deps twice (once from `../node_modules`,
 *   once from `./node_modules`), which would otherwise cause "duplicate React" crashes.
 * - `extraNodeModules` forces peer deps to resolve to the example app's copies.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],
  resolver: {
    blockList: peers.map(
      (m) => new RegExp(`^${escape(path.join(root, 'node_modules', m))}\\/.*$`)
    ),
    extraNodeModules: peers.reduce((acc, name) => {
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, {}),
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules')]
  }
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
