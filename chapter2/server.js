const fastify = require('fastify')({ logger: { name: 'Bauta.js Hands-On' } });
const { resolver } = require('@axa/bautajs-core');
const { bautajsFastify } = require('@axa/bautajs-fastify');

const apiDefinition = require('./openapi-spec.json');

fastify.register(bautajsFastify, {
  apiBasePath: 'api',
  prefix: 'v1/',
  apiDefinition,
  resolvers: [
    resolver(operations => {
      operations.getHi.setup(() => ({ hi: 'Hello World!' }));
    })
  ]
});

// Run the server!
const start = async () => {
  try {
    await fastify.listen({
      host: '0.0.0.0',
      port: 3000
    });
  } catch (err) {
    if (err) {
      fastify.log.error(err, 'Error running the server');
      // Killing graciously the server
      process.exit(1);
    }
    fastify.log.info('Server listening on localhost:', fastify.server.address().port);
  }
};

start();
