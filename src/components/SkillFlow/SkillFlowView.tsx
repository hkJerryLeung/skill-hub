import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  PanOnScrollMode,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  useNodesState,
} from "@xyflow/react";
import { convertFileSrc } from "@tauri-apps/api/core";
import "@xyflow/react/dist/style.css";
import "./SkillFlowView.css";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { SkillInfo } from "../../lib/skillTypes";
import {
  buildSkillFlowGraph,
  SKILL_FLOW_BRANCH_SOURCE_HANDLE,
  SKILL_FLOW_BRANCH_TARGET_HANDLE,
  SKILL_FLOW_MAIN_SOURCE_HANDLE,
  SKILL_FLOW_MAIN_TARGET_HANDLE,
  type SkillFlowFile,
  type SkillFlowNode,
} from "../../lib/skillFlowPresentation";
import { getSharedLibraryCategoryLabel } from "../../lib/sharedLibraryCategories";
import {
  CloseIcon,
  FolderOpenIcon,
  TrashIcon,
} from "../Icons/Icons";

interface SkillFlowViewProps {
  selected: SkillInfo | null;
  contentLoading: boolean;
  skillContent: string;
  skillFiles: string[];
  onClose: () => void;
  onRemove: (skill: SkillInfo) => void | Promise<void>;
}

interface SkillNodeData extends Record<string, unknown> {
  node: SkillFlowNode;
  skillPath: string;
}

type SkillReactNode = Node<SkillNodeData, "skill">;
type SkillReactEdge = Edge<Record<string, never>, "smoothstep">;

const nodeTypes = {
  skill: SkillFlowNodeCard,
};

function SkillFlowNodeCard({ data }: NodeProps<SkillReactNode>) {
  const { node, skillPath } = data;
  const hasMainTargetHandle = node.kind !== "overview" && node.kind !== "file";
  const hasBranchTargetHandle = node.kind === "file";
  const hasSourceHandles = node.kind !== "file";

  return (
    <article className={`skill-flow-node skill-flow-node--${node.kind}`}>
      {hasMainTargetHandle && (
        <Handle
          id={SKILL_FLOW_MAIN_TARGET_HANDLE}
          type="target"
          position={Position.Left}
          className="skill-flow-handle skill-flow-handle--main"
          isConnectable={false}
        />
      )}
      {hasBranchTargetHandle && (
        <Handle
          id={SKILL_FLOW_BRANCH_TARGET_HANDLE}
          type="target"
          position={Position.Top}
          className="skill-flow-handle skill-flow-handle--branch"
          isConnectable={false}
        />
      )}
      <div className="skill-flow-node-header">
        <span className="skill-flow-node-kind">{node.kind}</span>
        <h4>{node.title}</h4>
        {node.subtitle && <p>{node.subtitle}</p>}
      </div>
      {node.kind === "file" ? (
        <FilePreview file={node.file} skillPath={skillPath} fallback={node.body} />
      ) : (
        <pre
          className="skill-flow-node-body nowheel nodrag nopan"
          onWheelCapture={(event) => event.stopPropagation()}
        >
          {node.body}
        </pre>
      )}
      {hasSourceHandles && (
        <>
          <Handle
            id={SKILL_FLOW_MAIN_SOURCE_HANDLE}
            type="source"
            position={Position.Right}
            className="skill-flow-handle skill-flow-handle--main"
            isConnectable={false}
          />
          <Handle
            id={SKILL_FLOW_BRANCH_SOURCE_HANDLE}
            type="source"
            position={Position.Bottom}
            className="skill-flow-handle skill-flow-handle--branch"
            isConnectable={false}
          />
        </>
      )}
    </article>
  );
}

const joinSkillFilePath = (skillPath: string, relativePath: string) => {
  const basePath = skillPath.endsWith("/") ? skillPath.slice(0, -1) : skillPath;
  const filePath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
  return `${basePath}/${filePath}`;
};

const getSkillFileAssetUrl = (skillPath: string, relativePath: string) => {
  const filePath = joinSkillFilePath(skillPath, relativePath);
  try {
    return convertFileSrc(filePath);
  } catch {
    return filePath;
  }
};

const isFramePreviewFile = (file: SkillFlowFile) =>
  file.extension === "pdf" ||
  file.kind === "text" ||
  file.kind === "code" ||
  file.kind === "data";

function FilePreview({
  file,
  skillPath,
  fallback,
}: {
  file?: SkillFlowFile;
  skillPath: string;
  fallback: string;
}) {
  if (!file) {
    return <div className="skill-flow-empty">{fallback}</div>;
  }

  const filePath = joinSkillFilePath(skillPath, file.relativePath);
  const assetUrl = getSkillFileAssetUrl(skillPath, file.relativePath);

  if (file.kind === "image") {
    return (
      <div
        className="skill-flow-file-preview nowheel nodrag nopan"
        onWheelCapture={(event) => event.stopPropagation()}
      >
        <img
          className="skill-flow-file-preview-image"
          src={assetUrl}
          alt={file.label}
        />
      </div>
    );
  }

  if (isFramePreviewFile(file)) {
    return (
      <iframe
        className="skill-flow-file-preview-frame nowheel nodrag nopan"
        title={file.relativePath}
        src={assetUrl}
      />
    );
  }

  return (
    <div className="skill-flow-file-card">
      <div className="skill-flow-file-card-kind">{file.extension || file.kind}</div>
      <div className="skill-flow-file-card-path">{file.relativePath}</div>
      <button
        className="skill-flow-file-card-button nodrag nopan"
        type="button"
        onClick={async () => {
          try {
            await revealItemInDir(filePath);
          } catch (error) {
            console.error("Failed to reveal file:", error);
          }
        }}
      >
        <FolderOpenIcon size={14} />
        Reveal
      </button>
    </div>
  );
}

export function SkillFlowView({
  selected,
  contentLoading,
  skillContent,
  skillFiles,
  onClose,
  onRemove,
}: SkillFlowViewProps) {
  const graph = useMemo(() => {
    if (!selected) return null;
    return buildSkillFlowGraph({
      skill: selected,
      skillContent,
      skillFiles,
    });
  }, [selected, skillContent, skillFiles]);

  const initialNodes = useMemo<SkillReactNode[]>(
    () =>
      graph?.nodes.map((node) => ({
        id: node.id,
        type: "skill",
        position: node.position,
        data: {
          node,
          skillPath: selected?.path ?? "",
        },
        draggable: true,
      })) ?? [],
    [graph, selected?.path],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<SkillReactNode>(initialNodes);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    if (!selected) return;

    const handleEscapeKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onClose();
    };

    document.addEventListener("keydown", handleEscapeKeyDown);
    return () => {
      document.removeEventListener("keydown", handleEscapeKeyDown);
    };
  }, [onClose, selected]);

  const edges = useMemo<SkillReactEdge[]>(
    () =>
      graph?.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        style: {
          stroke: "var(--border-strong)",
          strokeWidth: 1.5,
        },
      })) ?? [],
    [graph],
  );

  if (!selected) return null;

  const categoryLabel =
    getSharedLibraryCategoryLabel(
      selected.category ?? (selected.agent === "Shared Library" ? "uncategorized" : null),
    ) ?? "Not categorized";
  const removeLabel =
    selected.agent === "Bin" ? "Delete Permanently" : "Move to Bin";

  return (
    <div className="skill-flow-workspace" role="dialog" aria-modal="true">
      <header className="skill-flow-header">
        <div className="skill-flow-title-group">
          <span className="skill-flow-eyebrow">Skill Flow</span>
          <h3>{selected.name}</h3>
          <div className="skill-flow-meta-row">
            <span>{selected.agent}</span>
            <span>{selected.is_symlink ? "SYMLINK" : "LOCAL"}</span>
            <span>{categoryLabel}</span>
          </div>
        </div>

        <div className="skill-flow-actions">
          <button
            className="skill-flow-action-button"
            type="button"
            onClick={async () => {
              try {
                await revealItemInDir(selected.path);
              } catch (error) {
                console.error("Failed to reveal path:", error);
              }
            }}
            title="Reveal in Finder"
          >
            <FolderOpenIcon size={14} />
            Reveal
          </button>
          <button
            className="skill-flow-action-button skill-flow-action-button-danger"
            type="button"
            onClick={() => {
              void onRemove(selected);
            }}
            title={removeLabel}
          >
            <TrashIcon size={14} />
            {removeLabel}
          </button>
          <button
            className="skill-flow-close"
            type="button"
            onClick={onClose}
            aria-label="Close skill flow"
          >
            <CloseIcon size={14} />
          </button>
        </div>
      </header>

      <main className="skill-flow-canvas">
        {contentLoading ? (
          <div className="skill-flow-loading">
            <div className="skill-flow-spinner" />
            Loading skill flow...
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            nodesConnectable={false}
            panOnScroll={true}
            panOnScrollMode={PanOnScrollMode.Free}
            zoomOnScroll={false}
            zoomActivationKeyCode="Alt"
            noWheelClassName="nowheel"
            fitView
            fitViewOptions={{ padding: 0.18 }}
            minZoom={0.35}
            maxZoom={1.6}
          >
            <Background
              color="var(--border-default)"
              gap={28}
              size={1}
              variant={BackgroundVariant.Lines}
            />
          </ReactFlow>
        )}
      </main>
    </div>
  );
}
