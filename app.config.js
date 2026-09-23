module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
  },
});
