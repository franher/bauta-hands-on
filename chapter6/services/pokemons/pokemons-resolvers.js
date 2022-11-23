const { resolver, pipe, step, parallelMap, tap, parallel } = require('@axa/bautajs-core');
const { getRequest, getResponse } = require('@axa/bautajs-fastify');
const { cache } = require('@axa/bautajs-decorator-cache');

const { getPokemons, getPokemon } = require('./pokemons-datasource');

const getIdFromURL = step(({ url }) =>
  url.split('https://pokeapi.co/api/v2/pokemon/')[1].replace('/', '')
);

const saveNickname = step(async ({ pokemonId, nickname }, ctx, bautajs) => {
  ctx.log.debug('Opening the connection to DB...');
  // bautajs-fastify decorates bautajs instance with the fastify instance
  const client = await bautajs.fastify.pg.connect();
  try {
    return bautajs.fastify.pg.transact(async client => {
      await client.query('INSERT INTO public.pokemon("pokemonId", nickname) VALUES ($1, $2)', [
        pokemonId,
        nickname
      ]);
    });
  } finally {
    // Release the client immediately after query resolves, or upon error
    ctx.log.debug('Releasing the connection to DB...');
    client.release();
  }
});

const getNickname = step(async (pokemonId, ctx, bautajs) => {
  ctx.log.debug('Opening the connection to DB...');
  // bautajs-fastify decorates bautajs instance with the fastify instance
  const client = await bautajs.fastify.pg.connect();
  try {
    const { rows } = await client.query(
      'SELECT nickname FROM public.pokemon WHERE "pokemonId"=$1',
      [pokemonId]
    );
    console.log({ rows });
    return rows?.[0]?.nickname;
  } finally {
    // Release the client immediately after query resolves, or upon error
    ctx.log.debug('Releasing the connection to DB...');
    client.release();
  }
});

const getPokemonsPipe = pipe(
  getPokemons(),
  pokemonsResBody => pokemonsResBody.results,
  parallelMap(
    pokemons => pokemons,
    cache(
      pipe(
        getIdFromURL,
        tap(id => console.log({ id })),
        parallel(getPokemon(), getNickname),
        ([pokemon, nickname = 'unkown']) => ({ ...pokemon, nickname })
      ),
      {
        maxSize: 1,
        maxAge: 30 * 1000
      }
    )
  )
);

const getPokemonPipe = pipe(
  (_prev, ctx) => {
    const request = getRequest(ctx);
    const { id: pokemonId } = request.params;
    ctx.data.pokemonId = pokemonId;

    return pokemonId;
  },
  parallel(getPokemon(), getNickname),
  ([pokemon, nickname = 'unkown']) => ({ ...pokemon, nickname })
);

function setStatusCode(statusCode) {
  return step((prev, ctx) => {
    getResponse(ctx).status(statusCode);

    return prev;
  });
}

const postNicknamePipe = pipe(
  (_perv, ctx) => {
    const request = getRequest(ctx);
    const { id: pokemonId } = request.params;
    const { nickname } = request.body;
    return { pokemonId, nickname };
  },
  saveNickname,
  setStatusCode(204)
);

module.exports = resolver(operations => {
  // GET /pokemons
  operations.getPokemons.setup(getPokemonsPipe);

  // GET /pokemons/:id
  operations.getPokemon.setup(getPokemonPipe);

  // POST /pokemons/:id/nickname
  operations.postNickname.validateResponse(false).setup(postNicknamePipe);
});
