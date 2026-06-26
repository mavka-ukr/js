#!/usr/bin/env node

import nodeFs from "node:fs";
import nodePath from "node:path";
import nodeProcess from "node:process";
import nodeReadline from "node:readline";
import { fileURLToPath } from "url";
import pkg from "../package.json" with { type: "json" };
import { MavkaWASM } from "../src/MavkaWASM.ts";
import { NodeMavkaBib } from "../src/NodeMavkaBib.ts";
import { NodeMavkaFS } from "../src/NodeMavkaFS.ts";
import { NodeMavkaProcess } from "../src/NodeMavkaProcess.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = nodePath.dirname(__filename);

const wasmFilePath = nodePath.resolve(
  nodePath.dirname(__dirname),
  `./wasm/мавка-${pkg.mavkaVersion}.wasm`,
);

const node = {
  fs: nodeFs,
  path: nodePath,
  process: nodeProcess,
  readline: nodeReadline,
} as const;

class NodeMavkaWASM extends MavkaWASM {
  constructor() {
    super(new NodeMavkaFS(node), new NodeMavkaProcess(node), new NodeMavkaBib(node));
  }
}

const wasmBuffer = nodeFs.readFileSync(wasmFilePath);

const mavka = new NodeMavkaWASM();

await mavka.instantiate(wasmBuffer);

const mavkaVersion = mavka.getVersion();

if (mavkaVersion != pkg.mavkaVersion) {
  console.warn(
    "Версія з package.json не співпадає з версією Мавки з WASM файлу!",
  );
}

mavka.run([
  nodeProcess.argv.slice(0, 2).join(" "),
  ...nodeProcess.argv.slice(2),
]);
