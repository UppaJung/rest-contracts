import * as client from "./client";
import * as server from "./server";

async function run() {

  // Run server
  server.run();

  // Wait 1 second for server to start before running client
  const msToWait = 1000;
  await new Promise<void>( (resolve, reject) => setTimeout( () => resolve(), msToWait ) );

  // Wait for client to complete
  await client.run()

  // All done
  console.log("All done.");
}

run().then(() => {
  process.exit(0);
})
