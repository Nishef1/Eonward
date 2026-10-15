// The isolated QA app runs the release bundle without touching the user's app data.
module.exports = ({ config }) => process.env.EONWARD_BUILD_VARIANT === 'qa' ? {
  ...config,
  name: 'Eonward QA',
  scheme: 'eonward-qa',
  android: { ...config.android, package: `${config.android.package}.qa` },
  ios: { ...config.ios, bundleIdentifier: `${config.ios.bundleIdentifier}.qa` },
} : config;
