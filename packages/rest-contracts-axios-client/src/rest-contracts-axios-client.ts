import Axios, { AxiosPromise, AxiosRequestConfig } from "axios";
import * as RestContracts from "rest-contracts";

export type RequestOptions = AxiosRequestConfig;

async function wrapAxiosPromise(axiosPromise: AxiosPromise) {
  try {
    const { data } = await axiosPromise;
    return data;
  } catch (error) {
    if (
      error != null && error.response && error.response.data &&
      error.response.data.error &&
      typeof (error.response.data.error) === "string"
    ) {
      throw JSON.parse(error.response.data.error);
    }
    throw error;
  }
}

function assemblePath(
  pathComponentArrayReadOnly: string[],
  parameterToIndexMap: Map<string, number>,
  pathParameters: {[attribute: string]: string | number},
): {
  pathWithParameters: string,
  remainingParameters: {[attribute: string]: any}
}  {
  const remainingParameters = {...pathParameters};
  const parameterIndexesSet = new Set(parameterToIndexMap.values());

  const pathWithParameters = "/" + pathComponentArrayReadOnly
    .map((pathComponent, index) => {
      if (!parameterIndexesSet.has(index)) {
        return pathComponent;
      }

      const pathParameterKey = pathComponent.replace(/[:?]/g, "");

      const value = pathParameters[pathParameterKey];
      delete remainingParameters[pathParameterKey];

      if (value) {
        return (typeof (value) === "string") ?
          encodeURIComponent(value) :
          (typeof (value as (number | undefined)) === "number") ?
            value.toString() :
            undefined;
      }

      return null;
    })
    .filter(Boolean)
    .join("/");

  return {pathWithParameters, remainingParameters};
}

type RequestFactory = {
  <API extends RestContracts.QueryParameterAPI<RestContracts.Method.get | RestContracts.Method.delete, undefined, undefined, any, string>>(
    api: API
  ): (options?: RequestOptions) => Promise<RestContracts.RESULT<API>>;
  <API extends RestContracts.QueryParameterAPI<RestContracts.Method.get | RestContracts.Method.delete, undefined, any, any, string>>(
    api: API
  ): (queryParams: RestContracts.QUERY_PARAMS<API>, options?: RequestOptions) => Promise<RestContracts.RESULT<API>>;
  <API extends RestContracts.BodyParameterAPI<RestContracts.Method.patch | RestContracts.Method.post | RestContracts.Method.put, undefined, any, any, string>>(
    api: API
  ): (bodyParams: RestContracts.BODY_PARAMS<API>, options?: RequestOptions) => Promise<RestContracts.RESULT<API>>;
  <API extends RestContracts.API<RestContracts.Method, any, undefined, undefined, any, string>>(
    api: API
  ): (pathParams: RestContracts.PATH_PARAMS<API>, options?: RequestOptions) => Promise<RestContracts.RESULT<API>>;
  <API extends RestContracts.QueryParameterAPI<RestContracts.Method.get | RestContracts.Method.delete, any, any, any, string>>(
    api: API
  ): (pathAndQueryParameters: RestContracts.PATH_PARAMS<API> & RestContracts.QUERY_PARAMS<API>, options?: RequestOptions) => Promise<RestContracts.RESULT<API>>;
  <API extends RestContracts.BodyParameterAPI<RestContracts.Method.patch | RestContracts.Method.post | RestContracts.Method.put, any, any, any, string>>(
    api: API
  ): (pathParams: RestContracts.PATH_PARAMS<API>, bodyParams: RestContracts.BODY_PARAMS<API>, options?: RequestOptions) => Promise<RestContracts.RESULT<API>>;
}

// No query, no path
export function requestFactory<API extends RestContracts.QueryParameterAPI<RestContracts.Method.get | RestContracts.Method.delete, undefined, undefined, any, string>>(baseUrl: string, options: RequestOptions, api: API):
 (options?: RequestOptions) => Promise<RestContracts.RESULT<API>>;

// For only one of three parameter types
//   Query only
export function requestFactory<API extends RestContracts.QueryParameterAPI<RestContracts.Method.get | RestContracts.Method.delete, undefined, any, any, string>>(baseUrl: string, options: RequestOptions, api: API):
 (queryParams: RestContracts.QUERY_PARAMS<API>, options?: RequestOptions) => Promise<RestContracts.RESULT<API>>;
//   Body only
export function requestFactory<API extends RestContracts.BodyParameterAPI<RestContracts.Method.patch | RestContracts.Method.post | RestContracts.Method.put, undefined, any, any, string>>(baseUrl: string, options: RequestOptions, api: API):
 (bodyParams: RestContracts.BODY_PARAMS<API>, options?: RequestOptions) => Promise<RestContracts.RESULT<API>>;
//   Path only
export function requestFactory<API extends RestContracts.API<RestContracts.Method, any, undefined, undefined, any, string>>(baseUrl: string, options: RequestOptions, api: API):
 (pathParams: RestContracts.PATH_PARAMS<API>, options?: RequestOptions) => Promise<RestContracts.RESULT<API>>;

// For path and query/body
//   Query
export function requestFactory<API extends RestContracts.QueryParameterAPI<RestContracts.Method.get | RestContracts.Method.delete, any, any, any, string>>(baseUrl: string, options: RequestOptions, api: API):
  (pathAndQueryParameters: RestContracts.PATH_PARAMS<API> & RestContracts.QUERY_PARAMS<API>, options?: RequestOptions) => Promise<RestContracts.RESULT<API>>;
//   Body
export function requestFactory<API extends RestContracts.BodyParameterAPI<RestContracts.Method.patch | RestContracts.Method.post | RestContracts.Method.put, any, any, any, string>>(baseUrl: string, options: RequestOptions, api: API):
  (pathParams: RestContracts.PATH_PARAMS<API>, bodyParams: RestContracts.BODY_PARAMS<API>, options?: RequestOptions) => Promise<RestContracts.RESULT<API>>;

export function requestFactory<API extends RestContracts.API<RestContracts.Method, any, any, any, any, string>>(
  baseUrl: string,
  defaultOptions: RequestOptions,
  api: API
) {
  // Remove any trailing slashes from the base URL since the path will start with a slash
  baseUrl = baseUrl.replace(/\/+$/, "")
  const {method} = api;
  const pathWithStartingSlash = (
    (baseUrl.length > 0 && baseUrl.charAt(baseUrl.length - 1) !== "/" && api.path.length > 0 && api.path.charAt(0) !== "/") ?
      "/" :
      ""
    ) + api.path;
  const pathWithoutStartingSlash = pathWithStartingSlash.substr(1);
  const pathElements = pathWithoutStartingSlash.split("/");
  const parameterToIndex = new Map<string, number>(
    pathElements
      // Pull out an [index, parameterName] pair for every path element that starts with ":"
      .map( (pathComponent, index) =>
        // Parameters must start after the first slash (/), begin with a ":",
        // and contain characters after the ":"
        (index > 0 && pathComponent.length > 1 && pathComponent.startsWith(":")) ?
          [pathComponent.replace(/[:?]/g, ""), index] as [string, number] :
          // return undefined if this isn't a path paramter so the filter (below) can remove
          // non-parameter elements from the list of parameters fed into the map constructor
          undefined
      )
      // Remove all undefineds created at positions where there was not a path parameter
      // so that the map constructor only receives parameters.
      .filter ( pathParameter => typeof(pathParameter) !== "undefined" ) as [string, number][]
  );
  const hasPathParameters = parameterToIndex.size > 0;


  switch (method) {
    case RestContracts.Method.get:
    case RestContracts.Method.delete: {
      const methodFunction = method === RestContracts.Method.get ? Axios.get : Axios.delete;

      if (hasPathParameters) {
        // Return a function with path parameters and query parameters specified together as one parameter
        return (
          parameters: RestContracts.PATH_PARAMS<API> & RestContracts.QUERY_PARAMS<API>,
          options: RequestOptions = {}
        ) => {
          const {pathWithParameters, remainingParameters} = assemblePath(pathElements, parameterToIndex, parameters);

          return wrapAxiosPromise(methodFunction(baseUrl + pathWithParameters, {...defaultOptions, ...options, params: remainingParameters }));
        };
      } else {
        // Return a function with just query parameters
        return (
          queryParameters: RestContracts.QUERY_PARAMS<API>,
          options: RequestOptions = {}
        ) => {
          return wrapAxiosPromise(methodFunction(baseUrl + pathWithStartingSlash, {...defaultOptions, ...options, params: queryParameters }));
        };
      }
    }
    case RestContracts.Method.post:
    case RestContracts.Method.put:
    case RestContracts.Method.patch: {
      const methodFunction = {
        post: Axios.post,
        put: Axios.put,
        patch: Axios.patch,
      }[method];
      if (hasPathParameters) {
        // Return a function with path parameters followed by body parameters
        return (
          pathParameters: RestContracts.PATH_PARAMS<API>,
          bodyParameters: RestContracts.BODY_PARAMS<API>,
          options: RequestOptions = {},
        ) => {
          const {pathWithParameters} = assemblePath(pathElements, parameterToIndex, pathParameters);

          return wrapAxiosPromise(methodFunction(baseUrl + pathWithParameters, bodyParameters, {...defaultOptions, ...options }));
        };
      } else {
        // Return a function with body parameters but no path parameters
        return (
          bodyParameters: RestContracts.BODY_PARAMS<API>,
          options: RequestOptions = {},
        ) => {
          return wrapAxiosPromise(methodFunction(baseUrl + pathWithStartingSlash, bodyParameters, {...defaultOptions, ...options }));
        };
      }
    }
  }

  return undefined;
}

/**
 * Create a factory that will generated a promise-based client functions
 * to call the corresponding API function on the server.
 *
 * @param baseUrl The URL of the API server
 * @param defaultOptions Use to set default options for all API calls
 *   generated by this factory, which can be overriden during individual
 *   calls.  Options are timeoutInMs (default 0 indicating no timeout),
 *   headers (none), noCache (false), and withCredentials (true).
 */
export const getClientCreationFunction = (
  baseUrl: string = "",
  defaultOptions: RequestOptions = {}
) =>
  ( (api: RestContracts.API, options: RequestOptions = {}) => requestFactory(
    baseUrl,
    {...defaultOptions, ...options},
    api
  ) ) as RequestFactory;
