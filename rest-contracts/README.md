# REST Contracts:

## A Simple TypeScript Library for defining REST APIs

REST Contracts were designed for web services that run TypeScript on both their back-end (API server/provider) and front-end (API client/consumer), and want a light-weigh way to:
 * specify the inputs and outputs of each API call,
 * automatically generate typed promise-based client functions used to access the API,
  * calls should have typed inputs so that TypeScript can validate them
  * calls should provide the correct return type for the response
 * use typescript to simplify writing the API implementation on the server
  * support wrappers that automtically populate the specified types
  * validate that APIs return the specified type

### REST Contracts use auto-complete to help make writing APIs easy.

First, you can use auto-complete to pick an HTTP REST method.

![Intellisense shows you the Method options avaialble](images/method-choice.png?raw=true)

Then, you choose whether your method will have path paramters.

![Intellisense gives you the option to specify path parameters, or no path parameters](images/get-path-parameters.png?raw=true)

Next, you specify query parameters (get & delete method) or body parameters (put, post, & patch).

![Intellisense gives you the option to specify query/body parameters, or none](images/get-query-parameters.png?raw=true)

You then specify a result, or choose to return no result.

![Intellisense gives you the option to specify a result or return no result (void)](images/get-returns.png?raw=true)

Finally, you choose the specify the path.  Any path parameters should appear between slashes and be preceded by a colon (":").

![Intellisense indicates where to specify the path.](images/get-path.png?raw=true)

The result is a complete contract.

![A complete contract for a REST GET API.](images/get-complete.png?raw=true)

Here's the full example with two GET requests and a PUT request for working with an interface for Excuse objects.

A server implementation wrapper via express is available as package rest-contracts-express-server.  (Another, for AWS lambda, is forthcoming).

Two client builders are in alpha: rest-contracts-browser-client, which has no dependencies so that it can run compactly in the browser, and rest-contracts-axios-client, which builds on top of axios so that it can run within node or in the browser.

```ts
import * as RestContracts from "rest-contracts";

export interface Excuse {
  id: number;
  quality: 'Solid' | 'Iffy' | 'Lame';
  description: string;
}

export const Get =
  RestContracts.CreateAPI.Get
  .PathParameters<{ id: number }>()
  .NoQueryParameters
  .Returns<Excuse>()
  .Path('/excuses/:id/');

export const Query =
  RestContracts.CreateAPI.Get
  .NoPathParameters
  .QueryParameters<{quality?: Excuse["quality"]}>()
  .Returns<Excuse>()
  .Path('/excuses/');

export const Put =
  RestContracts.CreateAPI.Put
  .NoPathParameters
  .BodyParameters<Excuse>()
  .Returns<Excuse>()
  .Path("/excuses/");
}
```

Each RestContract is an object that contains the path and method, along with extensive type information that can be used by packages for implementing these APIs or for automatically building clients to call them.

The rest-contract-browser-client API automatically creates clients for your API.


```ts
import * as ExcuseAPI from "./excuse-api";
import * as RestBrowserClient from "rest-contracts-browser-client";

createRequestFunction = RestBrowserClient.createRequestFunctionFactory("https://api.example.com/");

const excuseClient = {
  get: createRequestFunction(ExcuseAPI.Get),
  query: createRequestFunction(ExcuseAPI.Query),
  put: createRequestFunction(ExcuseAPI.Put),
};

// Fetch excuse 1
const excuse = await excuseClient.get({id: 1});
```

The rest-contract-express module provides a full TypeScript Intellisense exprience to help you implement your API without having to remember the correct typings.

