export enum Method {
  get = 'get',
  patch = 'patch',
  post = 'post',
  put = 'put',
  delete = 'delete',
}

export interface UsesMethod<METHOD extends Method = Method> {
  method: METHOD;
}
export interface DELETE extends UsesMethod<Method.delete> {};
export interface GET extends UsesMethod<Method.get> {};
export interface PATCH extends UsesMethod<Method.patch> {};
export interface POST extends UsesMethod<Method.post> {};
export interface PUT extends UsesMethod<Method.put> {};

export type MethodSupportingQueryParameter = Method.get | Method.delete;
export type MethodSupportingBodyParameter = Method.patch | Method.post | Method.put;

export type UsesMethodSupportingQueryParameter = UsesMethod<MethodSupportingQueryParameter>;
export type UsesMethodSupportingBodyParameter = UsesMethod<MethodSupportingBodyParameter>;

// Type requirements for parameters passed by path and string
// (values must be stings, query parameters may be undefined)
export type PathParametersType = { [name: string]: string }
export type QueryParametersType = {
  [name: string]:
    (string | undefined) |
    (string | undefined)[]
} |
  undefined;

export interface PathParameters<PATH_PARAMETER_OBJECT extends PathParametersType = PathParametersType> {
  pathParams: PATH_PARAMETER_OBJECT;
}

export interface QueryParameters<QUERY_PARAMETER_OBJECT extends QueryParametersType = QueryParametersType> {
  queryParams: QUERY_PARAMETER_OBJECT;
}

export interface Body<BODY_PARAMETER_TYPE = any> {
  bodyParams: BODY_PARAMETER_TYPE;
}

export interface Returns<RESULT_TYPE = any> {
  result: RESULT_TYPE;
}

export enum ResultEncoding {
  // Return result as JSON-encoded string (Default)
  json = 'json',
  // Return result as raw string or buffer
  raw = 'raw'
}

export interface ReturnsJSON<T = any> extends Returns<T> {
  resultEncoding: ResultEncoding.json;
  contentType?: string;
}
export interface ReturnsRaw<T extends string | Buffer> extends Returns<T> {
  resultEncoding: ResultEncoding.raw;
  contentType?: string;
}

export const isApiJsonEncoded = (api: any): boolean =>
  (!("resultEncoding" in api)) || api.resultEncoding === ResultEncoding.json;

export const hasContentType = (api: any): api is {contentType: string} =>
  ("contentType" in api) && typeof(api.contentType) === "string";

export interface AtPath<PATH extends string = string> {
  path: PATH;
}

// Functions to validate if an API has different types of parameters
export const hasQueryParameters = (
  api: any
): api is QueryParameters =>
  "queryParams" in api;

export const hasPathParameters = (
    api: any
  ): api is PathParameters =>
    "pathParams" in api &&
    "path" in api &&
    typeof(api.path) === "string" &&
    // Does an element of the path start with ":", such as /:id/
    (api.path as string).split("/").some( pathElement => pathElement.indexOf(":") === 0);

export const hasBody = (
  api: any
): api is Body =>
  typeof(api) === "object" && "bodyParams" in api;

// Functions to validate the type of an API
export function isBodyParameterAPI(api: UsesMethod): api is UsesMethodSupportingBodyParameter {
  return api.method === Method.patch || api.method === Method.post || api.method === Method.put;
}

export function isQueryParameterAPI(api: UsesMethod): api is UsesMethodSupportingQueryParameter {
  return api.method === Method.get || api.method === Method.delete;
}

export type PATH_PARAMS_OR_NULL<APITYPE> = APITYPE extends PathParameters ? APITYPE['pathParams'] : null;
export type QUERY_PARAMS_OR_NULL<APITYPE> = APITYPE extends QueryParameters ? APITYPE['queryParams'] : null;
export type PATH_PARAMS<APITYPE> = APITYPE extends PathParameters ? APITYPE['pathParams'] : undefined;
export type QUERY_PARAMS<APITYPE> = APITYPE extends QueryParameters ? APITYPE['queryParams'] : undefined;
export type PATH_AND_QUERY_PARAMS<APITYPE> =
  APITYPE extends PathParameters & QueryParameters ? APITYPE['pathParams'] & APITYPE['queryParams'] :
  APITYPE extends PathParameters ? APITYPE['pathParams'] :
  APITYPE extends QueryParameters ? APITYPE['queryParams'] :
  undefined;

export type BODY_PARAMS<APITYPE> = APITYPE extends Body ? APITYPE['bodyParams'] : undefined;
export type RESULT<APITYPE> = APITYPE extends Returns ? APITYPE['result'] : void;


export type ClientFunction<RAPI extends AtPath & UsesMethod, REQUEST_OPTIONS> =
  RAPI extends UsesMethodSupportingBodyParameter ? (
    RAPI extends PathParameters & Body?  (
      (pathParams: PATH_PARAMS<RAPI>, bodyParams: BODY_PARAMS<RAPI>, options?: REQUEST_OPTIONS) => Promise<RESULT<RAPI>>
    ) :
    RAPI extends Body?  (
      (bodyParams: BODY_PARAMS<RAPI>, options?: REQUEST_OPTIONS) => Promise<RESULT<RAPI>>
    ) :
    RAPI extends PathParameters?  (
      (pathParams: PATH_PARAMS<RAPI>,  options?: REQUEST_OPTIONS) => Promise<RESULT<RAPI>>
    ): (
      (options?: REQUEST_OPTIONS) => Promise<RESULT<RAPI>>
    )
  )
  :
  RAPI extends UsesMethodSupportingQueryParameter ? (
    RAPI extends PathParameters & QueryParameters ? (
      (pathAndQueryParameters: PATH_PARAMS<RAPI> & QUERY_PARAMS<RAPI>, options?: REQUEST_OPTIONS) => Promise<RESULT<RAPI>>
    ) :
    RAPI extends PathParameters ? (
        (pathAndQueryParameters: PATH_PARAMS<RAPI>, options?: REQUEST_OPTIONS) => Promise<RESULT<RAPI>>
    ) :
    RAPI extends QueryParameters ? (
        (pathAndQueryParameters: QUERY_PARAMS<RAPI>, options?: REQUEST_OPTIONS) => Promise<RESULT<RAPI>>
    ) : (
      (options?: REQUEST_OPTIONS) => Promise<RESULT<RAPI>>
    )
  )
  : never;


const mergeTypes = <T, U>(t: T, u: U): T & U => Object.assign({}, t, u);

const methodAndPathPairsAlreadySpecified = new Set<string>()
function ensureMethodAndPathHaveNotBeenDefinedBefore(
  method: Method,
  path: string
): void {
  const methodPathPair = method + path;
  // Catch the case where two REST APIs are assigned the same path, presumably because
  // someone copied a REST API to create a new one but forgot to specify a new path.
  if (methodAndPathPairsAlreadySpecified.has(methodPathPair)) {
    throw new Error(
      `The same method (${method}) and path (${path}) cannot be used for more than one REST API. Perhaps you copied a REST API and forgot to give the new one a unique path?`
    )
  }

  methodAndPathPairsAlreadySpecified.add(methodPathPair)
}

/***************************************************************************
 *  Deprecated pre-version 1 constructors
 */
const addPath = <SO_FAR extends UsesMethod>(soFar: SO_FAR) => ({
  Path:  <PATH extends string>(path: PATH) => {
    ensureMethodAndPathHaveNotBeenDefinedBefore(soFar.method, path);
    return mergeTypes({path} as AtPath<PATH>, soFar)
  }
});

const addReturns = <SO_FAR extends UsesMethod>(soFar: SO_FAR) => ({
  Returns: <RESULT_TYPE>() => addPath(mergeTypes(soFar, {} as Returns<RESULT_TYPE> )),
  NoResultToReturn: addPath(mergeTypes(soFar, {} as Returns<void>))
});

const addBodyParameter = <SO_FAR extends UsesMethod>(soFar: SO_FAR) => ({
  BodyParameters: <BODY_PARAMETER_TYPE>() => addReturns(mergeTypes(soFar, {} as Body<BODY_PARAMETER_TYPE>)),
  NoBodyParameters: addReturns(soFar),
});

const addQueryParameter = <SO_FAR extends UsesMethod>(soFar: SO_FAR) => ({
  QueryParameters: <QUERY_PARAMETER_TYPE extends QueryParametersType>() =>
    addReturns(mergeTypes(soFar, {queryParams: {} as QUERY_PARAMETER_TYPE} as QueryParameters<QUERY_PARAMETER_TYPE>)),
    NoQueryParameters: addReturns(soFar)
});

const createDeleteOrGet = <METHOD extends MethodSupportingQueryParameter>(method: METHOD) => ({
  PathParameters: <PATH_PARAMETER_TYPE extends PathParametersType>() =>
    addQueryParameter(mergeTypes({method} as UsesMethod<METHOD>, {pathParams: {} as PATH_PARAMETER_TYPE} as PathParameters<PATH_PARAMETER_TYPE>)),
  NoPathParameters: addQueryParameter({method} as UsesMethod<METHOD>)
});

const createPatchPostOrPut = <METHOD extends MethodSupportingBodyParameter>(method: METHOD) => ({
  PathParameters: <PATH_PARAMETER_TYPE extends PathParametersType>() =>
    addBodyParameter(mergeTypes({method} as UsesMethod<METHOD>, {pathParams: {} as PATH_PARAMETER_TYPE} as PathParameters<PATH_PARAMETER_TYPE>)),
  NoPathParameters: addBodyParameter({method} as UsesMethod<METHOD>)
});

export const CreateAPI = {
  Get: createDeleteOrGet(Method.get),
  Delete: createDeleteOrGet(Method.delete),
  Put: createPatchPostOrPut(Method.put),
  Post: createPatchPostOrPut(Method.post),
  Patch: createPatchPostOrPut(Method.patch),
}

/********************************************************************************
 * Version 1 constructors API.[GET|DELETE|PATCH|POST|PUT]
 */
export type ApiConstructor<API_ALREADY_SPECIFIED extends AtPath & UsesMethod> = ({
  /**
   * Complete this API by specifying that it returns void.
   * (No parens required.  Just follow this with a semicolon if you like.)
   */
  ReturnsVoid: API_ALREADY_SPECIFIED & Returns<void>;
  /**
   * Complete this API by specifying the return type as a generic parameter
   * between angle brackets, completing the function with parentheses
   * and a semicolon if you like to end statements with style. For example:
   *   Returns<{
   *     leadup: string;
   *     punchline: string;
   *   }>();
   */
  Returns<RESULT_TYPE>(): API_ALREADY_SPECIFIED & ReturnsJSON<RESULT_TYPE>;
  /**
   * Complete this API by specifying the return type to be raw data,
   * either sent as a string or a buffer.  Optionally provide a content-type
   * as a function parameter. For example:
   *   ReturnsRaw(); // raw data may be string or Buffer
   * or
   *   ReturnRaw<Buffer>("image/png");
   * or
   *   ReturnRaw<string>("text/xml");
   */
  ReturnsRaw<RESULT_TYPE extends string | Buffer = string | Buffer>(contentType?: string): API_ALREADY_SPECIFIED & ReturnsRaw<RESULT_TYPE>;
}) & (
  API_ALREADY_SPECIFIED extends PathParameters ? {} : {
    /**
     * Specify path parameters for this API in generic-parameter
     * angle brackets followed by empty parentheses.  For example:
     *   PathParameters<{ id: JokeId }>()
     * They attribute name must appear in the path preceded by a colon.
     *   "/joke/:id"
     */
    PathParameters<PATH_PARAMETERS extends PathParametersType>():
      ApiConstructor<API_ALREADY_SPECIFIED & PathParameters<PATH_PARAMETERS>>
}) & (
  API_ALREADY_SPECIFIED extends QueryParameters | UsesMethodSupportingBodyParameter ? {} : {
    /**
     * Specify query parameters for this API in generic-parameter
     * angle brackets followed by empty parentheses.  For example:
     *   PathParameters<{ queryJokeTextFor: string }>()
     */
    QueryParameters<QUERY_PARAMETERS extends QueryParametersType>():
      ApiConstructor<API_ALREADY_SPECIFIED & QueryParameters<QUERY_PARAMETERS>>
}) & (
  API_ALREADY_SPECIFIED extends MethodSupportingBodyParameter | UsesMethodSupportingQueryParameter ? {} : {
    /**
     * Specify a body object type or body parameters or for this API
     * in angle brackets followed by empty parentheses.  For example:
     *   Body<{
     *     leadup: string;
     *     punchline: string;
     * }>()
     */
    Body<BODY_PARAMETERS>():
      ApiConstructor<API_ALREADY_SPECIFIED & Body<BODY_PARAMETERS>>
})

const constructParameters = <API_ALREADY_SPECIFIED extends
  AtPath &
  UsesMethod & (
    {} |
    PathParameters |
    QueryParameters |
    Body
  )>(
    apiAlreadySpecified: API_ALREADY_SPECIFIED
  ): ApiConstructor<API_ALREADY_SPECIFIED> => {
    const constructor = ({
      ReturnsVoid: mergeTypes(apiAlreadySpecified, {result: undefined as void} as Returns<void>),
      ReturnsRaw: <RESULT_TYPE extends string | Buffer>(contentType?: string) => mergeTypes(
        apiAlreadySpecified,
        {result: {} as RESULT_TYPE, contentType, resultEncoding: ResultEncoding.raw} as ReturnsRaw<RESULT_TYPE>),
      ...(hasPathParameters(apiAlreadySpecified) ? {} : {
        PathParameters: <PATH_PARAMETERS extends PathParametersType>() =>
          constructParameters(mergeTypes(apiAlreadySpecified, {pathParams: {} as PATH_PARAMETERS} as PathParameters<PATH_PARAMETERS>))
      }),
      Returns: <RESULT_TYPE>() => mergeTypes(apiAlreadySpecified, {result: {} as RESULT_TYPE, resultEncoding: ResultEncoding.json} as ReturnsJSON<RESULT_TYPE>),
      ...(hasPathParameters(apiAlreadySpecified) ? {} : {
        PathParameters: <PATH_PARAMETERS extends PathParametersType>() =>
          constructParameters(mergeTypes(apiAlreadySpecified, {pathParams: {} as PATH_PARAMETERS} as PathParameters<PATH_PARAMETERS>))
      }),
      ...(hasQueryParameters(apiAlreadySpecified) || isBodyParameterAPI(apiAlreadySpecified) ? {} : {
        QueryParameters: <QUERY_PARAMETERS extends QueryParametersType>() =>
          constructParameters(mergeTypes(apiAlreadySpecified, {queryParams: {} as QUERY_PARAMETERS} as QueryParameters<QUERY_PARAMETERS>))
      }),
      ...(hasBody(apiAlreadySpecified) || isQueryParameterAPI(apiAlreadySpecified) ? {} : {
        Body: <BODY_PARAMETERS>() =>
          constructParameters(mergeTypes(apiAlreadySpecified, {bodyParams: {} as BODY_PARAMETERS} as Body<BODY_PARAMETERS>))
      })
    }) as ApiConstructor<API_ALREADY_SPECIFIED>;
    return constructor;
}

export interface ConstructPath<METHOD extends UsesMethod> {
  /**
   * Specify the path string at which this API accessed.  Parameter
   * components within the path should start with a colon.  For example:
   *   "/joke/:id"
   * (The generic type parameter is inferred, so you need NOT specify it.)
   */
  Path<PATH extends string>(path: PATH): ApiConstructor< METHOD & AtPath<PATH> >;
};

/**
 *
 * @param method
 */
const constructPath = <METHOD extends UsesMethod>(method: METHOD): ConstructPath<METHOD> => ({
  Path: <PATH extends string>(path: PATH) => {
    ensureMethodAndPathHaveNotBeenDefinedBefore(method.method, path);
    return constructParameters(mergeTypes(method, {path} as AtPath<PATH>))
  }
});

export const API = {
  /**
   * Start specifying a GET API method.
   * You will need to specify a path string, then specify the types of parameters,
   * and finish by specifying the type of value returned by the method, if any.
   */
  Get: constructPath({method: Method.get} as GET),
  /**
   * Start specifying a DELETE API method.
   * You will need to specify a path string, then specify the types of parameters,
   * and finish by specifying the type of value returned by the method, if any.
   */
  Delete: constructPath({method: Method.delete} as DELETE),
  /**
   * Start specifying a PATCH API method.
   * You will need to specify a path string, then specify the types of parameters,
   * and finish by specifying the type of value returned by the method, if any.
   */
  Patch: constructPath({method: Method.patch} as PATCH),
  /**
   * Start specifying a POST API method.
   * You will need to specify a path string, then specify the types of parameters,
   * and finish by specifying the type of value returned by the method, if any.
   */
  Post: constructPath({method: Method.post} as POST),
  /**
   * Start specifying a PUT API method.
   * You will need to specify a path string, then specify the types of parameters,
   * and finish by specifying the type of value returned by the method, if any.
   */
  Put: constructPath({method: Method.put} as PUT),
}
