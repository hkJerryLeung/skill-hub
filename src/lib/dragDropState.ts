export type DragSidebarTarget =
  | "all"
  | "Claude Code"
  | "Antigravity"
  | "Codex"
  | "Cursor"
  | "Bin"
  | "Shared Library"
  | `shared-category:${string}`;

export interface DragLeaveSnapshot {
  currentDropTarget: DragSidebarTarget | null;
  dragOverTarget: DragSidebarTarget | null;
}

export interface DragEndFallbackSnapshot {
  currentDropTarget: DragSidebarTarget | null;
  dropHandled: boolean;
  migrationInFlight: boolean;
}

export interface MigrationBatchSkill {
  agent: string;
}

export interface MigrationBatchSnapshot<T extends MigrationBatchSkill> {
  batch: T[];
  movableBatch: T[];
}

export interface ResolveMigrationBatchOptions<T extends MigrationBatchSkill> {
  draggedBatch: T[];
  selectedIds: Set<string>;
  skills: T[];
  getSkillId: (skill: T) => string;
  targetKey: DragSidebarTarget;
  allowSelectedFallback: boolean;
}

export interface SidebarTargetRect {
  agentKey: string | null | undefined;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface SidebarPointerPoint {
  clientX: number;
  clientY: number;
}

export interface DropTargetRect {
  targetKey: string | null | undefined;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface PointerDragThreshold {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  threshold?: number;
}

export function resolveDragLeaveSnapshot(
  snapshot: DragLeaveSnapshot,
  isMovingWithinCurrentTarget: boolean,
): DragLeaveSnapshot {
  if (isMovingWithinCurrentTarget) {
    return snapshot;
  }

  if (snapshot.currentDropTarget === null) {
    return {
      currentDropTarget: null,
      dragOverTarget: null,
    };
  }

  return {
    currentDropTarget: snapshot.currentDropTarget,
    dragOverTarget: snapshot.currentDropTarget,
  };
}

export function resolveDragEndFallbackTarget(
  snapshot: DragEndFallbackSnapshot,
): DragSidebarTarget | null {
  if (snapshot.dropHandled || snapshot.migrationInFlight) {
    return null;
  }

  return snapshot.currentDropTarget;
}

export function resolveMigrationBatch<T extends MigrationBatchSkill>(
  options: ResolveMigrationBatchOptions<T>,
): MigrationBatchSnapshot<T> {
  const batch =
    options.draggedBatch.length > 0
      ? options.draggedBatch
      : options.allowSelectedFallback
        ? options.skills.filter((skill) =>
            options.selectedIds.has(options.getSkillId(skill)),
          )
        : [];

  return {
    batch,
    movableBatch: batch.filter((skill) => skill.agent !== options.targetKey),
  };
}

export function resolveSidebarDropTargetKey(
  agentKey: string | null | undefined,
): DragSidebarTarget | null {
  switch (agentKey) {
    case "Shared Library":
    case "Claude Code":
    case "Antigravity":
    case "Codex":
    case "Cursor":
    case "Bin":
      return agentKey;
    default:
      return null;
  }
}

export function resolveDropTargetKey(
  targetKey: string | null | undefined,
): DragSidebarTarget | null {
  if (targetKey?.startsWith("shared-category:")) {
    return targetKey as DragSidebarTarget;
  }

  return resolveSidebarDropTargetKey(targetKey);
}

export function resolveSidebarTargetFromPoint(
  rects: SidebarTargetRect[],
  point: SidebarPointerPoint,
): DragSidebarTarget | null {
  const hoveredRect = rects.find(
    (rect) =>
      point.clientX >= rect.left &&
      point.clientX <= rect.right &&
      point.clientY >= rect.top &&
      point.clientY <= rect.bottom,
  );

  return resolveSidebarDropTargetKey(hoveredRect?.agentKey);
}

export function resolveDropTargetFromPoint(
  rects: DropTargetRect[],
  point: SidebarPointerPoint,
): DragSidebarTarget | null {
  const hoveredRect = rects.find(
    (rect) =>
      point.clientX >= rect.left &&
      point.clientX <= rect.right &&
      point.clientY >= rect.top &&
      point.clientY <= rect.bottom,
  );

  return resolveDropTargetKey(hoveredRect?.targetKey);
}

export function shouldStartPointerDrag({
  startX,
  startY,
  currentX,
  currentY,
  threshold = 6,
}: PointerDragThreshold): boolean {
  return Math.hypot(currentX - startX, currentY - startY) >= threshold;
}
