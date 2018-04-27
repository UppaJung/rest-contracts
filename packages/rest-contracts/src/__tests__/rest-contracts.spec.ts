import { CreateAPI, Method } from '../index'

describe(`CreateAPI`, () => {

  it(`get has correct path and method`, () => {
    const path = "/api/:aPathParameter";

    const actual = CreateAPI
      .Get
      .PathParameters<{aPathParameter: string}>()
      .QueryParameters<{aQueryParameter: string}>()
      .Returns<string>()
      .Path("/api/:aPathParameter");

    expect(actual.method).toBe(Method.get);
    expect(actual.path).toBe(path);
  })
})
