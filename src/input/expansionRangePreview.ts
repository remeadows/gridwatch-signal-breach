import type { ExpansionPlayerTool, ExpansionSimCommand } from "../sim/expansion/types";
import type { GridPosition } from "../sim/types";

export function canPreviewExpansionTool(tool: ExpansionPlayerTool): boolean {
  return tool === "turret" || tool === "arcIce";
}

/** Presentation-only input gate. Inspection never reaches the simulation. */
export class ExpansionRangePreview {
  private active = false;
  private inspectedPosition: GridPosition | null = null;

  get enabled(): boolean { return this.active; }
  get position(): GridPosition | null { return this.inspectedPosition; }

  toggle(tool: ExpansionPlayerTool): void {
    if (this.active || !canPreviewExpansionTool(tool)) this.exit();
    else this.active = true;
  }

  selectTool(tool: ExpansionPlayerTool): void {
    if (!canPreviewExpansionTool(tool)) this.exit();
  }

  inspect(position: GridPosition): void {
    if (this.active) this.inspectedPosition = position;
  }

  exit(): void {
    this.active = false;
    this.inspectedPosition = null;
  }

  filterCommand(command: ExpansionSimCommand): ExpansionSimCommand | null {
    if (!this.active || command.type === "skipPrep") return command;
    this.inspect(command.position);
    return null;
  }
}
