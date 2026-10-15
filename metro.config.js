const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Bound parallel transforms so native builds and emulators can run together.
config.maxWorkers = 2;
module.exports = config;
