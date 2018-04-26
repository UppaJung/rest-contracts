import RestContracts from "rest-contracts";

enum ExcuseQuality {Solid = "solid", Iffy = "iffy", Lame = "lame"};
export interface Excuse {
  id: string;
  quality: ExcuseQuality;
  description: string;
}

// tslint:disable-next-line:no-namespace
namespace ExcuseAPI {
  export const Get =
    RestContracts.CreateAPI.Get
    .PathParameters<{ id: string }>()
    .NoQueryParameters
    .Returns<Excuse>()
    .Path('/excuses/:id/');
  export type Get = typeof Get;

  export const Query =
    RestContracts.CreateAPI.Get
    .NoPathParameters
    .QueryParameters<{quality?: Excuse["quality"]}>()
    .Returns<Excuse[]>()
    .Path('/excuses/');
  export type Query = typeof Query;

  export const Put =
    RestContracts.CreateAPI.Put
    .NoPathParameters
    .BodyParameters<Excuse>()
    .Returns<Excuse>()
    .Path("/excuses/");
  export type Put = typeof Put;
}


// If in separate file...
// import * as ExcuseAPI from "../api/excuse";
import * as bodyParser from "body-parser";
import * as express from "express";
import RestContractsExpressServer from "rest-contracts-express-server";

const router = express.Router()
const app = express();
app.use(bodyParser.json());
app.use(router);
const PORT = 80;
app.listen(PORT);

const ourApi = new RestContractsExpressServer(router);

// Best to create a new file here, import the ourApi class,
// and separate implementations into different files.
const excuseMemoryTable = new Map<Excuse["id"], Excuse>();

// req, res, & next are still available to you.
ourApi.implement(ExcuseAPI.Put, (params, req, res, next) => {
  excuseMemoryTable.set( params.id, params );
  return params;
});

ourApi.implement(ExcuseAPI.Get, (params) =>
  excuseMemoryTable.get(params.id)
);

ourApi.implement(ExcuseAPI.Query, (params) =>
  [...excuseMemoryTable.values()].
    filter( values => (!params.quality) || values.quality === params.quality )
);


// If in separate file...
// import * as ExcuseAPI from "../api/excuse";
import {getClientCreationFunction} from "rest-contracts-browser-client";

const createRequestFunction = getClientCreationFunction  ("localhost", {timeoutInMs: 5000});

const excuseClient = {
  get: createRequestFunction(ExcuseAPI.Get),
  query: createRequestFunction(ExcuseAPI.Query),
  put: createRequestFunction(ExcuseAPI.Put),
};

excuseClient.put({
  id: "df458df",
  quality: ExcuseQuality.Lame,
  description: "I don't use TypeScript I enjoy debugging type errors in production software.",
});

const lameExcuses = excuseClient.query({quality: ExcuseQuality.Lame});
