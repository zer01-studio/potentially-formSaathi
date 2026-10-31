import { mkdirSync } from "node:fs";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";

async function main() {
  const dataDir = path.join(process.cwd(), ".data");
  const dbPath = path.join(dataDir, "mongodb");
  const binaryDir = path.join(dataDir, "mongodb-bin");

  mkdirSync(dbPath, { recursive: true });
  mkdirSync(binaryDir, { recursive: true });

  const server = await MongoMemoryServer.create({
    binary: { downloadDir: binaryDir },
    instance: {
      port: 27017,
      dbName: "formsaathi",
      dbPath,
    },
  });

  const uri = `mongodb://127.0.0.1:${server.instanceInfo?.port ?? 27017}/formsaathi`;

  console.log("");
  console.log("FormSaathi local MongoDB is running.");
  console.log(`  URI: ${uri}`);
  console.log("");
  console.log("Start the app in another terminal with:");
  console.log(`  MONGODB_URI=${uri} npm run dev`);
  console.log("");
  console.log("Press Ctrl+C to stop. Data stays in ./.data/mongodb.");
  console.log("");

  process.on("SIGINT", async () => {
    await server.stop();
    process.exit(0);
  });

  await new Promise(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
