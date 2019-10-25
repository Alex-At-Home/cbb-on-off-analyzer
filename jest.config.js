module.exports = {
  globals: {
    'ts-jest': {
      babelConfig: '.babelrc',
      diagnostics: {
        ignoreCodes: "TS2307" //(sometimes get these spurious errors during coverage testing)
      }
    }
  },
  roots: [
    "<rootDir>/src"
  ],
  preset: 'ts-jest',
  snapshotSerializers: ['enzyme-to-json/serializer'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  testRegex: '/__tests__/.*\\.test.(ts|tsx)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: ['<rootDir>/src/__tests__/setupTests.ts'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/__tests__/**/*.ts'],
  "moduleNameMapper":{
     "\\.(css|less|sass|scss)$": "identity-obj-proxy",
     "\\.(gif|ttf|eot|svg)$": "<rootDir>/__mocks__/fileMock.js"
  }
};
