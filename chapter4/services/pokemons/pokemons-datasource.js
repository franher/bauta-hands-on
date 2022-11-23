const { restProvider } = require('@axa/bautajs-datasource-rest');

const prefixUrl = 'https://pokeapi.co/api/v2';

const pokeApiProvider = restProvider.extend({ prefixUrl, resolveBodyOnly: true });

const getPokemons = pokeApiProvider(client => client.get('pokemon'));

const getPokemon = pokeApiProvider((client, pokemonId, ctx) => {
  // const { pokemonId } = ctx.data;

  return client.get(`pokemon/${pokemonId}`);
});

module.exports = { getPokemons, getPokemon };
