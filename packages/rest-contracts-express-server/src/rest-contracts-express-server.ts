import * as express from "express";
import * as RestContracts from "rest-contracts";
import {BODY_PARAMS, PATH_PARAMS, QUERY_PARAMS} from "rest-contracts";

/**
 * An express request enhanced so that the query, params, and body
 * attributes are correctly typed to match an specified API.
 */
export interface TypedExpressRequest<API extends RestContracts.UsesMethod> extends express.Request {
  query: QUERY_PARAMS<API>;
  params: PATH_PARAMS<API>;
  body: BODY_PARAMS<API>;
}

/**
 * An express handler augmented with an initial parameter that contains all
 * any path, query, or body parameters passed by the client, merged into a
 * single object for easy extraction.
 *
 * When using wrap, your handler will be called with this interface.
 */
export type TypedExpressHandlerDeleteGet<
    API extends RestContracts.UsesMethodSupportingQueryParameter
  > = (
      pathAndQueryParams:
        API extends RestContracts.PathParameters & RestContracts.QueryParameters ? RestContracts.PATH_PARAMS<API> & RestContracts.QUERY_PARAMS<API> :
        API extends RestContracts.PathParameters ? RestContracts.PATH_PARAMS<API> :
        API extends RestContracts.QueryParameters ? RestContracts.QUERY_PARAMS<API> :
        undefined,
      req: TypedExpressRequest<API>,
      res: express.Response,
      next: express.NextFunction,
    ) => RestContracts.RESULT<API> | undefined | Promise<RestContracts.RESULT<API> | undefined>;

export type TypedExpressHandlerPatchPostPut<
  API extends RestContracts.UsesMethodSupportingBodyParameter
> = (
    body: BODY_PARAMS<API>,
    parameters: PATH_PARAMS<API>,
    req: TypedExpressRequest<API>,
    res: express.Response,
    next: express.NextFunction,
  ) => RestContracts.RESULT<API> | undefined | Promise<RestContracts.RESULT<API> | undefined>;


 export type TypedExpressHandler<API> =
  API extends RestContracts.UsesMethodSupportingQueryParameter ?
    TypedExpressHandlerDeleteGet<API> :
  API extends RestContracts.UsesMethodSupportingBodyParameter ?
    TypedExpressHandlerPatchPostPut<API> :
    never;


/**
 * This class wraps an express router so that you can add REST server
 * functions that can be type-checked against an API specified via the
 * typed-rest package.
 */
export class RestContractsExpressServer {

  constructor(
    public readonly router: express.Router = express.Router()
  ) {
    //
  }

  public static simpleErrorHandler = (error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    //
    const status: number =
      (error && typeof(error.status) === "number") ? error.status :
      (error && typeof(error.statusCode) === "number") ? error.statusCode :
      (error && typeof(error.code) === "number") ? error.code :
      // tslint:disable-next-line:no-magic-numbers
      500;
    const message: string =
      typeof(error === "string") ? error :
      (error && typeof(error.message) === "string") ? error.message :
      "Unknown error";

    res.status(status).send(message);

    return (next(error))
  };

  /**
   * Add an implementation of a server function exposed via a REST API.
   *
   * @param api The object that represents the API, and which encompasses
   * all of the typings (as well as the HTTP Method and Path at which the
   * API is located)
   * @param handler A handler that takes the prescribed input and returns
   * the prescribed output (or a promise to deliver the prescribed output.)
   */
  public implement<API extends RestContracts.UsesMethodSupportingQueryParameter & (
    RestContracts.AtPath | RestContracts.PathParameters | RestContracts.QueryParameters
  )>(
    api: API,
    handler: (
      pathAndQueryParams:
        API extends RestContracts.PathParameters & RestContracts.QueryParameters ? RestContracts.PATH_PARAMS<API> & RestContracts.QUERY_PARAMS<API> :
        API extends RestContracts.PathParameters ? RestContracts.PATH_PARAMS<API> :
        API extends RestContracts.QueryParameters ? RestContracts.QUERY_PARAMS<API> :
        undefined,
      req: TypedExpressRequest<API>,
      res: express.Response,
      next: express.NextFunction,
    ) => RestContracts.RESULT<API> | undefined | Promise<RestContracts.RESULT<API> | undefined>
  ): TypedExpressHandlerDeleteGet<API>;
  public implement<API extends RestContracts.UsesMethodSupportingBodyParameter & (
      RestContracts.AtPath | RestContracts.PathParameters | RestContracts.Body
    )>(
    api: API,
    handler: (
      body: BODY_PARAMS<API>,
      parameters: API extends RestContracts.PathParameters ? PATH_PARAMS<API> : undefined,
      req: TypedExpressRequest<API>,
      res: express.Response,
      next: express.NextFunction,
    ) => RestContracts.RESULT<API> | undefined | Promise<RestContracts.RESULT<API> | undefined>
  ): TypedExpressHandlerPatchPostPut<API>;
  public implement<API extends RestContracts.UsesMethod & RestContracts.AtPath>(
    api: API,
    handler: TypedExpressHandler<typeof api>
  ): TypedExpressHandler<typeof api> {

    const wrappedHandler = wrap(api, handler);
    // tslint:disable-next-line:no-console
    console.log("Added API: ", api.method, api.path);

    switch (api.method) {
      case RestContracts.Method.get:
        this.router.get(api.path, wrappedHandler);
        break;
      case RestContracts.Method.delete:
        this.router.delete(api.path, wrappedHandler);
        break;
      case RestContracts.Method.put:
        this.router.put(api.path, wrappedHandler);
        break;
      case RestContracts.Method.post:
        this.router.post(api.path, wrappedHandler);
        break;
      case RestContracts.Method.patch:
        this.router.patch(api.path, wrappedHandler);
        break;
      default:
        break;
    }

    return handler;
  }
}



/**
 * Wrap a typed-rest API with an express handler that passes parameters
 * with the correct typings derived from the API.
 * @param api The object that represents the API, and which encompasses
 * all of the typings (as well as the HTTP Method and Path at which the
 * API is located)
 * @param handler A handler that takes the prescribed input and returns
 * the prescribed output (or a promise to deliver the prescribed output.)
 */
function wrap<
  API extends RestContracts.UsesMethod
>(
  api: API,
  handler: TypedExpressHandler<typeof api>,
) {
  const {method} = api;

  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      let result: RestContracts.RESULT<API> | undefined;
      if (RestContracts.isQueryParameterAPI(api)) {
        result = await (handler as TypedExpressHandlerDeleteGet<typeof api>)(
          Object.assign({}, req.query || {}, req.params || {}),
          req as TypedExpressRequest<typeof api>,
          res,
          next
        );
      } else if (RestContracts.isBodyParameterAPI(api)) {
        result = await (handler as TypedExpressHandlerPatchPostPut<typeof api>)(
          req.body as BODY_PARAMS<typeof api>,
          Object.assign({}, req.query || {}, req.params || {}) as RestContracts.PATH_PARAMS<typeof api>,
          req as TypedExpressRequest<typeof api>,
          res,
          next
        );
      }

      // If we reached here, there was no error.
      // Send method-specific success codes
      switch (method) {
        case RestContracts.Method.put:
          // tslint:disable-next-line:no-magic-numbers
          res.status(201); // Send "created" to indicate success
          break;
        case RestContracts.Method.get:
          if (typeof (result) === "undefined") {
            // tslint:disable-next-line:no-magic-numbers
            res.status(404); // Not found
            res.end();
          }
          break;

        default:
          break;
      }


      if (typeof (result) !== "undefined") {
        if (RestContracts.hasContentType(api)) {
          res.set('Content-Type', api.contentType);
        }
        if (RestContracts.isApiJsonEncoded(api)) {
          res.json(result);
        } else {
          res.send(result);
        }
      }

    } catch (err) {
      return next(err);
    }
  }
}

export default RestContractsExpressServer;
