# bauta-hands-on

This repository intends to describe the main features of [bauta.js](https://github.com/axa-group/bauta.js) creating a Node.js together with [Fastify](https://www.fastify.io/).

## Prerequisites

- Node.js LTS version >= 16.x. You can install Node.js using [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) or from the [Node.js](https://nodejs.org/en/) website.
- npm version greater or equal than 6.x (recommended 8.x).
- Local Postgres DB for chapter 6.

## Step by step hands-on

## Chapter 1 - Getting started

In this chapter, we ensure we have all the prerequisites and we install `bauta.js` and all the required dependencies.

First, check the Node.js version and npm version on your favourite terminal.

```console
$> node -v
v16.18.1

$> npm -v
8.19.2
```

And then, init the API project and install the required dependencies.

```console
$> npm init
This utility will walk you through creating a package.json file.
It only covers the most common items, and tries to guess sensible defaults.

See `npm help init` for definitive documentation on these fields
and exactly what they do.

Use `npm install <pkg>` afterwards to install a package and
save it as a dependency in the package.json file.

Press ^C at any time to quit.
package name: (oss) bauta-football-api
version: (1.0.0) 
description: 
entry point: (bauta.js) index.js
test command: 
git repository: 
keywords: 
author: 
license: (ISC) MIT
About to write to /Users/fherrero/devel/oss/package.json:

{
  "name": "bauta-football-api",
  "version": "1.0.0",
  "description": "",
  "main": "server.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "MIT"
}


Is this OK? (yes) 
```

```console
$> npm install fastify @axa/bautajs-core @axa/bautajs-fastify @axa/bautajs-datasource-rest
```

## Chapter 2 - Hello World

To open our API to the world, we need to run our server with Fastify and register `bautajs-fastify` with a small OpenAPI specification. And by default, with Bauta.js we have a swagger UI explorer working out of the box on `http://localhost:3000/v1/explorer`.

You can check the files created and the code of generated for this chapter at the [Chapter 2](./chapter2/) folder.

## Chapter 3 - Add fastify error handler and new operations

We add `fastify.setErrorHandler(handler(error, request, reply))` on our `server.js` file. With this common error handler we manage every error that happens on our API. There, we modify the error if it's needed to ensure all the error than our API throws are coherent between them.

```js
// => server.js
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply
    .status(error.statusCode || 500)
    .send({ ...error, message: error.message || 'Unkown error', statusCode: error.statusCode });
});
```

Is time to separate the resolvers of our API routes to its own path, to apply a better structure on our API codebase. Bauta.js Core creates every operation described on the OpenAPI schema as a route when the plugin is initialized. The resolvers are where you specify the logic of every route/operation. We must to define the resolvers path as part of the `bauta.js`  fasitfy plugin initialization options.

```js
// => server.js
fastify.register(bautajsFastify, {
  apiBasePath: 'api',
  prefix: 'v1/',
  apiDefinition,
  resolversPath: './services/**/*-resolvers.js'
});
```

And we place our  `getHi` operation's resolver at `./services/hi-resolvers.js`:

```js
// => ./services/hi-resolvers.js
const { resolver } = require('@axa/bautajs-core');

module.exports = resolver(operations => {
  operations.getHi.setup(() => ({ hi: 'Hello World!' }));
});
```

Once we have defined a proper structure for the `Bauta.js` resolvers, let's add additional behaviour to our API. It will has a enpoint to return a list of Pokémons. Usually, you will follow the next steps in order to add a new endpoint/route to your API using `bauta.js`.

- Design and add your API endpoint to the OpenAPI specification file with a unique operation identifier.

```json
// => ./openapi-spec.json
    ...
    "/pokemons": {
      "get": {
        "operationId": "getPokemons",
        "responses": {
          "200": {
            "description": "Get a list of pokemons",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": ["name"],
                    "properties": {
                      "name": {
                        "type": "string"
                      },
                      "url": {
                        "type": "string"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    ...
```

- Add and implements the resolver behaviour for the previous operation identifier.

```js
// => ./services/pokemons/pokemons-resolvers.js
module.exports = resolver(operations => {
  // GET /pokemons
  operations.getPokemons.setup(() => {
    return [
      { name: 'bulbasur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
      { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
      { name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon/3/' }
    ];
  })
});
```

Bauta.js delegates on Fastify the schema validations and serialization by default. Thus, having a schema definition for the request input and request responses enables the feature.  For additional information, check [Bauta.js docs](https://github.com/axa-group/bauta.js/blob/main/packages/bautajs-fastify/README.md) and [Fasitfy docs](https://www.fastify.io/docs/latest/Reference/Validation-and-Serialization/).

We can force our resolver to return a response with an invalid schema and fastify will generate automatically a descriptive validation error. It's very useful too for request body format validations on POST/PUT endpoints.

```js
// => ./services/pokemons/pokemons-resolvers.js
module.exports = resolver(operations => {
  // GET /pokemons
  operations.getPokemons.setup(() => {
    return [
      // { name: 'bulbasur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
      // Missing mandatory name fields
      { url: 'https://pokeapi.co/api/v2/pokemon/1/' },
      { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
      { name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon/3/' }
    ];
  })
});
```

If we call now our `GET /pokemons` endpoint, it will return the following error as response, with a 500 HTTP status code.

```json
{
    "serialization": {
        "url": "/v1/api/pokemons",
        "method": "GET"
    },
    "message": "\"name\" is required!"
}
```

Before moving on to the Chapter 4, we are going to introduce the `bauta.js` Pipeline concept and refactor our `getPokemons` resolver using `pipe`. Bauta.js provides a set of decorators to ease writing the logic of your endpoint's resolvers, and `pipe` is one of them. `pipe` allows expressing the logic as a flow of data that follows a pipeline. It helps to separate the logic on small reusable and testable functions called steps. A step function can be async. Take a look to the [Bauta.js pipeline and step function documentation](https://github.com/axa-group/bauta.js/blob/main/docs/resolvers.md#step-functions-pipelinestepfunction) and to [Bauta.js Context documentation](https://github.com/axa-group/bauta.js/blob/main/docs/bautajs-context.md) to make the most of Bauta.js `pipe`.

```js
// => ./services/pokemons/pokemons-resolvers.js
const getPokemonPipe = pipe((_prev, ctx) => {
  ctx.log.debug('I am a pipe step');
  return [
    { name: 'bulbasur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
    { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
    { name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon/3/' }
  ];
});

module.exports = resolver(operations => {
  operations.getPokemons.setup(getPokemonPipe);
});
```

You can check the files created and the code of generated for this chapter at the [Chapter 3](./chapter3/) folder.

## Chapter 4 - Calling to PókeAPI

So far, our API just return a static list of pokemons. To show the capabilities of `bautajs-rest-datasource`, we are going to integrate [PokéAPI](https://pokeapi.co/) as our datasource. PokéAPI is free and do not need authentication mechanism, so is a very good candidate to be used as part of hands-on and probe of concepts.

First, we need to install `@axa/bautajs-rest-datasource` as part of our dependencies. Find its documetation [here](https://github.com/axa-group/bauta.js/blob/main/docs/datasources.md).

After, we can create our first rest provider datasource to consume PokéAPI and use it on our `getPokemonsPipe`.

```js
// => ./services/pokemons/pokemons-datasources.js
const { restProvider } = require('@axa/bautajs-datasource-rest');

const prefixUrl = 'https://pokeapi.co/api/v2';

const getPokemons = restProvider(client => client.get(`${prefixUrl}/pokemon`, { resolveBodyOnly: true }));

module.exports = { getPokemons };

// => ./services/pokemons/pokemons-resolvers.js
const getPokemonsPipe = pipe(getPokemons(), pokeApiBodyResponse => {
  return pokeApiBodyResponse.results;
});
```

If we run try out our `GET /pokemons` endpoint, now we get a list of pokemons from PokéAPI.

```json
// => GET http://localhost:3000/v1/api/pokemons
[
    {
        "name": "bulbasaur",
        "url": "https://pokeapi.co/api/v2/pokemon/1/"
    },
    {
        "name": "ivysaur",
        "url": "https://pokeapi.co/api/v2/pokemon/2/"
    },
    {
        "name": "venusaur",
        "url": "https://pokeapi.co/api/v2/pokemon/3/"
    },
    {
        "name": "charmander",
        "url": "https://pokeapi.co/api/v2/pokemon/4/"
    },
    {
        "name": "charmeleon",
        "url": "https://pokeapi.co/api/v2/pokemon/5/"
    },
    {
        "name": "charizard",
        "url": "https://pokeapi.co/api/v2/pokemon/6/"
    },
    {
        "name": "squirtle",
        "url": "https://pokeapi.co/api/v2/pokemon/7/"
    },
    {
        "name": "wartortle",
        "url": "https://pokeapi.co/api/v2/pokemon/8/"
    },
    {
        "name": "blastoise",
        "url": "https://pokeapi.co/api/v2/pokemon/9/"
    },
    {
        "name": "caterpie",
        "url": "https://pokeapi.co/api/v2/pokemon/10/"
    },
    {
        "name": "metapod",
        "url": "https://pokeapi.co/api/v2/pokemon/11/"
    },
    {
        "name": "butterfree",
        "url": "https://pokeapi.co/api/v2/pokemon/12/"
    },
    {
        "name": "weedle",
        "url": "https://pokeapi.co/api/v2/pokemon/13/"
    },
    {
        "name": "kakuna",
        "url": "https://pokeapi.co/api/v2/pokemon/14/"
    },
    {
        "name": "beedrill",
        "url": "https://pokeapi.co/api/v2/pokemon/15/"
    },
    {
        "name": "pidgey",
        "url": "https://pokeapi.co/api/v2/pokemon/16/"
    },
    {
        "name": "pidgeotto",
        "url": "https://pokeapi.co/api/v2/pokemon/17/"
    },
    {
        "name": "pidgeot",
        "url": "https://pokeapi.co/api/v2/pokemon/18/"
    },
    {
        "name": "rattata",
        "url": "https://pokeapi.co/api/v2/pokemon/19/"
    },
    {
        "name": "raticate",
        "url": "https://pokeapi.co/api/v2/pokemon/20/"
    }
]
```

Now, we can create a new API endpoint, `GET /pokemons/{id}`, to practice everything we have seen until now explaining how we can pass data between Bauta.js' step functions. As we did previously, first we need to add the endpoint definition on the OpenAPI specifications.

```json
// => ./openapi-spec.json
    ...
    "/pokemons/:id": {
      "get": {
        "operationId": "getPokemon",
        "responses": {
          "200": {
            "description": "Get a pokemon by id",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          }
        }
      }
    }
    ...
```

Second, we need to create the resolver for the new `getPokemon` operation identifier and the rest provider datasource that will used as step function on the Bauta.js pipe of the `getPokemon` operation resolver.

```js
// => ./services/pokemons/pokemons-resolvers.js
module.exports = resolver(operations => {
  // GET /pokemons
  operations.getPokemons.setup(getPokemonsPipe);
  // GET /pokemons/:id
  operations.getPokemon.setup(getPokemonPipe);
});
```

Before implementing `getPokemonPipe`, we are going to add the new rest provider datasource. Additionally, we use `restProvider.extend` to share common configuration between different rest providers.

```js
// => /services/pokemons/pokemons-datasources.js
const { restProvider } = require('@axa/bautajs-datasource-rest');

const prefixUrl = 'https://pokeapi.co/api/v2';

const pokeApiProvider = restProvider.extend({ prefixUrl, resolveBodyOnly: true });

const getPokemons = pokeApiProvider(client => client.get('pokemon'));

const getPokemon = pokeApiProvider((client, pokemonId, ctx) => {
  return client.get(`pokemon/${pokemonId}`);
});

module.exports = { getPokemons, getPokemon };
```

As you can see above, both `getPokemons` and `getPokemon` rest providers share the `prefixUrl` and `resolveBodyOnly` options. As  `@axa/bautajs-datasource-rest` is an abstraction of the HTTP request library [got](https://github.com/sindresorhus/got/tree/v11.8.5), we could use any of the got's [options](https://github.com/sindresorhus/got/tree/v11.8.5#options).

It's time to implements `getPokemonPipe`.

```js
// => ./services/pokemons/pokemons-resolvers.js
const { resolver, pipe } = require('@axa/bautajs-core');
const { getRequest } = require('@axa/bautajs-fastify');

const { getPokemon } = require('./pokemons-datasource');

const getPokemonPipe = pipe((_prev, ctx) => {
  const request = getRequest(ctx);
  const { id: pokemonId } = request.params;

  // => ctx.data can be used to share global data between the pipe's steps.
  // ctx.data.pokemonId = pokemonId;

  // pokemonId value will be pass as argument to the getPokemon rest provider
  return pokemonId;
}, getPokemon());

...
```

Also, if we store information on the Bauta.js ctx's data, it can be get inside the rest provider or any other step function of the pipe. Our recomendation is to do not abuse of this feature to prevent unexpected side-effects and keep the step functions as pure as possible.

We could even access to the request params inside the rest provider to get the pokemon id, but it could be better to keep the rest providers agnostic of the request logic.

You can check the files created and the code of generated for this chapter at the [Chapter 4](./chapter4/) folder.

## Chapter 5 - Bauta.js decorators

A part of the `pipe` decorator, Bauta.js has a set of valuable decorators that you can use to build your resolvers pipelines. We are going to cover a couple of them now, but you can find information about all of them on [Bauta.js documentation](https://github.com/axa-group/bauta.js#decorators).

What we want to achieve? We would like that to enrich the response of `GET /pokemons` with the more pokemon's information.

For every pokemon on get pokemon list, we want to get pokemon details and join all the information as the response of our `GET /pokemons` API endpoint.

As you probably have already realized, get the pokemon details is a asyncronous request using the `getPokemon` rest provider, so it could be smart if we make all the `getPokemon` calls in parallel. Let's use the Bauta.js [parallelMap decorator](https://github.com/axa-group/bauta.js/blob/main/docs/decorators/parallel-map.md).

```js
// => ./services/pokemons/pokemons-resolvers.js
const { resolver, pipe, parallelMap } = require('@axa/bautajs-core');

const { getPokemons, getPokemon } = require('./pokemons-datasource');

const getIdFromURL = step(({ url }) =>
  url.split('https://pokeapi.co/api/v2/pokemon/')[1].replace('/', '')
);

const getPokemonsPipe = pipe(
  getPokemons(),
  pokemonsResBody => pokemonsResBody.results,
  parallelMap(
    pokemons => pokemons,
    // the execution of this sub-pipe is executed using Promise.all under the hood
    // for every element on pokemons
    pipe(
      getIdFromURL,
      getPokemon()
    )
  )
);

...
```

Powerful! We could assume that the details of a specific pokemon does not change a lot, so what do you think if we could avoid most of the request to retrieve them using a Bauta.js cache decorator? Let's try it out.

First, we need to install `@axa/bautajs-decorator-cache` as part of our dependencies. `@axa/bautajs-decorator-cache` is a Bauta.js step decorator using the [quick-lru](https://www.npmjs.com/package/quick-lru) package.

```console
npm i @axa/bautajs-decorator-cache
```

```js
// => ./services/pokemons/pokemons-resolvers.js
const { resolver, pipe, parallelMap } = require('@axa/bautajs-core');

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
      { 
        maxSize: 1, 
        // 30 seconds
        maxAge: 30 * 1000 
      }
    )
  )
);

...
```

You can check the files created and the code of generated for this chapter at the [Chapter 5](./chapter5/) folder.

## Chapter 6 - POST endpoint

Bauta.js is an add-on over Fastify, therefore, you can still leverage all the Fastify features (i.e. Fastify [hooks](https://www.fastify.io/docs/latest/Reference/Hooks/)) or use third-party Fastify plugins.

We need an additional custom response header on everyone of our API endpoints. For that, we can use a Fastify hook.

```js
// => ./server.js
...

fastify.addHook('onSend', (request, reply, payload, done) => {
  reply.headers({'custom-header': 'myCustomHeader'});

  return done();
});

...
```

And what about third-party Fastify plugins? Imagine we need to consume a postgres database to store custom information of our pokemons, such as a nickname. We can use `@fastify/postgres` to connect to the DB and to interact with it.

First, we need to install `@fastify/postgres` as part of our dependencies. 

```console
npm i @fastify/postgres
```

Then, we can register the plugin.

```js
// ./server.js
// This will register the dabatase on fastify.pg
fastify.register(fastifyPostgres, {
  // never store password on plain text, this is only for test porpuse
  connectionString: 'postgres://newuser:s3cr3t@localhost:5432/pokemondb'
});
```

How we can provide the nickname of a pokemon? Creating a new API endpoint, but this time it will be use `POST` HTTP method, `POST /pokemons/{id}/nickname`. The nickname will be on the request body payload. As we have been doing during the hands-on, let's add the API endpoint schema into the OpenAPI specifications.

```json
// => .openapi-spec.json
...
    "/pokemons/{id}/nickname": {
      "post": {
        "operationId": "postNickname",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "description": "id of the pokemon",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["nickname"],
                "properties": {
                  "nickname": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Create a nickname for pokemon",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          }
        }
      }
    }
...
```

To store on the DB a row, we need to create a Bauta.js step function (`saveNickname`) that can be use as part of the new operation resolver, `postNickname`. And why not, we can implement a Bauta.js step function (`getNickname`) to be used on the `getPokemons` pipeline to return the nickname as part of the response of the `GET /pokemons` API endpoint.

```js
// => ./services/pokemons/pokemons-resolvers.js
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

const postNicknamePipe = pipe(
  (_perv, ctx) => {
    const request = getRequest(ctx);
    const { id: pokemonId } = request.params;
    const { nickname } = request.body;
    return { pokemonId, nickname };
  },
  saveNickname
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

module.exports = resolver(operations => {
  // GET /pokemons
  operations.getPokemons.setup(getPokemonsPipe);

  // GET /pokemons/:id
  operations.getPokemon.setup(getPokemonPipe);

  // POST /pokemons/:id/nickname
  operations.postNickname.setup(postNicknamePipe);
});
```

You can check the files created and the code of generated for this chapter at the [Chapter 6](./chapter6/) folder.

## TODOS

- mention API design first and functional programming concept  as Bauta.js mindset
- grammarly review
- staticConfig use case
