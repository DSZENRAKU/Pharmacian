const path = require("path");
const { spawn } = require("child_process");

const electronPath = require("electron");
const mainProcess = path.join(__dirname, "desktop_main.js");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, [mainProcess], {
  env,
  stdio: "inherit",
  windowsHide: false
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
