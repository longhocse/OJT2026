const { execFileSync } = require("node:child_process");

const repositoryRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  cwd: __dirname,
  encoding: "utf8",
}).trim();

const git = (...args) =>
  execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

const trackedFiles = git("ls-files").split(/\r?\n/).filter(Boolean);
const unsafeTracked = trackedFiles.filter(
  (file) => /(^|\/)\.env($|\.)/.test(file) && !file.endsWith(".env.example"),
);
const trackedNodeModules = trackedFiles.filter((file) => file.includes("node_modules/")).length;
const history = git("log", "--all", "--format=%h", "--", ".env", "backend/.env")
  .split(/\r?\n/)
  .filter(Boolean);

console.log(
  JSON.stringify(
    {
      unsafeTrackedFiles: unsafeTracked,
      trackedNodeModules,
      historicalEnvCommits: [...new Set(history)],
      secretValuesPrinted: false,
    },
    null,
    2,
  ),
);

if (unsafeTracked.length > 0 || trackedNodeModules > 0) process.exitCode = 1;
