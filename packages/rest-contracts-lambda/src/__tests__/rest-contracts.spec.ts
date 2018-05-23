import { CreateAPI, Method } from "rest-contracts";
import { wrapLambdaParametersAndResult } from "../rest-contracts-lambda";

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

    wrapLambdaParametersAndResult(getMethodSpec, ({params: {aPathParameter, aQueryParameter}}) => {
      const x = aPathParameter;
      const y = aQueryParameter;

      return `My parameters were ${x} and ${y}`;
    });
  })
})
