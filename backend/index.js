// backend/index.js
import app from "./app.js";
import { checkSubscriptionExpiries } from "./utils/expiryNotifications.js";

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`);
  
  // Start subscription expiry background task
  // Initial check on startup
  checkSubscriptionExpiries();
  // Run every 24 hours
  setInterval(checkSubscriptionExpiries, 24 * 60 * 60 * 1000);
});