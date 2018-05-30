import * as bodyParser from "body-parser";
import * as express from "express";
import * as RestContracts from "/rest-contracts";
import * as RestContractsExpressServer from "../../rest-contracts-express-server/src/rest-contracts-express-server";
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
  const excuseMemoryDatabaseTable =
    new Map<ExcuseContract.ExcuseDbRecord["id"], ExcuseContract.ExcuseDbRecord>();

  // We've merged all params into params, but req, res, & next are still available
  // to you. (We've also added typings to the parameter fields of the req object!)

  // Implement the Excuse Put method
  ourApi.implement(ExcuseContract.Put, (body, params, req, res, next) => {
    const excuseOrExcuseDbRecord = body;
    const excuseDbRecord: ExcuseContract.ExcuseDbRecord =
      ("id" in excuseOrExcuseDbRecord && excuseOrExcuseDbRecord.id) ?
        // parameter is already an ExcuseDbRecord with an ID assigned
        excuseOrExcuseDbRecord :
        // parameters is an excuse that is not yet in the database and
        // needs to be assigned a unique ExcuseId
        {
          ...excuseOrExcuseDbRecord,
          id: ExcuseContract.ExcuseId()
        };
    excuseMemoryDatabaseTable.set( excuseDbRecord.id, excuseDbRecord );
    // Put methods return a copy of the record that they stored
    return excuseDbRecord;
  });

  // Implement the Excuse Get method
  // (leaving out req, res, next since we're not using them)





  ourApi.implement(ExcuseContract.Get, (params) =>
    excuseMemoryDatabaseTable.get(params.id)
  );

  // Impelmenting the Excuse directory-level Get, which can query on quality
  ourApi.implement(ExcuseContract.Query, (params) =>
    [...excuseMemoryDatabaseTable.values()].
      // Take all exucses if no quality parameter speicfied,
      // or only those excuses with a quality matching the one queried for
      filter( values => (!params.quality) || values.quality === params.quality )
  );
}
