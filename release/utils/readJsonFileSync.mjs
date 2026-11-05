import { readFileSync } from "node:fs";
// src/utils/readJsonFileSync.ts
function readJsonFileSync(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}
export { readJsonFileSync };
