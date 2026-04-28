import type { SkillInfo } from "./skillTypes";

export type SkillFlowNodeKind =
  | "overview"
  | "content"
  | "checklist"
  | "gate"
  | "flow"
  | "file";

export type SkillFlowFileKind =
  | "image"
  | "document"
  | "text"
  | "code"
  | "data"
  | "other";

export interface SkillFlowAgentStatus {
  name: string;
  installed: boolean;
  skillPath?: string;
  isSymlink?: boolean;
}

export interface SkillFlowSection {
  id: string;
  title: string;
  kind: Extract<SkillFlowNodeKind, "content" | "checklist" | "gate" | "flow">;
  body: string;
}

export interface SkillFlowNode {
  id: string;
  title: string;
  kind: SkillFlowNodeKind;
  body: string;
  subtitle?: string;
  position: {
    x: number;
    y: number;
  };
  file?: SkillFlowFile;
}

export interface SkillFlowFile {
  relativePath: string;
  label: string;
  extension: string;
  kind: SkillFlowFileKind;
}

export interface SkillFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
}

export interface SkillFlowGraph {
  nodes: SkillFlowNode[];
  edges: SkillFlowEdge[];
}

interface BuildSkillFlowGraphOptions {
  skill: SkillInfo;
  skillContent: string;
  skillFiles: string[];
  agentStatuses?: SkillFlowAgentStatus[];
}

const NODE_X = 80;
const NODE_Y = 100;
const NODE_HORIZONTAL_GAP = 720;
const FILE_BRANCH_X_OFFSET = 560;
const FILE_BRANCH_Y = 940;
const FILE_BRANCH_VERTICAL_GAP = 820;

export const SKILL_FLOW_MAIN_SOURCE_HANDLE = "main-source";
export const SKILL_FLOW_MAIN_TARGET_HANDLE = "main-target";
export const SKILL_FLOW_BRANCH_SOURCE_HANDLE = "branch-source";
export const SKILL_FLOW_BRANCH_TARGET_HANDLE = "branch-target";

const trimOuterBlankLines = (value: string) =>
  value
    .replace(/^\s*\n/, "")
    .replace(/\n\s*$/, "")
    .trim();

const slugify = (value: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[`*_~[\](){}:]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "content";
};

const getUniqueSectionId = (title: string, usedIds: Set<string>) => {
  const base = `section-${slugify(title)}`;
  let id = base;
  let index = 2;

  while (usedIds.has(id)) {
    id = `${base}-${index}`;
    index += 1;
  }

  usedIds.add(id);
  return id;
};

const getUniqueNodeId = (baseId: string, usedIds: Set<string>) => {
  let id = baseId;
  let index = 2;

  while (usedIds.has(id)) {
    id = `${baseId}-${index}`;
    index += 1;
  }

  usedIds.add(id);
  return id;
};

export const stripSkillFrontmatter = (raw: string) => {
  const normalized = raw.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  if (lines[0]?.trim() !== "---") {
    return trimOuterBlankLines(normalized);
  }

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );

  if (closingIndex === -1) {
    return trimOuterBlankLines(normalized);
  }

  return trimOuterBlankLines(lines.slice(closingIndex + 1).join("\n"));
};

const classifySection = (title: string, body: string): SkillFlowSection["kind"] => {
  const normalizedTitle = title.toLowerCase();
  const normalizedBody = body.trim().toLowerCase();

  if (
    normalizedTitle.includes("hard-gate") ||
    normalizedTitle.includes("gate") ||
    normalizedTitle.includes("stop") ||
    normalizedTitle.includes("warning") ||
    normalizedTitle.includes("important")
  ) {
    return "gate";
  }

  if (
    normalizedTitle.includes("checklist") ||
    normalizedTitle.includes("todo") ||
    normalizedBody.includes("- [ ]") ||
    normalizedBody.includes("- [x]")
  ) {
    return "checklist";
  }

  if (
    normalizedTitle.includes("flow") ||
    normalizedTitle.includes("diagram") ||
    normalizedBody.startsWith("```dot") ||
    normalizedBody.startsWith("```mermaid")
  ) {
    return "flow";
  }

  return "content";
};

const normalizeSpecialBlockTitle = (value: string) =>
  value
    .replace(/^<|>$/g, "")
    .replace(/\/.*/, "")
    .trim();

export const extractSkillFlowSections = (raw: string): SkillFlowSection[] => {
  const body = stripSkillFrontmatter(raw);
  const lines = body.split("\n");
  const usedIds = new Set<string>();
  const sections: SkillFlowSection[] = [];
  let currentTitle: string | null = null;
  let currentBody: string[] = [];
  let inFence = false;

  const pushCurrent = () => {
    if (!currentTitle) return;

    const sectionBody = trimOuterBlankLines(currentBody.join("\n"));
    if (!sectionBody) {
      currentTitle = null;
      currentBody = [];
      return;
    }

    sections.push({
      id: getUniqueSectionId(currentTitle, usedIds),
      title: currentTitle,
      kind: classifySection(currentTitle, sectionBody),
      body: sectionBody,
    });
    currentTitle = null;
    currentBody = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    const fenceStart = trimmed.startsWith("```");

    if (!inFence) {
      const specialBlockMatch = trimmed.match(/^<([A-Z][A-Z0-9-]+)>$/);
      if (specialBlockMatch) {
        pushCurrent();

        const tag = specialBlockMatch[1];
        const specialLines: string[] = [];
        index += 1;

        while (index < lines.length && lines[index]?.trim() !== `</${tag}>`) {
          specialLines.push(lines[index] ?? "");
          index += 1;
        }

        const sectionBody = trimOuterBlankLines(specialLines.join("\n"));
        if (sectionBody) {
          const title = normalizeSpecialBlockTitle(tag);
          sections.push({
            id: getUniqueSectionId(title, usedIds),
            title,
            kind: classifySection(title, sectionBody),
            body: sectionBody,
          });
        }
        continue;
      }

      const headingMatch = line.match(/^(#{1,4})\s+(.+?)\s*$/);
      if (headingMatch) {
        pushCurrent();
        currentTitle = headingMatch[2].trim();
        currentBody = [];
        continue;
      }
    }

    if (!currentTitle && trimmed) {
      currentTitle = "Content";
    }

    if (currentTitle) {
      currentBody.push(line);
    }

    if (fenceStart) {
      inFence = !inFence;
    }
  }

  pushCurrent();
  return sections;
};

const createSequenceEdges = (nodes: SkillFlowNode[]): SkillFlowEdge[] =>
  nodes.slice(0, -1).map((node, index) => {
    const target = nodes[index + 1];
    return {
      id: `${node.id}-${target.id}`,
      source: node.id,
      target: target.id,
      sourceHandle: SKILL_FLOW_MAIN_SOURCE_HANDLE,
      targetHandle: SKILL_FLOW_MAIN_TARGET_HANDLE,
    };
  });

const normalizeSkillFilePath = (value: string) =>
  value
    .replace(/^[📄📁]\s*/u, "")
    .trim()
    .replace(/\\/g, "/");

const isDirectoryEntry = (value: string) => value.trim().startsWith("📁");

const isSkillMarkdown = (relativePath: string) =>
  relativePath.toLowerCase() === "skill.md";

const getFileExtension = (relativePath: string) => {
  const filename = relativePath.split("/").pop() ?? relativePath;
  const dotIndex = filename.lastIndexOf(".");

  if (dotIndex <= 0 || dotIndex === filename.length - 1) return "";
  return filename.slice(dotIndex + 1).toLowerCase();
};

const getFileLabel = (relativePath: string) =>
  relativePath.split("/").filter(Boolean).pop() ?? relativePath;

const getFileKind = (extension: string): SkillFlowFileKind => {
  if (["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"].includes(extension)) {
    return "image";
  }

  if (["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "key", "numbers", "pages"].includes(extension)) {
    return "document";
  }

  if (["md", "markdown", "txt", "log", "rtf"].includes(extension)) {
    return "text";
  }

  if (["css", "html", "js", "jsx", "json", "mjs", "py", "rs", "sh", "ts", "tsx"].includes(extension)) {
    return "code";
  }

  if (["csv", "toml", "xml", "yaml", "yml"].includes(extension)) {
    return "data";
  }

  return "other";
};

const normalizeSkillFiles = (skillFiles: string[]): SkillFlowFile[] =>
  skillFiles.flatMap((file) => {
    if (isDirectoryEntry(file)) return [];

    const relativePath = normalizeSkillFilePath(file);
    if (!relativePath || isSkillMarkdown(relativePath)) return [];

    const extension = getFileExtension(relativePath);
    return [
      {
        relativePath,
        label: getFileLabel(relativePath),
        extension,
        kind: getFileKind(extension),
      },
    ];
  });

const getFileSourceNodeId = (
  file: SkillFlowFile,
  sections: SkillFlowSection[],
) => {
  const relativePath = file.relativePath.toLowerCase();
  const label = file.label.toLowerCase();
  const matchingSection = sections.find((section) => {
    const body = section.body.toLowerCase();
    return body.includes(relativePath) || body.includes(label);
  });

  return matchingSection?.id ?? sections[0]?.id ?? "skill-overview";
};

export const buildSkillFlowGraph = ({
  skill,
  skillContent,
  skillFiles,
}: BuildSkillFlowGraphOptions): SkillFlowGraph => {
  const sections = extractSkillFlowSections(skillContent);
  const contentSections: SkillFlowNode[] = sections.map((section) => ({
    id: section.id,
    title: section.title,
    kind: section.kind,
    body: section.body,
    position: { x: 0, y: 0 },
  }));

  const fallbackOverviewNode: SkillFlowNode = {
      id: "skill-overview",
      title: skill.name,
      subtitle: `${skill.agent} / ${skill.is_symlink ? "SYMLINK" : "LOCAL"}`,
      kind: "overview",
      body: skill.description,
      position: { x: 0, y: 0 },
  };
  const mainNodesWithoutLayout: SkillFlowNode[] =
    contentSections.length > 0 ? contentSections : [fallbackOverviewNode];
  const mainNodes = mainNodesWithoutLayout.map((node, index) => ({
    ...node,
    position: {
      x: NODE_X + index * NODE_HORIZONTAL_GAP,
      y: NODE_Y,
    },
  }));
  const usedIds = new Set(mainNodes.map((node) => node.id));
  const mainNodeById = new Map(mainNodes.map((node) => [node.id, node]));
  const branchCountsBySource = new Map<string, number>();
  const fileNodes = normalizeSkillFiles(skillFiles).map((file) => {
    const sourceId = getFileSourceNodeId(file, sections);
    const sourceNode = mainNodeById.get(sourceId) ?? mainNodes[0];
    const branchIndex = branchCountsBySource.get(sourceId) ?? 0;
    branchCountsBySource.set(sourceId, branchIndex + 1);

    return {
      id: getUniqueNodeId(`file-${slugify(file.relativePath)}`, usedIds),
      title: file.label,
      subtitle: file.relativePath,
      kind: "file" as const,
      body: file.relativePath,
      file,
      position: {
        x: sourceNode.position.x + FILE_BRANCH_X_OFFSET,
        y: FILE_BRANCH_Y + branchIndex * FILE_BRANCH_VERTICAL_GAP,
      },
    };
  });
  const nodes = [...mainNodes, ...fileNodes];
  const fileEdges = fileNodes.map((node) => ({
    id: `${getFileSourceNodeId(node.file, sections)}-${node.id}`,
    source: getFileSourceNodeId(node.file, sections),
    target: node.id,
    sourceHandle: SKILL_FLOW_BRANCH_SOURCE_HANDLE,
    targetHandle: SKILL_FLOW_BRANCH_TARGET_HANDLE,
  }));

  return {
    nodes,
    edges: [...createSequenceEdges(mainNodes), ...fileEdges],
  };
};
