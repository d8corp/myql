// src/utils/virtualEntry.ts
const virtualInput = "virtual:entry";
function virtualEntry(code, input = virtualInput) {
	const resolvedInput = "\0" + input;
	return {
		name: "virtual-entry",
		resolveId(source, importer) {
			if (source === input) return resolvedInput;
			if (importer === resolvedInput) return this.resolve(source, void 0, { skipSelf: true });
		},
		load(id) {
			if (id === resolvedInput) return code;
		}
	};
}
export { virtualEntry, virtualInput };
