// next.config.js
const withCSS = require('@zeit/next-css');
const withWorkers = require('@zeit/next-workers');
module.exports = withWorkers(withCSS({
  workerLoaderOptions: {
    name: "static/[hash].worker.js",
    publicPath: "/_next/"
  },
  webpack: (config, options) => {
    config.output.globalObject = 'self';
    return config;
  },
  env: {
    GA_KEY: process.env.GA_KEY,
    MEN_CURR_UPDATE: process.env.MEN_CURR_UPDATE,
    WOMEN_CURR_UPDATE: process.env.WOMEN_CURR_UPDATE
  }
}));
