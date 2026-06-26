import { MavkaBib } from "./MavkaBib.ts";
import { type TMavkaNode } from "./Node.ts";

export class NodeMavkaBib extends MavkaBib {
  protected node: TMavkaNode;

  constructor(node: TMavkaNode) {
    super();

    this.node = node;
  }
}
