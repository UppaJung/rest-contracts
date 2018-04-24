# REST Contracts:
## A Simple TypeScript Library for defining REST APIs

```ts
// main.ts
import { createAPI } from 'rest-contracts';

const path = "/excuses/:id/";

interface excuse {
  id: string;
  description: string;
}

namespace Excuses {
  const Get  = createAPI
    .PathParameters<{id}>()
    .NoQueryParameters
    .
}
```
