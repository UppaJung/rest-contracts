import RestContracts from "rest-contracts";

export interface Excuse {
  id: number;
  quality: 'Solid' | 'Iffy' | 'Lame';
  description: string;
}

// tslint:disable-next-line:no-namespace
namespace ExcuseAPI {
  export const Get =
    RestContracts.CreateAPI.Get
    .PathParameters<{ id: number }>()
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

// import * as ExcuseAPI from "../api/excuse";
import {getClientCreationFunction} from "rest-contracts-browser-client";

const createRequestFunction = getClientCreationFunction  ("https://api.example.com/", {withCredentials: true});

const excuseClient = {
  get: createRequestFunction(ExcuseAPI.Get),
  query: createRequestFunction(ExcuseAPI.Query),
  put: createRequestFunction(ExcuseAPI.Put),
};

const lameExcuses = excuseClient.query({quality: "Lame"});


import * as bodyParser from "body-parser";
import * as express from "express";
import {RestContractsExpressServer} from "rest-contracts-express-server";

const router = express.Router()
const app = express();
app.use(bodyParser.json());
app.use(router);
const PORT = 80;
app.listen(PORT);

const ourApi = new RestContractsExpressServer(router);




// ourApi.implement(ExcuseAPI.Get, (params, req, res, next) => {

//   const result =
//     (params.id === 1) ? {
//       id: 1,
//       quality: "Lame",
//       description: "TypeScript seems like extra work.",
//     } :
//     undefined;

//   return result;
// });
