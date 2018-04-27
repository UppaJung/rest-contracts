import * as express from "express";
import * as RestContracts from "rest-contracts";

/**
 * An express request enhanced so that the query, params, and body
 * attributes are correctly typed to match an specified API.
 */
export interface TypedExpressRequest<
  PATH_PARAMETER_TYPE,
  QUERY_PARAMETER_TYPE,
  BODY_PARAMETER_TYPE
> extends express.Request {
  query: QUERY_PARAMETER_TYPE;
  params: PATH_PARAMETER_TYPE;
  body: BODY_PARAMETER_TYPE;
}

/**
 * An express handler augmented with an initial parameter that contains all
 * any path, query, or body parameters passed by the client, merged into a
 * single object for easy extraction.
 *
 * When using wrap, your handler will be called with this interface.
 */
export type TypedExpressHandler<
  PATH_PARAMETER_TYPE extends RestContracts.PathParametersType | undefined,
  QUERY_PARAMETER_TYPE extends RestContracts.QueryParametersType | undefined,
  BODY_PARAMETER_TYPE,
  RESULT_TYPE
> = (
  params: PATH_PARAMETER_TYPE & QUERY_PARAMETER_TYPE & BODY_PARAMETER_TYPE,
  req: TypedExpressRequest<PATH_PARAMETER_TYPE, QUERY_PARAMETER_TYPE, BODY_PARAMETER_TYPE>,
  res: express.Response,
  next: express.NextFunction,
) => RESULT_TYPE | undefined | Promise<RESULT_TYPE | undefined>;


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
  public implement<
    PATH_PARAMETER_TYPE extends RestContracts.PathParametersType | undefined,
    QUERY_PARAMETER_TYPE extends RestContracts.QueryParametersType   | undefined,
    BODY_PARAMETER_TYPE,
    RESULT_TYPE
  >(
    api: RestContracts.API<
      RestContracts.Method,
      PATH_PARAMETER_TYPE,
      QUERY_PARAMETER_TYPE,
      BODY_PARAMETER_TYPE,
      RESULT_TYPE,
      string
    >,
    handler: TypedExpressHandler<
        PATH_PARAMETER_TYPE,
        QUERY_PARAMETER_TYPE,
        BODY_PARAMETER_TYPE,
        RESULT_TYPE
      >
    ): TypedExpressHandler<
      PATH_PARAMETER_TYPE,
      QUERY_PARAMETER_TYPE,
      BODY_PARAMETER_TYPE,
      RESULT_TYPE
    > {

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
  REST_API extends RestContracts.API // <RestContracts.Method, any, any, any, any, string>
>(
  api: REST_API,
  handler: TypedExpressHandler<
      RestContracts.PATH_PARAMS<REST_API>,
      RestContracts.QUERY_PARAMS<REST_API>,
      RestContracts.BODY_PARAMS<REST_API>,
      RestContracts.RESULT<REST_API>
    >,
) {
  const {method} = api;

  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const params = {
      ...((req && req.body) || {}),
      ...((req && req.query) || {}),
      ...((req && req.params) || {}),
    } as RestContracts.ALL_PARAMS<REST_API>;

    try {
      const result: RestContracts.RESULT<REST_API> | undefined = await handler(
        params,
        req as TypedExpressRequest<
            RestContracts.PATH_PARAMS<REST_API>,
            RestContracts.QUERY_PARAMS<REST_API>,
            RestContracts.BODY_PARAMS<REST_API>
          >,
        res,
        next);

      if (typeof (result) !== "undefined") {
        res.json(result);
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
          }
          break;

        default:
          break;
      }

      res.end();
    } catch (err) {
      return next(err);
    }
  }
}

export default RestContractsExpressServer;
