import { describe, expect, it } from "vitest";
import {
  buildSkillFlowGraph,
  extractSkillFlowSections,
  stripSkillFrontmatter,
} from "./skillFlowPresentation";
import type { SkillInfo } from "./skillTypes";

const baseSkill: SkillInfo = {
  name: "planning",
  description: "Turns a rough feature idea into an implementation plan.",
  agent: "Shared Library",
  path: "/skills/planning",
  canonical_path: "/skills/planning",
  is_symlink: false,
  source: "local",
  category: "development",
  category_assignment_mode: "manual",
  category_confidence: 1,
  category_classified_at: null,
  version: null,
};

describe("stripSkillFrontmatter", () => {
  it("removes leading YAML frontmatter without removing body delimiters", () => {
    const raw = [
      "---",
      "name: planning",
      "description: Plan work",
      "---",
      "",
      "# Overview",
      "Use this before implementation.",
      "",
      "---",
      "Keep this divider.",
    ].join("\n");

    expect(stripSkillFrontmatter(raw)).toBe(
      "# Overview\nUse this before implementation.\n\n---\nKeep this divider.",
    );
  });
});

describe("extractSkillFlowSections", () => {
  it("turns markdown headings and special workflow blocks into ordered sections", () => {
    const raw = [
      "---",
      "name: planning",
      "---",
      "# Overview",
      "Use this before implementation.",
      "## Checklist",
      "1. Explore context",
      "2. Write plan",
      "<HARD-GATE>",
      "Do not write code before approval.",
      "</HARD-GATE>",
      "## Process Flow",
      "```dot",
      "digraph { A -> B }",
      "```",
    ].join("\n");

    expect(extractSkillFlowSections(raw)).toEqual([
      {
        id: "section-overview",
        title: "Overview",
        kind: "content",
        body: "Use this before implementation.",
      },
      {
        id: "section-checklist",
        title: "Checklist",
        kind: "checklist",
        body: "1. Explore context\n2. Write plan",
      },
      {
        id: "section-hard-gate",
        title: "HARD-GATE",
        kind: "gate",
        body: "Do not write code before approval.",
      },
      {
        id: "section-process-flow",
        title: "Process Flow",
        kind: "flow",
        body: "```dot\ndigraph { A -> B }\n```",
      },
    ]);
  });
});

describe("buildSkillFlowGraph", () => {
  it("creates a readable node sequence from skill metadata and content", () => {
    const graph = buildSkillFlowGraph({
      skill: baseSkill,
      skillContent:
        [
          "# Overview",
          "Start here. See references/patterns.md.",
          "## Checklist",
          "1. Read assets/checklist.png.",
          "2. Run docs/runbook.pdf.",
        ].join("\n"),
      skillFiles: [
        "📄 SKILL.md",
        "📄 references/patterns.md",
        "📄 assets/checklist.png",
        "📄 docs/runbook.pdf",
        "📄 extras/logo.png",
      ],
    });

    expect(graph.nodes.map((node) => [node.id, node.kind, node.title])).toEqual([
      ["section-overview", "content", "Overview"],
      ["section-checklist", "checklist", "Checklist"],
      ["file-references-patterns-md", "file", "patterns.md"],
      ["file-assets-checklist-png", "file", "checklist.png"],
      ["file-docs-runbook-pdf", "file", "runbook.pdf"],
      ["file-extras-logo-png", "file", "logo.png"],
    ]);
    expect(graph.edges.map((edge) => [edge.source, edge.target])).toEqual([
      ["section-overview", "section-checklist"],
      ["section-overview", "file-references-patterns-md"],
      ["section-checklist", "file-assets-checklist-png"],
      ["section-checklist", "file-docs-runbook-pdf"],
      ["section-overview", "file-extras-logo-png"],
    ]);
    expect(
      graph.edges.map((edge) => [
        edge.id,
        edge.sourceHandle,
        edge.targetHandle,
      ]),
    ).toEqual([
      ["section-overview-section-checklist", "main-source", "main-target"],
      ["section-overview-file-references-patterns-md", "branch-source", "branch-target"],
      ["section-checklist-file-assets-checklist-png", "branch-source", "branch-target"],
      ["section-checklist-file-docs-runbook-pdf", "branch-source", "branch-target"],
      ["section-overview-file-extras-logo-png", "branch-source", "branch-target"],
    ]);
    expect(graph.nodes.find((node) => node.id === "file-assets-checklist-png")?.file).toMatchObject({
      relativePath: "assets/checklist.png",
      kind: "image",
    });
    expect(graph.nodes.find((node) => node.id === "file-references-patterns-md")?.file).toMatchObject({
      relativePath: "references/patterns.md",
      kind: "text",
    });
    expect(graph.nodes.find((node) => node.id === "file-docs-runbook-pdf")?.file).toMatchObject({
      relativePath: "docs/runbook.pdf",
      kind: "document",
    });
    expect(graph.nodes.find((node) => node.id === "file-references-patterns-md")?.position).toEqual({
      x: 640,
      y: 940,
    });
    expect(graph.nodes.find((node) => node.id === "file-extras-logo-png")?.position).toEqual({
      x: 640,
      y: 1760,
    });
    expect(graph.nodes.find((node) => node.id === "file-assets-checklist-png")?.position).toEqual({
      x: 1360,
      y: 940,
    });
    expect(graph.nodes.find((node) => node.id === "file-docs-runbook-pdf")?.position).toEqual({
      x: 1360,
      y: 1760,
    });
  });

  it("adds supported document files as branch nodes without listing SKILL.md", () => {
    const graph = buildSkillFlowGraph({
      skill: baseSkill,
      skillContent: "# References\nRead the attached guide.",
      skillFiles: ["SKILL.md", "guide.pdf", "notes.docx"],
    });

    expect(graph.nodes.map((node) => node.id)).not.toContain("file-skill-md");
    expect(graph.nodes.find((node) => node.id === "file-guide-pdf")?.file).toMatchObject({
      relativePath: "guide.pdf",
      kind: "document",
    });
    expect(graph.nodes.find((node) => node.id === "file-notes-docx")?.file).toMatchObject({
      relativePath: "notes.docx",
      kind: "document",
    });
  });

  it("lays out the default node sequence from left to right", () => {
    const graph = buildSkillFlowGraph({
      skill: baseSkill,
      skillContent: "# Overview\nStart here.\n## Checklist\n1. Read\n2. Run",
      skillFiles: ["SKILL.md"],
    });

    const positions = graph.nodes
      .filter((node) => node.kind !== "file")
      .map((node) => node.position);

    expect(new Set(positions.map((position) => position.y)).size).toBe(1);
    expect(positions.map((position) => position.x)).toEqual([80, 800]);
  });

  it("uses the skill overview as a fallback when SKILL.md has no body sections", () => {
    const graph = buildSkillFlowGraph({
      skill: baseSkill,
      skillContent: "",
      skillFiles: ["asset.png"],
    });

    expect(graph.nodes.map((node) => [node.id, node.kind, node.title])).toEqual([
      ["skill-overview", "overview", "planning"],
      ["file-asset-png", "file", "asset.png"],
    ]);
    expect(graph.edges.map((edge) => [edge.source, edge.target])).toEqual([
      ["skill-overview", "file-asset-png"],
    ]);
    expect(graph.edges.map((edge) => [edge.sourceHandle, edge.targetHandle])).toEqual([
      ["branch-source", "branch-target"],
    ]);
  });
});
