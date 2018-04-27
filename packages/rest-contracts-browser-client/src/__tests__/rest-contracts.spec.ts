import { CreateAPI, Method } from "rest-contracts";
import { getClientCreationFunction } from "../rest-contracts-browser-client";

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

    const createAPI = getClientCreationFunction("https://api.example.com/", {withCredentials: true});
    const getClient = createAPI(getMethodSpec);
    const sampleFunctionCallingClient = async () => {
      // Not called as there's no api at example.com that would answer
      // here to make sure types match.
      await getClient({aPathParameter: 8675309, aQueryParameter: "some string"});
    };
    expect(typeof (sampleFunctionCallingClient)).toEqual("function");
  })
})
