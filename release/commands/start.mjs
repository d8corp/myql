import { SERVER_OUTPUT } from "../constants.mjs";
import { build } from "../helpers/build.mjs";
import "../helpers/index.mjs";
import { logger } from "@cantinc/logger";
import chalk from "chalk";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
// src/commands/start.ts
let current = null;
let stopping = false;
function spawnApp() {
	return new Promise((resolve) => {
		const child = spawn(process.execPath, [SERVER_OUTPUT], {
			stdio: [
				"inherit",
				"inherit",
				"inherit",
				"ipc"
			],
			env: process.env
		});
		current = child;
		child.on("error", (e) => {
			logger.log(chalk.red(`[myql] failed to start: ${e.message}`));
			current = null;
			resolve({
				code: 1,
				signal: null
			});
		});
		child.on("exit", (code, signal) => {
			current = null;
			resolve({
				code,
				signal
			});
		});
	});
}
async function start(appPath = ".") {
	await logger.start("Check the app folder", async () => {
		const dir = resolve(appPath);
		if (!existsSync(join(dir, "package.json"))) throw Error(`${dir} does not contain a package.json`);
		process.chdir(dir);
	});
	for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
		stopping = true;
		if (current) current.kill(signal);
		else process.exit(0);
	});
	await logger.start("Bundle", build);
	for (;;) {
		const { code, signal } = await spawnApp();
		if (stopping) return;
		if (code === 75) {
			await logger.start("Bundle", build);
			continue;
		}
		if (code === 0 && signal === null) {
			logger.log(chalk.cyan("[myql] the app stopped"));
			return;
		}
		logger.log(chalk.red(`[myql] the app exited with code ${code ?? signal}`));
		process.exitCode = code ?? 1;
		return;
	}
}
export { start };
