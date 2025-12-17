module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "\\.(css|less|sass|scss)$": "identity-obj-proxy",
    "\\.(gif|ttf|eot|svg)$": "<rootDir>/__mocks__/fileMock.js",
    "^@elastic/search-ui-elasticsearch-connector/api-proxy$": "<rootDir>/__mocks__/@elastic/search-ui-elasticsearch-connector/api-proxy.js",
    "^@elastic/react-search-ui$": "<rootDir>/__mocks__/@elastic/react-search-ui.js",
  },
};
