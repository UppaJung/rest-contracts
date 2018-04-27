import { CreateAPI, Method } from "rest-contracts";
import { RestContractsExpressServer } from "../rest-contracts-express-server";

describe(`CreateAPI`, () => {

  it(`get has correct path and method`, () => {
    const path = "/api/:aPathParameter";

    const getMethodSpec = CreateAPI
      .Get
      .PathParameters<{aPathParameter: number}>()
      .QueryParameters<{aQueryParameter: string}>()
      .Returns<string>()
      .Path("/api/:aPathParameter");

    expect(getMethodSpec.method).toBe(Method.get);
    expect(getMethodSpec.path).toBe(path);

    const server = new RestContractsExpressServer();

    server.implement(getMethodSpec, ({aPathParameter, aQueryParameter}, req, res, next) => {
      const x = aPathParameter;
      const y = aQueryParameter;

      return `My parameters were ${x} and ${y}`;
    });
  })
})
