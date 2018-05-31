import * as Lambda from "aws-lambda";
import * as RestContracts from "rest-contracts";

export interface APIGatewayProxyEvent<API extends RestContracts.UsesMethod & RestContracts.AtPath> extends Lambda.APIGatewayProxyEvent {
  pathParameters: RestContracts.PATH_PARAMS_OR_NULL<API>;
  queryStringParameters: RestContracts.QUERY_PARAMS_OR_NULL<API>;
}

export interface AugmentedAPIGatewayProxyEventForBodyMethod<
  API extends RestContracts.UsesMethodSupportingBodyParameter & RestContracts.AtPath
> extends APIGatewayProxyEvent<API> {
  params: RestContracts.PATH_PARAMS<API>
  bodyObject: RestContracts.BODY_PARAMS<API>
};
export interface AugmentedAPIGatewayProxyEventForQueryMethod<
  API extends RestContracts.UsesMethodSupportingQueryParameter & RestContracts.AtPath
> extends APIGatewayProxyEvent<API> {
  params: RestContracts.PATH_AND_QUERY_PARAMS<API>
};

export type AugmentedAPIGatewayProxyEvent<
  API extends RestContracts.UsesMethod & RestContracts.AtPath
> = API extends RestContracts.UsesMethodSupportingBodyParameter ?
    AugmentedAPIGatewayProxyEventForBodyMethod<API> :
  API extends RestContracts.UsesMethodSupportingQueryParameter ?
    AugmentedAPIGatewayProxyEventForQueryMethod<API> :
  never;

export enum ResultEncoding {
  JSON = "JSON",
  BinaryToBeBase64Encoded = "BinaryToBeBase64Encoded",
  RawString = "RawString"
}

export type LambdaErrorHandler = (
  err: any,
  callback: Lambda.APIGatewayProxyCallback
) => void;

const defaultErrorHandler = (err: any, callback: Lambda.APIGatewayProxyCallback) => {
  // Handle errors that provide a status code (via either status or statusCode field)
  // and message
  const statusCode: number | undefined =
    (typeof(err.statusCode) === "number") ? err.statusCode :
    (typeof(err.status) === "number") ? err.status :
      undefined;
  if (typeof(statusCode) === "number") {
    // Errors that contain a status code are meant to be handled
    // and return proper HTTP responses so that additional lambda
    // integration resonses need not be configured
    const handledError: Lambda.APIGatewayProxyResult = {
      statusCode,
      body: JSON.stringify(err)
    }
    callback(undefined, handledError);
  } else {
    // Error that do not contain a status code will be returned
    // directly to lambda which will rely on the developer
    // configuring an integration response for that error type
    // https://docs.aws.amazon.com/apigateway/latest/developerguide/handle-errors-in-lambda-integration.html
    return callback(err);
  }
}

/**
 * Wrap a handler for a lambda API to automatically parse the body parameters,
 * create a simple way to access all parameters, and restrict parameter types
 * to those specified by the API.
 *
 * @param api The rest-contracts API specification, which determines the method, path
 * and typings.
 * @param handler The handler to be wrapped, which is identical to the type normally
 * used for a lambda API except that:
 *   (1) the type for pathParameters is RestContracts.PATH_PARAMS<typeof api>
 *   (2) the type for queryStringParameters is RestContracts.QUERY_PARAMS<typeof api>
 *   (3) a new "bodyObject" attribute of type RestContracts.BODY_PARAMS<typeof api>
 *       contains the JSON-parsed body (if any) for POST/PUT/PATCH APIs only.
 *   (4) a new "params" attribute combines the query parameters, path parameters, and
 *       (for POST methods only) the body parameters.  Body parameters are kept separate
 *       for PUT/PATCH methods because the body typically represents an object to be stored
 *       (PUT) or fields of that object (PATCH) and not individual parameters.
 *       If parameters in the body, query, or path have the same name, those in the query
 *       parameter take precedence (will be written over) those in the body parameter
 *       (again, body only being included for POST),
 *       and those in the path parameter will overwrite those in the query/body parameter.
 *       (This ordering was chosen because attackers are more likely to have control
 *        of the body contents than the query, and more likely to have control over
 *        the query parameters than the path parameters.)
 */
export const wrapLambdaParameters = <API extends RestContracts.UsesMethod & RestContracts.AtPath>(
  api: API,
  handler: (
    event: AugmentedAPIGatewayProxyEvent<API>,
    context: Lambda.Context,
    callback: Lambda.APIGatewayProxyCallback
  ) => void
) => (
  event: Lambda.APIGatewayProxyEvent,
  context: Lambda.Context,
  callback: Lambda.APIGatewayProxyCallback
) => {
  let optionalBodyObject = {} as {bodyObject: RestContracts.BODY_PARAMS<API>} | {};
  if ( RestContracts.isBodyParameterAPI(api) &&
       typeof(event.body) === "string" &&
       event.body.length > 0) {
    try {
      optionalBodyObject = JSON.parse(event.body) as {bodyObject: RestContracts.BODY_PARAMS<API>};
    } catch (err) {
      // Ignore parse errors and just return undefined for the body object
    }
  }

  if (RestContracts.isQueryParameterAPI(api)) {
    const augmentedEvent = {
      ...event,
      ...optionalBodyObject,
      params: {
        ...(event.queryStringParameters || {}),
        ...(event.pathParameters || {}),
      } as RestContracts.PATH_AND_QUERY_PARAMS<API>
    } as AugmentedAPIGatewayProxyEventForQueryMethod<typeof api>;
    handler( augmentedEvent as AugmentedAPIGatewayProxyEvent<API>, context, callback );

    return;

  } else if (RestContracts.isBodyParameterAPI(api)) {
    const augmentedEvent = {
      ...event,
      ...optionalBodyObject,
      params: event.pathParameters || {}
    } as AugmentedAPIGatewayProxyEventForBodyMethod<typeof api>;

    handler( augmentedEvent as AugmentedAPIGatewayProxyEvent<API>, context, callback );

    return;
  } else {
    throw new Error("Invalid method");
  }
};

/**
 * Wrap a handler for a lambda API so that it can return a result promise,
 * automatically parse the body parameters, create a simple way to access all parameters,
 * and restrict parameter types to those specified by the API.
 *
 * If no error was caught (none thrown):
 *   An HTTP status of 404 is sent when a GET requests which may not have thrown an
 *   error, but for which the result was undefined (implying none was found).
 *   An HTTP status of 201 is sent in response to successful PUT requests.
 *   An HTTP status of 200 (success) is sent for all other successful requests
 *   (those for which no error was caught).
 *
 * @param api The rest-contracts API specification, which determines the method, path
 * and typings.
 * @param handler A handler which returns RestContracts.RESULT<typeof api> or
 * Promise<RestContracts.RESULT<typeof api>> instead of using a callback function.
 * The first two parameters are identical to a normal lambda API function except that
 * the first (event) parameter is a copy for which:
 *   (1) the type for pathParameters is RestContracts.PATH_PARAMS<typeof api>
 *   (2) the type for queryStringParameters is RestContracts.QUERY_PARAMS<typeof api>
 *   (3) a new "bodyObject" attribute contains the JSON-parsed body
 *       (if any) of type RestContracts.BODY_PARAMS<typeof api>
 *   (4) a new "params" attribute combines the query parameters, path parameters, and
 *       (for POST methods only) the body parameters.  Body parameters are kept separate
 *       for PUT/PATCH methods because the body typically represents an object to be stored
 *       (PUT) or fields of that object (PATCH) and not individual parameters.
 *       If parameters in the body, query, or path have the same name, those in the query
 *       parameter take precedence (will be written over) those in the body parameter
 *       (again, body only being included for POST),
 *       and those in the path parameter will overwrite those in the query/body parameter.
 *       (This ordering was chosen because attackers are more likely to have control
 *        of the body contents than the query, and more likely to have control over
 *        the query parameters than the path parameters.)
 * The final parameter contains the proxy result to be sent back to lambda,
 * so that the handler can set a custom statusCode, body, or headers.
 * @param options.errorHandler An optional error handler that catches exceptions and
 * handles them by calling the standard lambda callback function.  If not set,
 * a default exception handler looks for the HTTP status to return in either the
 * statusCode or status attribute of the error that was thrown, and sets the
 * response body to the JSON encoding of the error.  If neither statusCode nor
 * status is set to a number, the default handler calls callback() with the
 * error as the first parameter and lets lambda figure out how to handle it
 * based on your configured integration reponse, as documented in:
 * https://docs.aws.amazon.com/apigateway/latest/developerguide/handle-errors-in-lambda-integration.html
 * @param options.resultEncoding Defaults to JSON encoding.  If set to
 * ResultEncoding.RawString then the result will not be JSON encoded if it's already a string.
 * If set to ResultEncoding and the result is a buffer, it will be base64 encoded.
 * @param options.defaultHeaders Sets response headres to be used for every call to this API
 * @param options.corsDomains Sets the Access-Control-Allow-Origin resonse header for CORS support.
 * Use "*" for all domains or a comma-separated list of domains
 *
 *
 */
export const wrapLambdaParametersAndResult = <
  API extends RestContracts.UsesMethod & RestContracts.AtPath & (RestContracts.Returns | {})
  >(
  api: API,
  handler: (
    event: AugmentedAPIGatewayProxyEvent<API>,
    context: Lambda.Context,
    apiGatewayProxyResult: Partial<Lambda.APIGatewayProxyResult> & {headers: {[headerName: string]: string}}
  ) => PromiseLike<RestContracts.RESULT<API>> | RestContracts.RESULT<API> | undefined,
  options?: {
    errorHandler?: LambdaErrorHandler,
    defaultHeaders?: {[headerName: string]: string},
    corsDomains?: "*" | string[],
    resultEncoding?: ResultEncoding
  } & (
    {} |
    {returnResultAsRawString: boolean} |
    {base64EncodeBinaryResult: boolean}
  )
) => {
  const{
    errorHandler = defaultErrorHandler,
    defaultHeaders = {},
    resultEncoding = ResultEncoding.JSON,
    // tslint:disable-next-line:no-unnecessary-initializer
    corsDomains = undefined
  } = options || {};
  let corsDomainSet: Set<string>;
  if (corsDomains === "*") {
    // For CORS always-allowed, we can set a default header
    defaultHeaders["Access-Control-Allow-Origin"] = "*";
  } else if (Array.isArray(corsDomains)) {
    // For CORS allowing only a specific list (set) of origins,
    // we can create a set of origins (forcing to lowercase to
    // make them case insensitive)
    corsDomainSet = new Set(corsDomains.map( o => o.toLowerCase()));
  }

  return wrapLambdaParameters( api, async (
    event: AugmentedAPIGatewayProxyEvent<API>,
    context: Lambda.Context,
    callback: Lambda.APIGatewayProxyCallback
  ) => {
    try {
      const headers = {...defaultHeaders};
      // If the origin is among the CORS-allowed origins specified in the corsDomains parameter,
      // return the origin as the CORS-allowed origin to the client to let it know CORS is indeed allowed
      if (corsDomainSet && corsDomainSet.has(event.headers.origin.toLowerCase()) ) {
        // The origin is among those that are allowed to make cross-origin requests to this API
        headers["Access-Control-Allow-Origin"] = event.headers.origin;
      }
      const apiResult: Partial<Lambda.APIGatewayProxyResult> & {headers: {[headerName: string]: string}} = {
        headers
      };
            // tslint:disable-next-line:await-promise
      const handlersResult = await handler( event, context, apiResult );
      // Create the correct statusCode for result provided by the handler
      // tslint:disable:no-magic-numbers
      const statusCode =
          (api.method === RestContracts.Method.get && typeof(handlersResult) === "undefined") ? 404 :
          (api.method === RestContracts.Method.put) ? 201 :
          200;
        // tslint:enable:no-magic-numbers

      // Encode the body object as specified by the ResultEncoding option (JSON is default)
      const bodyObject = (
          (typeof(handlersResult as any) === "string") &&
          (resultEncoding === ResultEncoding.RawString)
        ) ? {
          body: handlersResult as string
        } : (
          (resultEncoding === ResultEncoding.BinaryToBeBase64Encoded) &&
          (typeof(handlersResult) === "object") &&
          ((handlersResult as object) instanceof Buffer)
        ) ? {
          body: handlersResult.toString('base64'),
          isBase64Encoded: true
        } : {
          body: JSON.stringify(handlersResult)
        };
        // Copy in any part of the API result set by the handler,
        // which overrides any values we have set.

      callback(undefined, {statusCode, ...bodyObject, ...apiResult});
    } catch (err) {
      errorHandler(err, callback);
    }
  });
}
