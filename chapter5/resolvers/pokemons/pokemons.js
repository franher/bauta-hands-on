const { resolver, pipe, step, parallelMap, tap } = require('@axa/bautajs-core');
const { getRequest } = require('@axa/bautajs-fastify');
const { cache } = require('@axa/bautajs-decorator-cache');

const { getPokemons, getPokemon } = require('./pokemons-datasource');

const getIdFromURL = step(({ url }) =>
  url.split('https://pokeapi.co/api/v2/pokemon/')[1].replace('/', '')
);

const getPokemonsPipe = pipe(
  getPokemons(),
  pokemonsResBody => pokemonsResBody.results,
  parallelMap(
    pokemons => pokemons,
    cache(
      pipe(
        getIdFromURL,
        tap(id => console.log({ id })),
        getPokemon()
      ),
      { maxSize: 1000 }
    )
  )
);

const getPokemonPipe = pipe((_prev, ctx) => {
  const request = getRequest(ctx);
  const { id: pokemonId } = request.params;
  ctx.data.pokemonId = pokemonId;

  return pokemonId;
}, getPokemon());

module.exports = resolver(operations => {
  // GET /pokemons
  operations.getPokemons.setup(getPokemonsPipe);
  // GET /pokemons/:id
  operations.getPokemon.setup(getPokemonPipe);
});
