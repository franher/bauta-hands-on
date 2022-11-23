const { resolver } = require('@axa/bautajs-core');

module.exports = resolver(operations => {
  operations.getHi.setup(() => ({ hi: 'Hello World!' }));
});
