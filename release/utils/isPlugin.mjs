import { readJsonFileSync } from "./readJsonFileSync.mjs";
import { logger } from "@cantinc/logger";
import chalk from "chalk";
import { existsSync } from "node:fs";
import { join } from "node:path";
// src/utils/isPlugin.ts
function isPlugin(name) {
	const pkgPath = join("node_modules", name, "package.json");
	if (!existsSync(pkgPath)) {
		logger.log(chalk.red(`Plugin ${name} not found`));
		return {
			server: false,
			client: false
		};
	}
	const { exports } = readJsonFileSync(pkgPath);
	const server = Boolean(exports?.["./server"]);
	const client = Boolean(exports?.["./client"]);
	if (!server && !client) logger.log(chalk.red(`Plugin ${name} does not export server or client`));
	return {
		server,
		client
	};
}
export { isPlugin };
