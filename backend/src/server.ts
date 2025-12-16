import "./env.js";
import app from "./app.js";
import { startCronJobs } from "./config/cron.js";

const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startCronJobs();
});
