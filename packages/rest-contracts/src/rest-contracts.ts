export enum Method {
  get = 'get',
  patch = 'patch',
  post = 'post',
  put = 'put',
  delete = 'delete',
}
export type MethodSupportingQueryParameter = Method.get | Method.delete;
export type MethodSupportingBodyParameter = Method.patch | Method.post | Method.put;

export interface UsesMethod<METHOD extends Method = Method> {
  method: METHOD;
}
export type UsesMethodSupportingQueryParameter = UsesMethod<MethodSupportingQueryParameter>;
export type UsesMethodSupportingBodyParameter = UsesMethod<MethodSupportingBodyParameter>;


export type PathParametersType = { [name: string]: string }
export interface PathParameters<PATH_PARAMETER_OBJECT extends PathParametersType = PathParametersType> {
  pathParams: PATH_PARAMETER_OBJECT;
}

export type QueryParametersType = {
  [name: string]:
    (string | undefined) |
    (string | undefined)[]
} |
undefined;
export interface QueryParameters<QUERY_PARAMETER_OBJECT extends QueryParametersType = QueryParametersType> {
  queryParams: QUERY_PARAMETER_OBJECT;
}

export const hasQueryParameters = <API extends UsesMethod & AtPath>(
  api: API
): api is API & QueryParameters<QUERY_PARAMS<API>> =>
  "queryParams" in api;


export interface Body<BODY_PARAMETER_TYPE = any> {
  bodyParams: BODY_PARAMETER_TYPE;
}

export interface Returns<RESULT_TYPE = any> {
  result: RESULT_TYPE;
}
export interface AtPath<PATH extends string = string> {
  path: PATH;
}

export const hasPathParameters = <API extends AtPath>(
  api: API
): api is API & PathParameters =>
  // Does an element of the path start with ":", such as /:id/
  api.path.split("/").some( pathElement => pathElement.indexOf(":") === 0);

export function isQueryParameterAPI(api: UsesMethod): api is UsesMethodSupportingQueryParameter {
  return api.method === Method.get || api.method === Method.delete;
}

export function isBodyParameterAPI(api: UsesMethod): api is UsesMethodSupportingBodyParameter {
  return api.method === Method.patch || api.method === Method.post || api.method === Method.put;
}

export type PATH_PARAMS_OR_NULL<APITYPE> = APITYPE extends PathParameters ? APITYPE['pathParams'] : null;
export type QUERY_PARAMS_OR_NULL<APITYPE> = APITYPE extends QueryParameters ? APITYPE['queryParams'] : null;
export type PATH_PARAMS<APITYPE> = APITYPE extends PathParameters ? APITYPE['pathParams'] : undefined;
export type QUERY_PARAMS<APITYPE> = APITYPE extends QueryParameters ? APITYPE['queryParams'] : undefined;
export type PATH_AND_QUERY_PARAMS<APITYPE> = PATH_PARAMS<APITYPE> & QUERY_PARAMS<APITYPE>;
export type BODY_PARAMS<APITYPE> = APITYPE extends Body ? APITYPE['bodyParams'] : undefined;
export type RESULT<APITYPE> = APITYPE extends Returns ? APITYPE['result'] : void;

const mergeTypes = <T, U>(t: T, u: U): T & U => Object.assign({}, t, u);

const methodAndPathPairsAlreadySpecified = new Map<string, string>()
const addPath = <SO_FAR extends UsesMethod>(soFar: SO_FAR) => ({
  Path:  <PATH extends string>(path: PATH) => {
    const {method} = soFar;
    const methodPathPair = method + path;
    // Catch the case where two REST APIs are assigned the same path, presumably because
    // someone copied a REST API to create a new one but forgot to specify a new path.
    if (methodAndPathPairsAlreadySpecified.has(methodPathPair)) {
      throw new Error(
        `The same method (${method}) and path (${path}) cannot be used for more than one REST API. Perhaps you copied a REST API and forgot to give the new one a unique path?`
      )
    }

    const trace = {} as { stack: string }
    if (Error && 'captureStackTrace' in Error) {
      ;(Error as { captureStackTrace(param: { stack?: string }): any }).captureStackTrace(trace)
    }
    methodAndPathPairsAlreadySpecified.set(
      methodPathPair,
      trace.stack || 'unknown (Error.captureStackTrace was not avaialble)'
    )

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


export const Get = createDeleteOrGet(Method.get)
export const Delete = createDeleteOrGet(Method.delete)
export const Put = createPatchPostOrPut(Method.put)
export const Post = createPatchPostOrPut(Method.post)
export const Patch = createPatchPostOrPut(Method.patch)

export const CreateAPI = {
  Get,
  Delete,
  Put,
  Post,
  Patch,
}
