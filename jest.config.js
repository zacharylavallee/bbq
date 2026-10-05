/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  workerIdleMemoryLimit: '800MB',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|standard-navigation)',
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'src/**/*.{ts,tsx}',
    'scripts/**/*.ts',
    '!**/*.d.ts',
    '!src/types/**',
    '!scripts/osv-gate.ts', // thin CLI entry, tested via local runs rather than unit tests
    '!scripts/release-age.ts', // thin CLI entry for the Dependabot age check
  ],
  coverageThreshold: {
    global: {
      statements: 100,
      functions: 100,
      lines: 100,
      branches: 95,
    },
  },
};
