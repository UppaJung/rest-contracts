export enum Method {
  get = 'get',
  patch = 'patch',
  post = 'post',
  put = 'put',
  delete = 'delete',
}

export type PathParametersType = { [name: string]: string } | undefined
export type QueryParametersType = {
  [name: string]:
    (string | undefined) |
    (string | undefined)[]
} |
undefined;

export interface BaseAPI<
  METHOD extends Method = Method,
  PATH_PARAMETER_TYPE extends PathParametersType = any,
  QUERY_PARAMETER_TYPE extends QueryParametersType = any,
  BODY_PARAMETER_TYPE = any,
  RESULT_TYPE = any,
  PATH extends string = string
> {
  path: PATH
  pathParams: PATH_PARAMETER_TYPE
  queryParams: QUERY_PARAMETER_TYPE
  bodyParams: BODY_PARAMETER_TYPE
  result: RESULT_TYPE
  method: METHOD
  allParams: QUERY_PARAMETER_TYPE & PATH_PARAMETER_TYPE & BODY_PARAMETER_TYPE
}

export interface QueryParameterAPI<
  METHOD extends Method.get | Method.delete = Method.get | Method.delete,
  PATH_PARAMETER_TYPE extends PathParametersType | undefined = any,
  QUERY_PARAMETER_TYPE extends QueryParametersType | undefined = any,
  RESULT_TYPE = any,
  PATH extends string = string
> extends BaseAPI<METHOD, PATH_PARAMETER_TYPE, QUERY_PARAMETER_TYPE, undefined, RESULT_TYPE, PATH> {}
export function isQueryParameterAPI(api: API): api is QueryParameterAPI {
  return api.method === Method.get || api.method === Method.delete;
}

export interface BodyParameterAPI<
  METHOD extends Method.put | Method.post | Method.patch = Method.put | Method.post | Method.patch,
  PATH_PARAMETER_TYPE extends PathParametersType | undefined = any,
  BODY_PARAMETER_TYPE = any,
  RESULT_TYPE = any,
  PATH extends string = string
> extends BaseAPI<METHOD, PATH_PARAMETER_TYPE, undefined, BODY_PARAMETER_TYPE, RESULT_TYPE, PATH> {}
export function isBodyParameterAPI(api: API): api is BodyParameterAPI {
  return api.method === Method.patch || api.method === Method.post || api.method === Method.put;
}

export type API = QueryParameterAPI | BodyParameterAPI;

export interface GetAPI<
  PATH_PARAMETER_TYPE extends PathParametersType,
  QUERY_PARAMETER_TYPE extends QueryParametersType,
  RESULT_TYPE,
  PATH extends string
> extends QueryParameterAPI<Method.get, PATH_PARAMETER_TYPE, QUERY_PARAMETER_TYPE, RESULT_TYPE, PATH> {}

export interface DeleteAPI<
  PATH_PARAMETER_TYPE extends PathParametersType,
  QUERY_PARAMETER_TYPE extends QueryParametersType,
  RESULT_TYPE,
  PATH extends string
> extends QueryParameterAPI<Method.delete, PATH_PARAMETER_TYPE, QUERY_PARAMETER_TYPE, RESULT_TYPE, PATH> {}

export interface PutAPI<
  PATH_PARAMETER_TYPE extends PathParametersType,
  BODY_PARAMETER_TYPE,
  RESULT_TYPE,
  PATH extends string
> extends BodyParameterAPI<Method.put, PATH_PARAMETER_TYPE, BODY_PARAMETER_TYPE, RESULT_TYPE, PATH> {}

export interface PostAPI<
  PATH_PARAMETER_TYPE extends PathParametersType,
  BODY_PARAMETER_TYPE,
  RESULT_TYPE,
  PATH extends string
> extends BodyParameterAPI<Method.post, PATH_PARAMETER_TYPE, BODY_PARAMETER_TYPE, RESULT_TYPE, PATH> {}

export interface PatchAPI<
  PATH_PARAMETER_TYPE extends PathParametersType,
  BODY_PARAMETER_TYPE,
  RESULT_TYPE,
  PATH extends string
> extends BodyParameterAPI<Method.patch, PATH_PARAMETER_TYPE, BODY_PARAMETER_TYPE, RESULT_TYPE, PATH> {}

type ConditionalAPI<
  METHOD extends Method,
  PATH_PARAMETER_TYPE extends PathParametersType,
  QUERY_PARAMETER_TYPE extends QueryParametersType,
  BODY_PARAMETER_TYPE,
  RESULT_TYPE,
  PATH extends string
> = METHOD extends Method.get
  ? GetAPI<PATH_PARAMETER_TYPE, QUERY_PARAMETER_TYPE, RESULT_TYPE, PATH>
  : METHOD extends Method.delete
    ? DeleteAPI<PATH_PARAMETER_TYPE, QUERY_PARAMETER_TYPE, RESULT_TYPE, PATH>
    : METHOD extends Method.patch
      ? PutAPI<PATH_PARAMETER_TYPE, BODY_PARAMETER_TYPE, RESULT_TYPE, PATH>
      : METHOD extends Method.post
        ? PutAPI<PATH_PARAMETER_TYPE, BODY_PARAMETER_TYPE, RESULT_TYPE, PATH>
        : METHOD extends Method.put
          ? PutAPI<PATH_PARAMETER_TYPE, BODY_PARAMETER_TYPE, RESULT_TYPE, PATH>
          : never


export type PATH_PARAMS<APITYPE extends API> = APITYPE['pathParams']
export type QUERY_PARAMS<APITYPE extends API> = APITYPE['queryParams']
// export type DiffTypes<T, U> = T extends U ? never : T;
export type PATH_AND_QUERY_PARAMS<APITYPE extends API> = PATH_PARAMS<APITYPE> & QUERY_PARAMS<APITYPE>;
//  DiffTypes<PATH_PARAMS<APITYPE> & QUERY_PARAMS<APITYPE>, undefined>;
export type BODY_PARAMS<APITYPE extends API> = APITYPE['bodyParams'];
export type RESULT<APITYPE extends API> = APITYPE['result']

const methodAndPathPairsAlreadySpecified = new Map<string, string>()

function create<
  METHOD extends Method,
  PATH_PARAMETER_TYPE extends PathParametersType,
  QUERY_PARAMETER_TYPE extends QueryParametersType,
  BODY_PARAMETER_TYPE,
  RESULT_TYPE,
  PATH extends string
>(
  method: Method,
  path: string
): ConditionalAPI<METHOD, PATH_PARAMETER_TYPE, QUERY_PARAMETER_TYPE, BODY_PARAMETER_TYPE, RESULT_TYPE, PATH> {
  const methodPathPair = method + path
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

  return {
    method,
    path,
  } as ConditionalAPI<METHOD, PATH_PARAMETER_TYPE, QUERY_PARAMETER_TYPE, BODY_PARAMETER_TYPE, RESULT_TYPE, PATH>
}

function createReturns<
  PATH_PARAMETER_TYPE extends PathParametersType,
  QUERY_PARAMETER_TYPE extends QueryParametersType,
  BODY_PARAMETER_TYPE,
  METHOD extends Method
>(method: METHOD) {
  function Returns<RESULT_TYPE>() {
    return {
      Path: <PATH extends string>(path: PATH) =>
        create<METHOD, PATH_PARAMETER_TYPE, QUERY_PARAMETER_TYPE, BODY_PARAMETER_TYPE, RESULT_TYPE, PATH>(method, path),
    }
  }
  const NoResultToReturn = {
    Path: <PATH extends string>(path: PATH) =>
      create<METHOD, PATH_PARAMETER_TYPE, QUERY_PARAMETER_TYPE, BODY_PARAMETER_TYPE, void, PATH>(method, path),
  }

  return { Returns, NoResultToReturn }
}

function createBodyParameter<PATH_PARAMETER_TYPE extends PathParametersType, METHOD extends Method>(
  method: METHOD
) {
  function BodyParameters<BODY_PARAMETER_TYPE>() {
    return createReturns<PATH_PARAMETER_TYPE, undefined, BODY_PARAMETER_TYPE, METHOD>(method)
  }
  const NoBodyParameters = createReturns<PATH_PARAMETER_TYPE, undefined, undefined, METHOD>(method)

  return { BodyParameters, NoBodyParameters }
}

function createQueryParameter<PATH_PARAMETER_TYPE extends PathParametersType, METHOD extends Method>(
  method: METHOD
) {
  function QueryParameters<QUERY_PARAMETER_TYPE extends QueryParametersType>() {
    return createReturns<PATH_PARAMETER_TYPE, QUERY_PARAMETER_TYPE, undefined, METHOD>(method)
  }
  const NoQueryParameters = createReturns<PATH_PARAMETER_TYPE, undefined, undefined, METHOD>(method)

  return { QueryParameters, NoQueryParameters }
}

function createPathParameterForQueryParameterMethod<METHOD extends Method.get | Method.delete>(method: METHOD) {
  function PathParameters<PATH_PARAMETER_TYPE extends PathParametersType>() {
    return createQueryParameter<PATH_PARAMETER_TYPE, METHOD>(method)
  }
  const NoPathParameters = createQueryParameter<undefined, METHOD>(method)

  return { PathParameters, NoPathParameters }
}

function createPathParameterForBodyParameterMethod<METHOD extends Method.patch | Method.post | Method.put>(
  method: METHOD
) {
  function PathParameters<PATH_PARAMETER_TYPE extends PathParametersType>() {
    return createBodyParameter<PATH_PARAMETER_TYPE, METHOD>(method)
  }
  const NoPathParameters = createBodyParameter<undefined, METHOD>(method)

  return { PathParameters, NoPathParameters }
}

export const Get = createPathParameterForQueryParameterMethod(Method.get)
export const Delete = createPathParameterForQueryParameterMethod(Method.delete)
export const Put = createPathParameterForBodyParameterMethod(Method.put)
export const Post = createPathParameterForBodyParameterMethod(Method.post)
export const Patch = createPathParameterForBodyParameterMethod(Method.patch)

export const CreateAPI = {
  Get,
  Delete,
  Put,
  Post,
  Patch,
}
