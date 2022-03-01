// N3 requires some polyfills
module.exports = {
  resolve: {
    fallback: {
      stream: require.resolve("stream-browserify"),
      buffer: require.resolve("buffer/"),
    },
  },
};
