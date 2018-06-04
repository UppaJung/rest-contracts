# REST-Contracts
## Minimalist TypeScript Libraries for Defining & Implementing REST APIs

The REST-Contracts set of packages were designed for web services that run TypeScript on both their back-end (API server/provider) and front-end (API client/consumer), and want a light-weight way to:
 * specify the inputs and outputs of each API call
 * automatically generate typed API client functions
   - with types for each function's parameters so that TypeScript can enforce the contract
   - with each function returning a Promise for the result type specified in the contract
 * use TypeScript to simplify implementing the API service while reducing errors
   - parameters arrive to your code with the types specified in the contract
   - the type checker verifies that your implementation returns the type specified in the contract

### REST-contracts uses auto-complete to help make writing APIs easy.

First, you can use auto-complete to pick an HTTP REST method.

![Intellisense shows you the Method options avaialble](https://raw.githubusercontent.com/UppaJung/rest-contracts/master/images/method-choice.png?raw=true)

Next, you choose the specify the path.  Any path parameters should appear between slashes and be preceded by a colon (":").

![Intellisense indicates where to specify the path.](https://raw.githubusercontent.com/UppaJung/rest-contracts/master/images/get-path.png?raw=true)

Then, you specify parameters.  In this example, we'll set path parameters but not query parameters.

![Intellisense gives you the option to specify parameters](https://raw.githubusercontent.com/UppaJung/rest-contracts/master/images/get-path-parameters.png?raw=true)

Finally, you specify a result type or return void.

![Intellisense gives you the option to specify a result or return no result (void)](https://raw.githubusercontent.com/UppaJung/rest-contracts/master/images/get-returns.png?raw=true)

Finally, you choose the specify the path.  Any path parameters should appear between slashes and be preceded by a colon (":").

![Intellisense indicates where to specify the path.](https://raw.githubusercontent.com/UppaJung/rest-contracts/master/images/get-path.png?raw=true)

The result is a complete contract.

![A complete contract for a REST GET API.](https://raw.githubusercontent.com/UppaJung/rest-contracts/master/images/get-complete.png?raw=true)

A full contract for a data type (e.g. an Excuse object) might look something like this, with a GET request for individaul objects, a GET request for multiple objects, and a PUT request to add items.

```ts
// from rest-contracts-example/src/excuse-contract.ts
export const Get =
  API.Get
  .Path('/excuses/:id/')
  .PathParameters<{ id: ExcuseId }>()
  .Returns<ExcuseDbRecord>();

export const Query =
  API.Get
  .Path('/excuses/')
  .QueryParameters<{quality?: ExcuseDbRecord["quality"]}>()
  .Returns<ExcuseDbRecord[]>();

export const Put =
  API.Put
  .Path("/excuses/")
  .Body<Excuse | ExcuseDbRecord>()
  .Returns<ExcuseDbRecord>();
```

The Get, Query, and Put objects generated in this example contain a path and method.  More importantly, the compiler attaches to these objects additional type information that defines parameters and return type of each API call.  These attached types are consumed by packages that help you to implement the APIs on the server side that implement client functions to allow client code to call these APIs--providing compile-time checking of compliance with the interface contract on both sides.

### REST-contracts server packages simplify correct API implementation.

To create servers implement the API in these contracts, you can currently used rest-contracts-express-server, rest-contracts-lambda, or implement your own.

```ts
// from rest-contracts-example/src/server.ts

// You'll implement your APIs by calling the implement method of this class.
// (Want to add authentication or other steps?  Just create a subclass.)
const ourApi = new RestContractsExpressServer.RestContractsExpressServer(router);

// Best to create a new file here, import the ourApi class,
// and separate implementations into different files.
const excuseMemoryDatabaseTable =
  new Map<ExcuseContract.ExcuseDbRecord["id"], ExcuseContract.ExcuseDbRecord>();

// We've merged all params into params, but req, res, & next are still available
// to you. (We've also added typings to the parameter fields of the req object!)

// Implement the Excuse Put method
ourApi.implement(ExcuseContract.Put, (body, params, req, res, next) => {
  const excuseOrExcuseDbRecord = body;
  const excuseDbRecord: ExcuseContract.ExcuseDbRecord =
    ("id" in excuseOrExcuseDbRecord && excuseOrExcuseDbRecord.id) ?
      // parameter is already an ExcuseDbRecord with an ID assigned
      excuseOrExcuseDbRecord :
      // parameters is an excuse that is not yet in the database and
      // needs to be assigned a unique ExcuseId
      {
        ...excuseOrExcuseDbRecord,
        id: ExcuseContract.ExcuseId()
      };
  excuseMemoryDatabaseTable.set( excuseDbRecord.id, excuseDbRecord );
  // Put methods return a copy of the record that they stored
  return excuseDbRecord;
});

// Implement the Excuse Get method
// (leaving out req, res, next since we're not using them)
ourApi.implement(ExcuseContract.Get, (params) =>
  excuseMemoryDatabaseTable.get(params.id)
);

// Impelment the Excuse directory-level Get, which can query on quality
ourApi.implement(ExcuseContract.Query, (params) =>
  [...excuseMemoryDatabaseTable.values()].
    // Take all exucses if no quality parameter speicfied,
    // or only those excuses with a quality matching the one queried for
    filter( values => (!params.quality) || values.quality === params.quality )
);
```

### REST-contracts client packages build typed client functions for you.

To automatically build client functions to call the API in the contract, we have a minimal rest-contracts-browser-client, which has no dependencies so that it can run compactly in the browser, and rest-contracts-axios-client, which builds on top of axios so that it can run within node or in the browser.  Since our example runs on node, it uses the latter.

```ts
// from rest-contracts-example/src/client.ts

// Add two excuses.  Excuses for what?  Not using TypeScript.
const firstExcuseStored = await excuseClient.put({
  quality: ExcuseQuality.Poor,
  description: "I don't use TypeScript I enjoy debugging type errors in production software.",
});

console.log("Put the first excuse", firstExcuseStored);

const secondExcuseStored = await excuseClient.put({
  quality: ExcuseQuality.Poor,
  description: "My nervous systems has a built-in type checker that catches errors before they become keystrokes.",
});

console.log("Put the second excuse", secondExcuseStored);
const excuseId = firstExcuseStored.id;

// Retrieve the first excuse again using get with a path parameter.
const excuse = await excuseClient.get({id: excuseId});

// Retrieve the second excuse again using get with a path parameter.
const secondExcuse = await excuseClient.get({id: secondExcuseStored.id});

// Retrieve excuses using Query (get with a query parameter)
const lameExcuses = await excuseClient.query({quality: ExcuseContract.ExcuseQuality.Poor});
console.log("Retrieved excuses:", lameExcuses);

// Retrieve excuses using Query (get with a query parameter)
const goodExcuses = await excuseClient.query({quality: ExcuseContract.ExcuseQuality.Good});
console.log("Here are all the valid excuses for not using TypeScript:", goodExcuses);
console.log("Yup, that's all of them.");
```

You can download the working example from the package/rest-contracts-example directory of the repository on GitHub, or download it as an npm package.

## Contributing

Make sure you're using yarn version >= 1 and have the shx package installed globally.

```bash
npm install -g yarn@latest
npm install -g shx
git clone https://github.com/UppaJung/rest-contracts.git
yarn
```

The only thing we love more than carefully-crafted pull requests are the people who contribute them.

[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)
