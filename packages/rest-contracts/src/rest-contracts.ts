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
export interface AtPath<PATH extends string = string> {
  path: PATH;
}

// Functions to validate if an API has different types of parameters
export const hasQueryParameters = <REST_API extends UsesMethod & AtPath>(
  api: REST_API
): api is REST_API & QueryParameters<QUERY_PARAMS<REST_API>> =>
  "queryParams" in api;

export const hasPathParameters = <REST_API extends AtPath>(
    api: REST_API
  ): api is REST_API & PathParameters =>
    "pathParams" in api &&
    // Does an element of the path start with ":", such as /:id/
    api.path.split("/").some( pathElement => pathElement.indexOf(":") === 0);

export const hasBody = <REST_API extends UsesMethod & AtPath>(
  api: REST_API
): api is REST_API & Body<BODY_PARAMS<REST_API>> =>
  "queryParams" in api;

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
export type PATH_AND_QUERY_PARAMS<APITYPE> = PATH_PARAMS<APITYPE> & QUERY_PARAMS<APITYPE>;
export type BODY_PARAMS<APITYPE> = APITYPE extends Body ? APITYPE['bodyParams'] : undefined;
export type RESULT<APITYPE> = APITYPE extends Returns ? APITYPE['result'] : void;

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
export type ApiConstructor<SO_FAR extends AtPath & UsesMethod> = ({
  Returns<RESULT_TYPE>(): SO_FAR & Returns<RESULT_TYPE>;
}) & (
  SO_FAR extends PathParameters ? {} : {
    PathParameters<PATH_PARAMETERS extends PathParametersType>():
      ApiConstructor<SO_FAR & PathParameters<PATH_PARAMETERS>>
}) & (
  SO_FAR extends QueryParameters | UsesMethodSupportingBodyParameter ? {} : {
    QueryParameters<QUERY_PARAMETERS extends QueryParametersType>():
      ApiConstructor<SO_FAR & QueryParameters<QUERY_PARAMETERS>>
}) & (
  SO_FAR extends MethodSupportingBodyParameter | UsesMethodSupportingQueryParameter ? {} : {
    Body<BODY_PARAMETERS>():
      ApiConstructor<SO_FAR & Body<BODY_PARAMETERS>>
})

const constructParameters = <SO_FAR extends
  AtPath &
  UsesMethod & (
    {} |
    PathParameters |
    QueryParameters |
    Body
  )>(
    soFar: SO_FAR
  ): ApiConstructor<SO_FAR> => {
    const constructor = ({
      Returns: <RESULT_TYPE>() => mergeTypes(soFar, {result: {} as RESULT_TYPE} as Returns<RESULT_TYPE>),
      ...(hasPathParameters(soFar) ? {} : {
        PathParameters: <PATH_PARAMETERS extends PathParametersType>() =>
          constructParameters(mergeTypes(soFar, {pathParams: {} as PATH_PARAMETERS} as PathParameters<PATH_PARAMETERS>))
      }),
      ...(hasQueryParameters(soFar) || isBodyParameterAPI(soFar) ? {} : {
        QueryParameters: <QUERY_PARAMETERS extends QueryParametersType>() =>
          constructParameters(mergeTypes(soFar, {queryParams: {} as QUERY_PARAMETERS} as QueryParameters<QUERY_PARAMETERS>))
      }),
      ...(hasBody(soFar) || isQueryParameterAPI(soFar) ? {} : {
        Body: <BODY_PARAMETERS>() =>
          constructParameters(mergeTypes(soFar, {bodyParams: {} as BODY_PARAMETERS} as Body<BODY_PARAMETERS>))
      })
    }) as ApiConstructor<SO_FAR>;
    return constructor;
}

const constructPath = <SO_FAR extends UsesMethod>(soFar: SO_FAR) => ({
  Path: <PATH extends string>(path: PATH) => {
    ensureMethodAndPathHaveNotBeenDefinedBefore(soFar.method, path);
    return constructParameters(mergeTypes(soFar, {path} as AtPath<PATH>))
  }
});

export const API = {
  Get: constructPath({method: Method.get} as GET),
  Delete: constructPath({method: Method.delete} as DELETE),
  Put: constructPath({method: Method.patch} as PATCH),
  Post: constructPath({method: Method.post} as POST),
  Patch: constructPath({method: Method.put} as PUT),
}
