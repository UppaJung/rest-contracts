import * as RestContracts from "rest-contracts";

function assemblePath(
  pathComponentArrayReadOnly: string[],
  parameterToIndexMap: Map<string, number>,
  pathParameters: RestContracts.PathParametersType & RestContracts.QueryParametersType | {} = {},
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

export interface ClientException {
  status?: number;
  statusText?: string;
  responseText?: string;
}

function isExceptionWithStatus(err: any): err is {status: number} {
  return typeof(err) === "object" && "status" in err && typeof(err.status) === "number";
}

export const HttpStatusCodes = {
  // CONTINUE: 100,
  // SWITCHING_PROTOCOLS: 101,
  // PROCESSING: 102,
  OK: 200,
  // CREATED: 201,
  // ACCEPTED: 202,
  // NON_AUTHORITATIVE_INFORMATION: 203,
  // RESET_CONTENT: 205,
  // PARTIAL_CONTENT: 206,
  // MULTI_STATUS: 207,
  HIGHEST_POSSIBLE_SUCCESS_STATUS: 299,
  // MULTIPLE_CHOICES: 300,
  // MOVED_PERMANENTLY: 301,
  // MOVED_TEMPORARILY: 302,
  // SEE_OTHER: 303,
  // NOT_MODIFIED: 304,
  // USE_PROXY: 305,
  // TEMPORARY_REDIRECT: 307,
  // PERMANENT_REDIRECT: 308,
  // BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  // PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  // METHOD_NOT_ALLOWED: 405,
  // NOT_ACCEPTABLE: 406,
  // PROXY_AUTHENTICATION_REQUIRED: 407,
  // REQUEST_TIMEOUT: 408,
  // CONFLICT: 409,
  // GONE: 410,
  // LENGTH_REQUIRED: 411,
  // PRECONDITION_FAILED: 412,
  // REQUEST_TOO_LONG: 413,
  // REQUEST_URI_TOO_LONG: 414,
  // UNSUPPORTED_MEDIA_TYPE: 415,
  // REQUESTED_RANGE_NOT_SATISFIABLE: 416,
  // EXPECTATION_FAILED: 417,
  // INSUFFICIENT_SPACE_ON_RESOURCE: 419,
  // METHOD_FAILURE: 420,
  // UNPROCESSABLE_ENTITY: 422,
  // FAILED_DEPENDENCY: 424,
  // PRECONDITION_REQUIRED: 428,
  // TOO_MANY_REQUESTS: 429,
  // REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  // INTERNAL_SERVER_ERROR: 500,
  // NOT_IMPLEMENTED: 501,
//  BAD_GATEWAY: 502,
//  SERVICE_UNAVAILABLE: 503,
//  GATEWAY_TIMEOUT: 504,
//  HTTP_VERSION_NOT_SUPPORTED: 505,
//  INSUFFICIENT_STORAGE: 507,
//  NETWORK_AUTHENTICATION_REQUIRED: 511,
};

export const ExceptionChecks = {
  isUnauthorized: (err: any) =>
    isExceptionWithStatus(err) && err.status === HttpStatusCodes.UNAUTHORIZED,
  isForbidden: (err: any) =>
    isExceptionWithStatus(err) && err.status === HttpStatusCodes.FORBIDDEN,
  isUnauthorizedOrForbidden: (err: any) =>
    isExceptionWithStatus(err) && (
      err.status === HttpStatusCodes.UNAUTHORIZED || err.status === HttpStatusCodes.FORBIDDEN
    ),
  isNotFound: (err: any) =>
    isExceptionWithStatus(err) && err.status === HttpStatusCodes.NOT_FOUND,
};


export interface RequestOptions {
  timeoutInMs?: number;
  headers?: {[name: string]: string};
  noCache?: boolean;
  withCredentials?: boolean;
}

function request<T>(params: RequestOptions & {
  method: RestContracts.Method,
  url: string,
  body?: any,
}) {
  const {
    method,
    url,
    body,
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
        const success = xhr.status >= HttpStatusCodes.OK && xhr.status <= HttpStatusCodes.HIGHEST_POSSIBLE_SUCCESS_STATUS;
        if (!success) {
          reject({status, statusText, responseText} as ClientException);
        } else {
          let responseJSON;
          try {
            responseJSON = JSON.parse(responseText || "");
            resolve(responseJSON);
          } catch (e) {
            reject({status, statusText: "JSON Parse error", responseText} as ClientException);
          }
        }
      };

      xhr.onerror = (event) => {
        const {status, statusText, responseText} = xhr;
        reject({status, statusText, responseText} as ClientException);
      };

      xhr.ontimeout = (event) => {
        const {status, statusText, responseText} = xhr;
        reject({status, statusText, responseText} as ClientException);
      };

      if ( (
              method === RestContracts.Method.post ||
              method === RestContracts.Method.put ||
              method === RestContracts.Method.patch
            ) &&
            body != null
      ) {
        xhr.setRequestHeader("content-type", "application/json");
        xhr.send(JSON.stringify(body));
      } else {
        xhr.send();
      }
    } catch (err) {
      reject(err);
    }
  });
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
  defaultBaseUrl = "",
  factoryDefaultOptions: RequestOptions = {}
) => <API extends RestContracts.AtPath & RestContracts.UsesMethod>(
    api: API,
    baseUrl: string = defaultBaseUrl,
    apiDefaultOptions: RequestOptions = {},
  ): RestContracts.ClientFunction<API, RequestOptions> => {
    const defaultOptions: RequestOptions = {...factoryDefaultOptions, ...apiDefaultOptions};
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
    const hasBody = RestContracts.hasBody(api);

    if (RestContracts.isQueryParameterAPI(api)) {
      return ( (...args: any[]) => {
        const hasQueryParameters = RestContracts.hasQueryParameters(api);
        const parameters = (
          (hasPathParameters || hasQueryParameters) ?
          args.shift() : undefined
        ) as RestContracts.PATH_AND_QUERY_PARAMS<API>;
        const options = {...defaultOptions, ...(args.shift() || {} as RequestOptions)};
        const {pathWithParameters, remainingParameters} = assemblePath(pathElements, parameterToIndex, parameters);

        return request<RestContracts.RESULT<API>>({
          ...options,
          method,
          url: addQueryToUrl(baseUrl + pathWithParameters,  remainingParameters),
        });
      } ) as RestContracts.ClientFunction<API, RequestOptions> ;
    } else if (RestContracts.isBodyParameterAPI(api)) {
      return ( (...args: any[]) => {
        const parameters = (hasPathParameters ? args.shift() : undefined) as RestContracts.PATH_PARAMS<API>;
        const body = (hasBody ? args.shift() : undefined) as RestContracts.Body<API>;
        const options = {...defaultOptions, ...(args.shift() || {} as RequestOptions)};
        const {pathWithParameters, remainingParameters} = assemblePath(pathElements, parameterToIndex, parameters);

        return request<RestContracts.RESULT<API>>({
          ...options,
          method,
          body,
          url: addQueryToUrl(baseUrl + pathWithParameters,  remainingParameters),
        });
      } ) as RestContracts.ClientFunction<API, RequestOptions> ;
    }
    throw new Error("Illegal method");
  }
