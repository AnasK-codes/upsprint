import "./env.js";
import app from "./app.js";
import { startCronJobs } from "./jobs/scheduler.js";

const PORT = 4000;


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startCronJobs();
});
