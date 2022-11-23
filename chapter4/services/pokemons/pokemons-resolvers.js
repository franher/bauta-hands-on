const { resolver, pipe } = require('@axa/bautajs-core');
const { getRequest } = require('@axa/bautajs-fastify');

const { getPokemons, getPokemon } = require('./pokemons-datasource');

const getPokemonsPipe = pipe(getPokemons(), pokeApiBodyResponse => {
  return pokeApiBodyResponse.results;
});

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
