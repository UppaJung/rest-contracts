import * as bodyParser from "body-parser";
import * as express from "express";
import * as RestContracts from "rest-contracts";
import * as RestContractsExpressServer from "rest-contracts-express-server";
import * as ExcuseContract from "./excuse-contract";

// If you're using express, you'll still have to configure it,
// making sure to use bodyParser.json()
const router = express.Router()
const app = express();
// This line causes express to parse JSON responses for you.
app.use(bodyParser.json());
app.use(router);
const PORT = 5000;
app.listen(PORT);

export function run(): void {
  console.log("Starting API server");

  // You'll implement your APIs by calling the implement method of this class.
  // (Want to add authentication or other steps?  Just create a subclass!)
  const ourApi = new RestContractsExpressServer.RestContractsExpressServer(router);

  // Best to create a new file here, import the ourApi class,
  // and separate implementations into different files.
  const excuseMemoryTable =
    new Map<ExcuseContract.Excuse["id"], ExcuseContract.Excuse>();

  // We've merged all params into params, but req, res, & next are still available
  // to you. (We've also added typings to the parameter fields of the req object!)

  // Implement the Excuse Put method
  ourApi.implement(ExcuseContract.Put, (body, params, req, res, next) => {
    const excuseWithOptionalId = req.body;
    const excuse: ExcuseContract.Excuse = excuseWithOptionalId.id ?
      excuseWithOptionalId as ExcuseContract.Excuse :
      {...req.body, id: ExcuseContract.ExcuseId()};
    excuseMemoryTable.set( excuse.id, excuse );
    return excuse;
  });

  // Implement the Excuse Get method
  // (leaving out req, res, next since we're not using them)
  ourApi.implement(ExcuseContract.Get, (params) =>
    excuseMemoryTable.get(params.id)
  );

  // Impelmenting the Excuse directory-level Get, which can query on quality
  ourApi.implement(ExcuseContract.Query, (params) =>
    [...excuseMemoryTable.values()].
      filter( values => (!params.quality) || values.quality === params.quality )
  );
}
