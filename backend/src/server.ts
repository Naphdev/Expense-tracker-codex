import { connectDb } from "./config/db.js";
import { loadEnv } from "./config/env.js";
import { createApp } from "./app.js";
import { processDueRecurring } from "./services/recurringService.js";

const env = loadEnv();
const app = createApp();

await connectDb();
app.listen(env.PORT, () => {
  console.log(`API listening on ${env.PORT}`);
});

processDueRecurring().catch(() => console.error("Recurring job failed"));
setInterval(() => {
  processDueRecurring().catch(() => console.error("Recurring job failed"));
}, 60 * 60 * 1000);
