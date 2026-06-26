# Мавка для JS

Функціонал зараз обмежений так як я зробив це насамперед для Майданчика Мавки.

Встановлення і використання глобально:

```shell
npm i -g mavka

mavka
```

Встановлення і використання в проєкті:

```shell
npm i mavka
```

```js
import { MavkaWASM, MavkaFS, MavkaProcess, MavkaBib } from "mavka";

// приклад: src/InMemoryMavkaFS.ts
// приклад: src/NodeMavkaFS.ts
class CustomMavkaFS extends MavkaFS {
  // ...
}

// приклад: src/NodeMavkaProcess.ts
class CustomMavkaProcess extends MavkaProcess {
  // ...
}

// наразі без прикладів
class CustomMavkaBib extends MavkaBib {
  // ...
}

const mfs = new CustomMavkaFS();
const mprc = new CustomMavkaProcess();
const mbib = new CustomMavkaBib();

const mw = new MavkaWASM(mfs, mprc, mbib);

const wasmBuffer = await fetch("мавка-{версія}.wasm").then((r) => r.arrayBuffer());

await mavka.instantiate(wasmBuffer);

mavka.run(["мавка", "тест.м"]);
```
