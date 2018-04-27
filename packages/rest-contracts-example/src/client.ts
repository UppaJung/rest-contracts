import * as RestContracts from "rest-contracts";
import {getClientCreationFunction} from "rest-contracts-axios-client";
import * as RestContractsExpressServer from "rest-contracts-express-server";
import * as ExcuseContract from "./excuse-contract";

const createRequestFunction = getClientCreationFunction  ("http://localhost:5000", {timeout: 5000});

const excuseClient = {
  get: createRequestFunction(ExcuseContract.Get),
  query: createRequestFunction(ExcuseContract.Query),
  put: createRequestFunction(ExcuseContract.Put),
};

export async function run(): Promise<void> {
  console.log("Starting API client");

  // Add excuses for not using typescript
  await excuseClient.put({
    id: "df458df",
    quality: ExcuseContract.ExcuseQuality.Poor,
    description: "I don't use TypeScript I enjoy debugging type errors in production software.",
  });

  console.log("Put the first excuse");

  await excuseClient.put({
    id: "asdflewi",
    quality: ExcuseContract.ExcuseQuality.Poor,
    description: "My nervous systems has a built-in type checker that catches errors before they become keystrokes.",
  });

  console.log("Put the second excuse");

  const lameExcuses = await excuseClient.query({quality: ExcuseContract.ExcuseQuality.Poor});

  console.log("Retrieved excuses:", lameExcuses);
}
