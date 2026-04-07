import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./styles/global.css";

import { Sidebar } from "./components/Sidebar/Sidebar";
import { Topbar } from "./components/Topbar/Topbar";
import { SkillGrid, SkillInfo, SelectionBox } from "./components/SkillGrid/SkillGrid";
import { DetailPanel } from "./components/DetailPanel/DetailPanel";
import { AgentFilter } from "./components/Sidebar/Sidebar";

interface AgentTarget {
  name: string;
  path: string;
  exists: boolean;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

// Helper to calculate the bounds for rendering the visual selection box
const getBoxStyle = (box: SelectionBox | null) => {
  if (!box) return { display: "none" };
  const left = Math.min(box.startX, box.currentX);
  const top = Math.min(box.startY, box.currentY);
  const width = Math.abs(box.startX - box.currentX);
  const height = Math.abs(box.startY - box.currentY);
  return { left, top, width, height, position: 'fixed', pointerEvents: 'none', zIndex: 1000, 
    border: '1px solid var(--accent-primary)', background: 'rgba(153, 0, 17, 0.2)' } as React.CSSProperties;
};

function App() {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AgentFilter>("all");
  const [search, setSearch] = useState("");
  
  // Single detail state
  const [selected, setSelected] = useState<SkillInfo | null>(null);
  
  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isAddingToSelection = useRef(false);
  const initialSelection = useRef<Set<string>>(new Set());
  
  // Drag and drop state
  const draggedBatchRef = useRef<SkillInfo[]>([]);
  const [dragOverTarget, setDragOverTarget] = useState<AgentFilter | null>(null);

  const [skillContent, setSkillContent] = useState("");
  const [skillFiles, setSkillFiles] = useState<string[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [targets, setTargets] = useState<AgentTarget[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);

  const refreshSkills = () => {
    invoke<SkillInfo[]>("scan_skills").then(setSkills).catch(console.error);
  };

  useEffect(() => {
    refreshSkills();
    invoke<AgentTarget[]>("get_agent_targets").then(setTargets).catch(console.error);
    setLoading(false);
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Multi-Selection Marquee Logic ---
  const handleGridMouseDown = (e: React.MouseEvent) => {
    // Don't start box if clicking on a card or its descendant
    if ((e.target as HTMLElement).closest(".skill-card")) {
      return;
    }

    setSelectionBox({
      startX: e.pageX,
      startY: e.pageY,
      currentX: e.pageX,
      currentY: e.pageY,
    });

    isAddingToSelection.current = e.metaKey || e.ctrlKey || e.shiftKey;
    if (isAddingToSelection.current) {
      initialSelection.current = new Set(selectedIds);
    } else {
      initialSelection.current = new Set();
      setSelectedIds(new Set());
    }

    e.preventDefault(); // Prevents text selection while dragging
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!selectionBox) return;

      setSelectionBox((prev) => {
        if (!prev) return null;
        return { ...prev, currentX: e.pageX, currentY: e.pageY };
      });

      // Process intersections
      const minX = Math.min(selectionBox.startX, e.pageX);
      const maxX = Math.max(selectionBox.startX, e.pageX);
      const minY = Math.min(selectionBox.startY, e.pageY);
      const maxY = Math.max(selectionBox.startY, e.pageY);

      const nextSelection = new Set(initialSelection.current);

      cardRefs.current.forEach((el, id) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        // Convert viewport rect to page coords
        const cardMinX = rect.left + window.scrollX;
        const cardMaxX = rect.right + window.scrollX;
        const cardMinY = rect.top + window.scrollY;
        const cardMaxY = rect.bottom + window.scrollY;

        const overlap = !(
          cardMaxX < minX ||
          cardMinX > maxX ||
          cardMaxY < minY ||
          cardMinY > maxY
        );

        if (overlap) {
          nextSelection.add(id);
        }
      });

      setSelectedIds(nextSelection);
    };

    const handleMouseUp = () => {
      setSelectionBox(null);
    };

    if (selectionBox) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [selectionBox]);

  // --- Click Logic ---
  const handleCardClick = (e: React.MouseEvent, skill: SkillInfo) => {
    const id = `${skill.agent}-${skill.name}`;
    
    // If cmd/ctrl clicking, just toggle multi-select state
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
      return;
    }

    // Default behavior: Select only this one and open detail panel
    setSelectedIds(new Set([id]));
    openDetail(skill);
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.DragEvent, skill: SkillInfo) => {
    const id = `${skill.agent}-${skill.name}`;
    
    // Ensure the dragged card is in the selection batch
    let batch: SkillInfo[];
    if (selectedIds.has(id)) {
      batch = filtered.filter(s => selectedIds.has(`${s.agent}-${s.name}`));
    } else {
      setSelectedIds(new Set([id]));
      batch = [skill];
    }
    
    draggedBatchRef.current = batch;
    e.dataTransfer.setData("text/plain", `Moving ${batch.length} skills`);

    const ghost = document.getElementById("drag-ghost");
    if (ghost) {
      ghost.textContent = `Moving ${batch.length} items`;
      e.dataTransfer.setDragImage(ghost, 15, 15);
    }
  };

  const handleDragOver = (e: React.DragEvent, targetKey: AgentFilter) => {
    if (targetKey === "all") return;
    e.preventDefault(); // Accept drop
    if (dragOverTarget !== targetKey) {
      setDragOverTarget(targetKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, targetKey: AgentFilter) => {
    e.preventDefault();
    setDragOverTarget(null);

    const batch = draggedBatchRef.current;
    
    if (targetKey === "all" || batch.length === 0) return;

    try {
      const result = await invoke<string>("batch_migrate_skills", {
        skills: batch,
        targetAgent: targetKey
      });
      showToast(result, "success");
      setSelectedIds(new Set());
      draggedBatchRef.current = [];
      refreshSkills();
    } catch (err) {
      showToast(String(err), "error");
    }
  };

  // --- Detail Panel Logic ---
  const openDetail = async (skill: SkillInfo) => {
    setSelected(skill);
    setContentLoading(true);
    try {
      const [content, files] = await Promise.all([
        invoke<string>("read_skill_content", { skillPath: skill.path }),
        invoke<string[]>("list_skill_files", { skillPath: skill.path }),
      ]);
      setSkillContent(content);
      setSkillFiles(files);
    } catch {
      setSkillContent("Could not load SKILL.md");
      setSkillFiles([]);
    }
    setContentLoading(false);
  };

  const closeDetail = () => {
    setSelected(null);
    setSkillContent("");
    setSkillFiles([]);
  };

  const handleInstall = async (targetAgent: string) => {
    if (!selected) return;
    try {
      const result = await invoke<string>("install_skill", {
        sourcePath: selected.path,
        targetAgent,
        useSymlink: true,
      });
      showToast(result, "success");
      refreshSkills();
    } catch (err) {
      showToast(String(err), "error");
    }
  };

  const handleUninstall = async () => {
    if (!selected) return;
    const confirmed = window.confirm(
      `Remove "${selected.name}" from ${selected.agent}?${
        selected.is_symlink
          ? " (symlink only — source will not be deleted)"
          : " This will delete all files permanently."
      }`
    );
    if (!confirmed) return;
    try {
      const result = await invoke<string>("uninstall_skill", {
        skillPath: selected.path,
      });
      showToast(result, "success");
      closeDetail();
      refreshSkills();
    } catch (err) {
      showToast(String(err), "error");
    }
  };

  // --- Filtering ---
  const filtered = skills.filter((s) => {
    const matchAgent = filter === "all" || s.agent === filter;
    const matchSearch =
      search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    return matchAgent && matchSearch;
  });

  const countByAgent = (agent: string) =>
    agent === "all"
      ? skills.length
      : skills.filter((s) => s.agent === agent).length;

  const symlinkCount = filtered.filter((s) => s.is_symlink).length;
  const localCount = filtered.length - symlinkCount;

  const installableTargets = selected
    ? targets.filter(
        (t) =>
          t.name !== selected.agent &&
          !skills.some((s) => s.name === selected.name && s.agent === t.name)
      )
    : [];

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      {selectionBox && (
        <div style={getBoxStyle(selectionBox)} />
      )}

      {/* Hidden Ghost Image for Native Drag and Drop */}
      <div 
        id="drag-ghost" 
        style={{ 
          position: "fixed", 
          top: "-1000px", 
          background: "var(--bg-panel)", 
          border: "1px solid var(--accent-primary)", 
          padding: "8px 12px", 
          borderRadius: "8px", 
          color: "var(--text-primary)", 
          fontSize: "14px", 
          fontWeight: 500, 
          boxShadow: "var(--shadow-md)", 
          zIndex: 9999 
        }}
      >
        Moving items
      </div>

      <Sidebar 
        filter={filter} 
        setFilter={setFilter} 
        countByAgent={countByAgent} 
        dragOverTarget={dragOverTarget} 
        onDragOver={handleDragOver} 
        onDragLeave={handleDragLeave} 
        onDrop={handleDrop} 
      />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Topbar 
          filter={filter} 
          search={search} 
          setSearch={setSearch} 
          filteredLength={filtered.length} 
          symlinkCount={symlinkCount} 
          localCount={localCount} 
        />

        <SkillGrid 
          filtered={filtered} 
          loading={loading} 
          search={search} 
          selectedIds={selectedIds} 
          activeDetailId={selected ? `${selected.agent}-${selected.name}` : undefined}
          cardRefs={cardRefs} 
          onGridMouseDown={handleGridMouseDown} 
          onCardClick={handleCardClick} 
          onDragStart={handleDragStart} 
        />
      </main>

      <DetailPanel 
        selected={selected} 
        contentLoading={contentLoading} 
        skillContent={skillContent} 
        skillFiles={skillFiles} 
        installableTargets={installableTargets} 
        onClose={closeDetail} 
        onInstall={handleInstall} 
        onUninstall={handleUninstall} 
      />

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default App;
