import * as RestContracts from "rest-contracts";

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


function encodeQueryItem(key: string, value: string | number | boolean | null | undefined): string {
  return encodeURIComponent(key) + "=" + encodeURIComponent(
    (typeof(value) === "number") ?
      value.toString() :
    (typeof (value) === "boolean") ?
      (value ? "true" : "") : // The empty string is falseish
    (value != null) ?
      value:
      ""
  );
}

function addQueryToUrl(url: string, params: RestContracts.QueryParametersType = {}): string {
  const items = ([] as string[]).concat(...(Object.entries(params)
  .filter( ([key, value]) => (value as typeof value | null | undefined) != null )
  .map( ([key, value]) =>
    Array.isArray(value) ?
      value.map( entry => encodeQueryItem(key, entry) ) :
      [ encodeQueryItem(key, value) ]
  )));
  let result = url;
  if (items.length > 0) {
    result += (result.indexOf("?") === -1) ? "?" : "&";
    result += items.join("&");
  }

  return result;
}

export interface RequestOptions {
  timeoutInMs?: number;
  headers?: {[name: string]: string};
  noCache?: boolean;
  withCredentials?: boolean;
}

function request<T>(params: RequestOptions & {
  method: RestContracts.Method,
  url: string,
  bodyParameters?: any,
}) {
  const {
    method,
    url,
    bodyParameters,
    headers = {},
    noCache = false,
    timeoutInMs = 0,
    withCredentials = true,
  } = params;

  return new Promise<T>((resolve, reject) => {

    try {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.timeout = timeoutInMs;
      xhr.withCredentials = withCredentials;

      const lcHeaderMap = new Map<string, string>(
        Object.entries(headers).map( ([key, value ]) =>
          ([key.toLowerCase(), value] as [string, string])
        )
      );

      if (!lcHeaderMap.has("accept")) {
        lcHeaderMap.set("accept", "application/json, text/plain, text/javascript");
      }

      if (noCache) {
        lcHeaderMap.set("cache-control", "no-cache");
        xhr.setRequestHeader("cache-control", "no-cache");
      }

      lcHeaderMap.forEach( (value, key) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.onload = (event) => {
        const {status, statusText, responseText} = xhr;
        // const responseHeaders = xhr.getAllResponseHeaders().split("\n");
        // tslint:disable-next-line:no-magic-numbers
        const success = xhr.status >= 200 && xhr.status < 300;
        if (!success) {
          reject({status, statusText, responseText});
        } else {
          let responseJSON;
          try {
            responseJSON = JSON.parse(responseText || "");
            resolve(responseJSON);
          } catch (e) {
            reject({status, statusText: "JSON Parse error", responseText});
          }
        }
      };

      xhr.onerror = (event) => {
        const {status, statusText, responseText} = xhr;
        reject({status, statusText, responseText});
      };

      xhr.ontimeout = (event) => {
        const {status, statusText, responseText} = xhr;
        reject({status, statusText, responseText});
      };

      if ( (
              method === RestContracts.Method.post ||
              method === RestContracts.Method.put ||
              method === RestContracts.Method.patch
            ) &&
            bodyParameters != null
      ) {
        xhr.setRequestHeader("content-type", "application/json");
        xhr.send(JSON.stringify(bodyParameters));
      } else {
        xhr.send();
      }
    } catch (err) {
      reject(err);
    }
  });
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
      if (hasPathParameters) {
        // Return a function with path parameters and query parameters specified together as one parameter
        return (
          parameters: RestContracts.PATH_PARAMS<API> & RestContracts.QUERY_PARAMS<API>,
          options: RequestOptions = {}
        ) => {
          const {pathWithParameters, remainingParameters} = assemblePath(pathElements, parameterToIndex, parameters);

          return request<RestContracts.RESULT<API>>({
            ...defaultOptions,
            ...options,
            method,
            url: addQueryToUrl(baseUrl + pathWithParameters,  remainingParameters),
          })
        };
      } else {
        // Return a function with just query parameters
        return (
          queryParameters: RestContracts.QUERY_PARAMS<API>,
          options: RequestOptions = {}
        ) => {
          return request<RestContracts.RESULT<API>>({
            ...defaultOptions,
            ...options,
            method,
            url: addQueryToUrl(baseUrl + pathWithStartingSlash,  queryParameters)
          })
        };
      }
    }
    case RestContracts.Method.post:
    case RestContracts.Method.put:
    case RestContracts.Method.patch: {
      if (hasPathParameters) {
        // Return a function with path parameters followed by body parameters
        return (
          pathParameters: RestContracts.PATH_PARAMS<API>,
          bodyParameters: RestContracts.BODY_PARAMS<API>,
          options: RequestOptions = {},
        ) => {
          const {pathWithParameters} = assemblePath(pathElements, parameterToIndex, pathParameters);

          return request<RestContracts.RESULT<API>>({
            ...defaultOptions,
            ...options,
            method,
            url: baseUrl + pathWithParameters,
            bodyParameters
          });
        };
      } else {
        // Return a function with body parameters but no path parameters
        return (
          bodyParameters: RestContracts.BODY_PARAMS<API>,
          options: RequestOptions = {},
        ) => {
          return request<RestContracts.RESULT<API>>({
            ...defaultOptions,
            ...options,
            method,
            url: baseUrl + pathWithStartingSlash,
            bodyParameters
          });
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
  baseUrl: string,
  defaultOptions: RequestOptions = {}
) =>
  ( (api: RestContracts.API, options: RequestOptions = {}) => requestFactory(
    baseUrl,
    {...defaultOptions, ...options},
    api
  ) ) as RequestFactory;
