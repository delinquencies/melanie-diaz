// Create the single owner account in the LOCAL database. Usage:
//   SALON_OS_OWNER_EMAIL=... SALON_OS_OWNER_PASSWORD=... npm run create-owner
// On Cloudflare the owner is created once via POST /api/setup/owner with the SETUP_TOKEN secret (see SALON_OS.md).
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "../src/db/database.js";
import { createOwner } from "../src/auth.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = await openDatabase(process.env.SALON_OS_DB || join(ROOT, "data", "salon-os.db"));
try {
  createOwner(db, process.env.SALON_OS_OWNER_EMAIL, process.env.SALON_OS_OWNER_PASSWORD, new Date().toISOString());
  console.log("Owner created.");
} catch (e) {
  console.error("Could not create owner:", e.message);
  process.exitCode = 1;
}
