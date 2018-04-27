import * as bodyParser from "body-parser";
import * as express from "express";
import * as RestContracts from "rest-contracts";
import * as RestContractsExpressServer from "rest-contracts-express-server";
import * as ExcuseContract from "./excuse-contract";

const router = express.Router()
const app = express();
app.use(bodyParser.json());
app.use(router);
const PORT = 5000;
app.listen(PORT);

export function run(): void {
  console.log("Starting API server");

  const ourApi = new RestContractsExpressServer.RestContractsExpressServer(router);

  // Best to create a new file here, import the ourApi class,
  // and separate implementations into different files.
  const excuseMemoryTable =
    new Map<ExcuseContract.Excuse["id"], ExcuseContract.Excuse>();

  // req, res, & next are still available to you.
  ourApi.implement(ExcuseContract.Put, (params, req, res, next) => {
    excuseMemoryTable.set( params.id, params );
    return params;
  });

  ourApi.implement(ExcuseContract.Get, (params) =>
    excuseMemoryTable.get(params.id)
  );

  ourApi.implement(ExcuseContract.Query, (params) =>
    [...excuseMemoryTable.values()].
      filter( values => (!params.quality) || values.quality === params.quality )
  );

}
