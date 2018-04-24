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

![Intellisense gives you the option to specify a result or return no result (void)]
(images/result.png?raw=true)

Finally, you choose the specify the path.  Any path parameters should appear between slashes and be preceded by a colon (":").

![Intellisense indicates where to specify the path.](images/get-query-parameters.png?raw=true)

Here's a sample contract
```ts
import * as RestContracts from "rest-contracts";

export interface Excuse {
  id: number;
  quality: 'Solid' | 'Iffy' | 'Lousy';
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
