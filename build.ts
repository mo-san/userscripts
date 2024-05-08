import { rmSync, watch } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { Glob } from "bun";
import { type Metadata, type SingleValue, type Value, stringify } from "userscript-metadata";

/** ソースコードのあるディレクトリ */
const SRC = "src";
/** 出力先ディレクトリ */
const DIST = "dist";

const cleanUp = (dist: string) => {
	// 出力先ディレクトリが存在しない場合は何もしない
	if (!Bun.file(dist).exists()) return;

	console.log("Cleaning up the dist directory...");
	rmSync(dist, { recursive: true, force: true });
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const isString = (value: any): value is string => typeof value === "string" || value instanceof String;

const readMetadata = async (path: string): Promise<Metadata> => await Bun.file(path).json();
const readContent = async (path: string): Promise<string> => await Bun.file(path).text();

const replaceSlash = (val: string) => val.replace(/\\/g, "/");
const manifestPath = (entryPath: string) => replaceSlash(entryPath).replace(/index\.ts$/, "manifest.json");
const mainScriptPath = (entryPath: string) =>
	replaceSlash(entryPath).replace(new RegExp(`^${SRC}/([^/]+)/index\.ts$`), `${DIST}/$1.user.js`);
const devScriptPath = (entryPath: string) =>
	replaceSlash(entryPath).replace(new RegExp(`^${SRC}/([^/]+)/index\.ts$`), `${DIST}/$1.dev.user.js`);

/**
 * 開発時用のダミーとなるユーザースクリプトのメタデータを生成します。
 * 本体スクリプトを require することで、開発時に本体スクリプトを読み込むようにします。
 */
const devify = (metadata: Metadata, entryPath: string): Metadata => {
	const require: Value = metadata.require;
	const requires: SingleValue[] = Array.isArray(require) ? require : isString(require) ? [require] : [];

	return {
		...metadata,
		name: `[dev] ${String(metadata.name)}`,
		require: [...requires, Bun.pathToFileURL(mainScriptPath(entryPath)).toString()],
	};
};

const prependMetadata = async (entryPath: string) => {
	const manifest = await readMetadata(manifestPath(entryPath));
	const banner = stringify(manifest);
	await Bun.write(mainScriptPath(entryPath), `${banner}\n\n${await readContent(mainScriptPath(entryPath))}`);
};

const writeDevScript = async (entryPath: string) => {
	const manifest = await readMetadata(manifestPath(entryPath));
	const banner = stringify(devify(manifest, entryPath));
	await Bun.write(devScriptPath(entryPath), `${banner}\n\n${await readContent(`${SRC}/dev.ts`)}`);
};

/**
 * すべてのエントリーポイント
 */
const entryPoints = Array.from(new Glob(`${SRC}/*/index.ts`).scanSync());

/**
 * 指定されたエントリーポイントに対してビルドを行います。
 */
const build = async (entryPaths: string[]) => {
	return await Bun.build({
		entrypoints: entryPaths,
		outdir: DIST,
		root: SRC,
		splitting: false,
		sourcemap: "external",
		minify: false,
		naming: "[dir].user.js",
	});
};

/**
 * すべてのエントリーポイントに対してビルドを行います。
 */
const buildAll = async () => {
	for (const entryPath of entryPoints) {
		const result = await build([entryPath]);

		if (!result.success) {
			console.error("Build failed:");
			for (const message of result.logs) {
				console.error(message);
			}
			continue; // 失敗した場合は次のループへ
		}

		await prependMetadata(entryPath);
		await writeDevScript(entryPath);

		console.info("Build succeeded!");
	}
};

/**
 * watchAndBuild 関数は、ファイルの変更を監視し、変更があった場合にビルドを行います。
 * 以下の issue で提案された方法を参考にしています。
 * @link https://github.com/oven-sh/bun/issues/5866#issuecomment-1868329613
 */
const watchAndBuild = async () => {
	console.log("Watching for changes...");

	const srcWatcher = watch(`${import.meta.dir}/${SRC}`, { recursive: true }, async (_event, filename) => {
		if (!filename) return;
		if (filename.endsWith("~")) return; // temporary backup files

		console.log(`File changed: "${join(import.meta.dir, SRC, filename)}". Rebuilding...`);

		await build(entryPoints);

		const promises = entryPoints.map(async (entryPath) => {
			await prependMetadata(entryPath);
			await writeDevScript(entryPath);
		});

		await Promise.allSettled(promises);
	});

	process.on("exit", () => {
		srcWatcher.close();
		process.exit(0);
	});
};

// "--watch" オプションが指定されている場合は watch モードでビルドを行う
const {
	values: { watch: watchMode },
} = parseArgs({
	args: Bun.argv,
	options: {
		watch: {
			type: "boolean",
		},
	},
	strict: true,
	allowPositionals: true,
});

if (watchMode) {
	cleanUp(DIST);
	await build(entryPoints);
	await watchAndBuild();
} else {
	cleanUp(DIST);
	await buildAll();
}
