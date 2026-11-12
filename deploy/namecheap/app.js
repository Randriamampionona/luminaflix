// Startup file for cPanel "Setup Node.js App" (Passenger).
// Layout on the server:
//   ~/luminaflix/app.js        <- this file (startup file in cPanel)
//   ~/luminaflix/.env          <- runtime secrets (uploaded once, chmod 600)
//   ~/luminaflix/standalone/   <- Next.js standalone build (uploaded by GitHub Actions)
// The build lives in a subfolder because CloudLinux's Node.js Selector does not
// allow a real node_modules folder in the application root.

const fs = require("fs");
const path = require("path");

const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  // Built into Node 20.12+/22: loads KEY=value lines, does not override existing vars
  process.loadEnvFile(envFile);
}

const appDir = path.join(__dirname, "standalone");
process.chdir(appDir);
require(path.join(appDir, "server.js"));
