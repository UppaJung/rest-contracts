import * as RestContracts from "rest-contracts";
import {getClientCreationFunction} from "rest-contracts-axios-client";
import {ExcuseId, ExcuseDbRecord, ExcuseQuality} from "./excuse-contract";
import * as ExcuseContract from "./excuse-contract";

// To create client calls, the factory needs the URL and any default configuration settings
// we might want to specify.
const createRequestFunction = getClientCreationFunction  ("http://localhost:5000/", {timeout: 5000});

// Call the factory to create a request functio nfor Get, Query, and Put
const excuseClient = {
  get: createRequestFunction(ExcuseContract.Get),
  query: createRequestFunction(ExcuseContract.Query),
  put: createRequestFunction(ExcuseContract.Put),
};

// This function runs our example queries.  Try modifying the requests
// in VSCode to see Intellisense autocomplete parameters, dislpay type
// information, and report type errors.
export async function run(): Promise<void> {
  console.log("Starting API client");

  try {
    // Add two excuses.  Excuses for what?  Not using TypeScript.
    const firstExcuseStored = await excuseClient.put({
      quality: ExcuseQuality.Poor,
      description: "I don't use TypeScript I enjoy debugging type errors in production software.",
    });

    console.log("Put the first excuse", firstExcuseStored);

    const secondExcuseStored = await excuseClient.put({
      quality: ExcuseQuality.Poor,
      description: "My nervous systems has a built-in type checker that catches errors before they become keystrokes.",
    });

    console.log("Put the second excuse", secondExcuseStored);

    // Retrieve the second excuse again using get with a path parameter.
    const secondExcuse = await excuseClient.get({id: secondExcuseStored.id});

    // Retrieve excuses using Query (get with a query parameter)
    const lameExcuses = await excuseClient.query({quality: ExcuseContract.ExcuseQuality.Poor});
    console.log("Retrieved excuses:", lameExcuses);

    // Retrieve excuses using Query (get with a query parameter)
    const goodExcuses = await excuseClient.query({quality: ExcuseContract.ExcuseQuality.Good});
    console.log("Here are all the valid excuses for not using TypeScript:", goodExcuses);
    console.log("Yup, that's all of them.");

  } catch (error) {
    console.log("Error:", error);
  }
}
