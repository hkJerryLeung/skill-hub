import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import "./styles/global.css";
import {
  DownloadIcon,
  FolderOpenIcon,
  GlobeIcon,
  RefreshIcon,
  SearchIcon,
  SettingsIcon,
  TrashIcon,
} from "./components/Icons/Icons";

import {
  Sidebar,
  type AgentFilter,
  type DiscoverView,
  type SidebarItem,
} from "./components/Sidebar/Sidebar";
import { ContextMenu, type ContextMenuSection } from "./components/ContextMenu/ContextMenu";
import { Topbar } from "./components/Topbar/Topbar";
import { SkillGrid, type SelectionBox } from "./components/SkillGrid/SkillGrid";
import { DetailPanel } from "./components/DetailPanel/DetailPanel";
import { MarketView } from "./components/MarketView/MarketView";
import { SettingsView } from "./components/SettingsView/SettingsView";
import {
  resolveDragEndFallbackTarget,
  resolveDragLeaveSnapshot,
  resolveMigrationBatch,
  resolveSidebarTargetFromPoint,
  shouldStartPointerDrag,
} from "./lib/dragDropState";
import {
  toggleStatusFilter,
  type StatusFilter,
} from "./lib/skillFilters";
import { buildBrowserSkillPresentation } from "./lib/skillBrowserPresentation";
import { getSkillId, matchesInstalledSkill } from "./lib/skillIdentity";
import { type SkillInfo } from "./lib/skillTypes";
import { getTopbarRefreshState } from "./lib/topbarRefreshState";
import {
  buildDiscoverMenuItems,
  buildSettingsMenuItems,
  buildSidebarAgentMenuItems,
  buildSkillMenuItems,
} from "./lib/contextMenuModel";
import {
  applyDocumentSettings,
  areSettingsEqual,
  resolveDefaultInstallTarget,
  resolveInitialBrowserState,
  type AgentTarget,
  type AppInfo,
  type AppSettings,
} from "./lib/appSettings";
import { type RemoteMarketEntry, type RemoteMarketSource } from "./lib/marketTypes";

interface Toast {
  message: string;
  type: "success" | "error";
}

interface PointerDragState {
  skill: SkillInfo;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  started: boolean;
}

interface SessionStatePayload {
  filter: AgentFilter;
  search: string;
  status_filter: StatusFilter;
}

interface ContextMenuState {
  x: number;
  y: number;
  sections: ContextMenuSection[];
}

const getBoxStyle = (box: SelectionBox | null) => {
  if (!box) return { display: "none" };
  const left = Math.min(box.startX, box.currentX);
  const top = Math.min(box.startY, box.currentY);
  const width = Math.abs(box.startX - box.currentX);
  const height = Math.abs(box.startY - box.currentY);
  return {
    left,
    top,
    width,
    height,
    position: "fixed",
    pointerEvents: "none",
    zIndex: 1000,
    border: "1px solid var(--accent-primary)",
    background: "rgba(153, 0, 17, 0.2)",
  } as React.CSSProperties;
};

function App() {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AgentFilter>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [discoverView, setDiscoverView] = useState<DiscoverView | null>(null);
  const [marketSearch, setMarketSearch] = useState("");
  const [marketTarget, setMarketTarget] = useState("");
  const [marketEntries, setMarketEntries] = useState<Record<RemoteMarketSource, RemoteMarketEntry[]>>({
    huggingface: [],
    "skills.sh": [],
  });
  const [marketLoading, setMarketLoading] = useState<Record<RemoteMarketSource, boolean>>({
    huggingface: false,
    "skills.sh": false,
  });
  const [marketErrors, setMarketErrors] = useState<Record<RemoteMarketSource, string | null>>({
    huggingface: null,
    "skills.sh": null,
  });
  const [installingMarketKey, setInstallingMarketKey] = useState<string | null>(null);
  const [githubInstallUrl, setGithubInstallUrl] = useState("");
  const [githubInstallSkillName, setGithubInstallSkillName] = useState("");
  const [githubInstalling, setGithubInstalling] = useState(false);

  const [selected, setSelected] = useState<SkillInfo | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isAddingToSelection = useRef(false);
  const initialSelection = useRef<Set<string>>(new Set());

  const draggedBatchRef = useRef<SkillInfo[]>([]);
  const [dragOverTarget, setDragOverTarget] = useState<AgentFilter | null>(null);

  const [skillContent, setSkillContent] = useState("");
  const [skillFiles, setSkillFiles] = useState<string[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [targets, setTargets] = useState<AgentTarget[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [updatingAll, setUpdatingAll] = useState(false);
  const [checkingSelected, setCheckingSelected] = useState(false);
  const [updatingSkillCanonicalPath, setUpdatingSkillCanonicalPath] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDebug, setDragDebug] = useState("idle");
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; count: number } | null>(null);
  const detailRequestIdRef = useRef(0);
  const currentDropTargetRef = useRef<AgentFilter | null>(null);
  const dropHandledRef = useRef(false);
  const migrationInFlightRef = useRef(false);
  const pointerDragRef = useRef<PointerDragState | null>(null);
  const suppressClickRef = useRef(false);

  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<AppSettings | null>(null);
  const [defaultSettings, setDefaultSettings] = useState<AppSettings | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const bootstrapCompleteRef = useRef(false);
  const autoCheckedOnLaunchRef = useRef(false);

  const activeSidebarItem: SidebarItem = settingsOpen ? "settings" : discoverView ?? filter;
  const settingsDirty =
    appSettings && settingsDraft ? !areSettingsEqual(appSettings, settingsDraft) : false;
  const localBrowserOpen = !settingsOpen && discoverView === null;
  const activeMarketSource: RemoteMarketSource | null =
    discoverView === "huggingface" || discoverView === "skills.sh" ? discoverView : null;

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const openContextMenu = (
    event: React.MouseEvent,
    sections: ContextMenuSection[],
  ) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      sections,
    });
  };

  const refreshSkills = async (options?: { reloadSelected?: boolean }) => {
    setLoading(true);
    try {
      const nextSkills = await invoke<SkillInfo[]>("scan_skills");
      setSkills(nextSkills);
      if (options?.reloadSelected && selected) {
        const nextSelected =
          nextSkills.find((skill) => skill.path === selected.path) ??
          nextSkills.find((skill) => skill.canonical_path === selected.canonical_path);

        if (nextSelected) {
          await openDetail(nextSelected);
        } else {
          closeDetail();
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const refreshMeta = async () => {
    try {
      const [nextTargets, nextInfo] = await Promise.all([
        invoke<AgentTarget[]>("get_agent_targets"),
        invoke<AppInfo>("get_app_info"),
      ]);
      setTargets(nextTargets);
      setAppInfo(nextInfo);
    } catch (error) {
      console.error(error);
    }
  };

  const runCheckAll = async () => {
    setCheckingAll(true);
    try {
      const result = await invoke<string>("check_all_skill_updates");
      showToast(result, "success");
    } catch (err) {
      showToast(String(err), "error");
    } finally {
      await refreshSkills({ reloadSelected: !!selected });
      setCheckingAll(false);
    }
  };

  const closeDetail = () => {
    detailRequestIdRef.current += 1;
    setSelected(null);
    setSkillContent("");
    setSkillFiles([]);
    setContentLoading(false);
  };

  const openDetail = async (skill: SkillInfo) => {
    const requestId = ++detailRequestIdRef.current;
    setSelected(skill);
    setContentLoading(true);
    try {
      const [content, files] = await Promise.all([
        invoke<string>("read_skill_content", { skillPath: skill.path }),
        invoke<string[]>("list_skill_files", { skillPath: skill.path }),
      ]);
      if (detailRequestIdRef.current !== requestId) return;
      setSkillContent(content);
      setSkillFiles(files);
    } catch {
      if (detailRequestIdRef.current !== requestId) return;
      setSkillContent("Could not load SKILL.md");
      setSkillFiles([]);
    } finally {
      if (detailRequestIdRef.current === requestId) {
        setContentLoading(false);
      }
    }
  };

  const openSettings = () => {
    closeContextMenu();
    closeDetail();
    setDiscoverView(null);
    setSettingsOpen(true);
  };

  const openFilter = (nextFilter: AgentFilter) => {
    closeContextMenu();
    setSettingsOpen(false);
    setDiscoverView(null);
    setFilter(nextFilter);
    setStatusFilter((current) => {
      if (
        nextFilter === "Shared Library" &&
        (current === "symlinked" || current === "local")
      ) {
        return "all";
      }

      return current;
    });
  };

  const openDiscover = (view: DiscoverView) => {
    closeContextMenu();
    closeDetail();
    setSelectedIds(new Set());
    setSettingsOpen(false);
    setDiscoverView(view);
  };

  const confirmIfNeeded = async (
    message: string,
    enabled: boolean,
  ) => {
    if (!enabled) return true;
    return window.confirm(message);
  };

  useEffect(() => {
    let isActive = true;

    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [
          nextSkills,
          nextTargets,
          nextSettings,
          nextDefaults,
          nextSession,
          nextInfo,
        ] = await Promise.all([
          invoke<SkillInfo[]>("scan_skills"),
          invoke<AgentTarget[]>("get_agent_targets"),
          invoke<AppSettings>("get_app_settings"),
          invoke<AppSettings>("get_default_app_settings"),
          invoke<SessionStatePayload>("get_browser_session_state"),
          invoke<AppInfo>("get_app_info"),
        ]);

        if (!isActive) return;

        const initialBrowserState = resolveInitialBrowserState(nextSettings, {
          filter: nextSession.filter,
          search: nextSession.search,
          statusFilter: nextSession.status_filter,
        });

        setSkills(nextSkills);
        setTargets(nextTargets);
        setAppSettings(nextSettings);
        setSettingsDraft(nextSettings);
        setDefaultSettings(nextDefaults);
        setAppInfo(nextInfo);
        setFilter(initialBrowserState.filter);
        setSearch(initialBrowserState.search);
        setStatusFilter(initialBrowserState.statusFilter);
        applyDocumentSettings(nextSettings);
        bootstrapCompleteRef.current = true;

        if (
          nextSettings.auto_check_updates_on_launch &&
          !autoCheckedOnLaunchRef.current
        ) {
          autoCheckedOnLaunchRef.current = true;
          void runCheckAll();
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!appSettings) return;

    applyDocumentSettings(appSettings);

    if (appSettings.theme_mode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const listener = () => applyDocumentSettings(appSettings);
    mediaQuery.addEventListener("change", listener);

    return () => {
      mediaQuery.removeEventListener("change", listener);
    };
  }, [appSettings]);

  useEffect(() => {
    if (marketTarget !== "" || targets.length === 0) return;

    setMarketTarget(resolveDefaultInstallTarget(targets));
  }, [targets, marketTarget]);

  useEffect(() => {
    if (!bootstrapCompleteRef.current || !appSettings?.restore_last_session) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const session: SessionStatePayload = {
        filter,
        search,
        status_filter: statusFilter,
      };

      void invoke("save_browser_session_state", { session }).catch((error) => {
        console.error("Failed to save session state:", error);
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [appSettings?.restore_last_session, filter, search, statusFilter]);

  const loadRemoteMarket = async (source: RemoteMarketSource) => {
    setMarketLoading((current) => ({ ...current, [source]: true }));
    setMarketErrors((current) => ({ ...current, [source]: null }));

    try {
      const nextEntries = await invoke<RemoteMarketEntry[]>("fetch_remote_market", {
        source,
      });
      setMarketEntries((current) => ({ ...current, [source]: nextEntries }));
    } catch (error) {
      setMarketErrors((current) => ({ ...current, [source]: String(error) }));
    } finally {
      setMarketLoading((current) => ({ ...current, [source]: false }));
    }
  };

  useEffect(() => {
    if (!activeMarketSource) return;
    if (marketEntries[activeMarketSource].length > 0) return;
    if (marketLoading[activeMarketSource]) return;
    if (marketErrors[activeMarketSource] !== null) return;

    void loadRemoteMarket(activeMarketSource);
  }, [activeMarketSource, marketEntries, marketLoading, marketErrors]);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handleWindowDragOver = (event: DragEvent) => {
      const sidebarRows = Array.from(
        document.querySelectorAll<HTMLElement>("[data-agent-key]"),
      ).map((row) => {
        const rect = row.getBoundingClientRect();
        return {
          agentKey: row.dataset.agentKey,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        };
      });

      const nextTarget = resolveSidebarTargetFromPoint(sidebarRows, {
        clientX: event.clientX,
        clientY: event.clientY,
      });

      if (nextTarget) {
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "move";
        }
      }

      currentDropTargetRef.current = nextTarget;
      setDragDebug(`window:${nextTarget ?? "none"} @ ${event.clientX},${event.clientY}`);
      setDragOverTarget((prev) => (prev === nextTarget ? prev : nextTarget));
    };

    window.addEventListener("dragover", handleWindowDragOver, true);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver, true);
    };
  }, [isDragging]);

  const handleGridMouseDown = (e: React.MouseEvent) => {
    closeContextMenu();
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

    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!selectionBox) return;

      setSelectionBox((prev) => {
        if (!prev) return null;
        return { ...prev, currentX: e.pageX, currentY: e.pageY };
      });

      const minX = Math.min(selectionBox.startX, e.pageX);
      const maxX = Math.max(selectionBox.startX, e.pageX);
      const minY = Math.min(selectionBox.startY, e.pageY);
      const maxY = Math.max(selectionBox.startY, e.pageY);

      const nextSelection = new Set(initialSelection.current);

      cardRefs.current.forEach((el, id) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
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
  }, [selectionBox, selectedIds]);

  const handleCardClick = (e: React.MouseEvent, skill: SkillInfo) => {
    closeContextMenu();
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    const id = getSkillId(skill);

    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
      return;
    }

    setSelectedIds(new Set([id]));
    openDetail(skill);
  };

  const handleDragStart = (e: React.MouseEvent, skill: SkillInfo) => {
    if (e.button !== 0) return;

    e.preventDefault();
    dropHandledRef.current = false;
    currentDropTargetRef.current = null;
    draggedBatchRef.current = [];
    pointerDragRef.current = {
      skill,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      started: false,
    };
    setDragDebug("pending");
    setDragPreview(null);
    setDragOverTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, targetKey: AgentFilter) => {
    if (targetKey === "all") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    currentDropTargetRef.current = targetKey;
    setDragDebug(`sidebar:${targetKey}`);
    if (dragOverTarget !== targetKey) {
      setDragOverTarget(targetKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent, _targetKey: AgentFilter) => {
    const nextTarget = e.relatedTarget;
    const nextSnapshot = resolveDragLeaveSnapshot(
      {
        currentDropTarget: currentDropTargetRef.current,
        dragOverTarget,
      },
      nextTarget instanceof Node && e.currentTarget.contains(nextTarget),
    );

    currentDropTargetRef.current = nextSnapshot.currentDropTarget;
    setDragDebug(`leave:${nextSnapshot.dragOverTarget ?? "none"}`);

    if (dragOverTarget !== nextSnapshot.dragOverTarget) {
      setDragOverTarget(nextSnapshot.dragOverTarget);
    }
  };

  const migrateDraggedSkills = async (
    targetKey: AgentFilter,
    options?: { allowSelectedFallback?: boolean },
  ) => {
    if (targetKey === "all" || migrationInFlightRef.current) return;

    const { batch, movableBatch } = resolveMigrationBatch({
      draggedBatch: draggedBatchRef.current,
      selectedIds,
      skills,
      getSkillId,
      targetKey,
      allowSelectedFallback: !!options?.allowSelectedFallback,
    });

    if (batch.length === 0) return;

    if (movableBatch.length === 0) {
      draggedBatchRef.current = [];
      showToast(`Selected skills are already in ${targetKey}`, "error");
      return;
    }

    await executeMigrationBatch(movableBatch, targetKey);
    draggedBatchRef.current = [];
    currentDropTargetRef.current = null;
  };

  const executeMigrationBatch = async (
    movableBatch: SkillInfo[],
    targetKey: AgentFilter,
  ) => {
    if (movableBatch.length === 0) return;

    const shouldContinue = await confirmIfNeeded(
      `Move ${movableBatch.length} skill${
        movableBatch.length === 1 ? "" : "s"
      } to ${targetKey}?`,
      !!appSettings?.confirm_before_batch_migrate,
    );
    if (!shouldContinue) {
      setDragOverTarget(null);
      return;
    }

    migrationInFlightRef.current = true;
    try {
      const result = await invoke<string>("batch_migrate_skills", {
        skills: movableBatch,
        targetAgent: targetKey,
      });
      showToast(result, "success");
      setSelectedIds(new Set());
      await refreshSkills({ reloadSelected: !!selected });
    } catch (err) {
      showToast(String(err), "error");
    } finally {
      migrationInFlightRef.current = false;
    }
  };

  const handleDragEnd = () => {
    const fallbackTarget = resolveDragEndFallbackTarget({
      currentDropTarget: currentDropTargetRef.current,
      dropHandled: dropHandledRef.current,
      migrationInFlight: migrationInFlightRef.current,
    });
    setDragDebug(`end:${fallbackTarget ?? "none"}`);
    setIsDragging(false);
    setDragPreview(null);
    setDragOverTarget(null);

    if (fallbackTarget) {
      void migrateDraggedSkills(fallbackTarget, { allowSelectedFallback: true });
      return;
    }

    draggedBatchRef.current = [];
    currentDropTargetRef.current = null;
    dropHandledRef.current = false;
  };

  const handleDrop = async (e: React.DragEvent, targetKey: AgentFilter) => {
    e.preventDefault();
    dropHandledRef.current = true;
    setDragDebug(`drop:${targetKey}`);
    setDragOverTarget(null);
    await migrateDraggedSkills(targetKey, { allowSelectedFallback: true });
    dropHandledRef.current = false;
  };

  useEffect(() => {
    const handlePointerMove = (event: MouseEvent) => {
      const pointerDrag = pointerDragRef.current;
      if (!pointerDrag) return;

      pointerDrag.currentX = event.clientX;
      pointerDrag.currentY = event.clientY;

      if (!pointerDrag.started) {
        const started = shouldStartPointerDrag({
          startX: pointerDrag.startX,
          startY: pointerDrag.startY,
          currentX: event.clientX,
          currentY: event.clientY,
        });

        if (!started) return;

        const id = getSkillId(pointerDrag.skill);
        let batch: SkillInfo[];
        if (selectedIds.has(id)) {
          batch = skills.filter((skill) => selectedIds.has(getSkillId(skill)));
        } else {
          setSelectedIds(new Set([id]));
          batch = [pointerDrag.skill];
        }

        draggedBatchRef.current = batch;
        pointerDrag.started = true;
        suppressClickRef.current = true;
        setIsDragging(true);
        setDragDebug(`pointer-start:${batch.length}`);
      }

      const sidebarRows = Array.from(
        document.querySelectorAll<HTMLElement>("[data-agent-key]"),
      ).map((row) => {
        const rect = row.getBoundingClientRect();
        return {
          agentKey: row.dataset.agentKey,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        };
      });

      const nextTarget = resolveSidebarTargetFromPoint(sidebarRows, {
        clientX: event.clientX,
        clientY: event.clientY,
      });

      currentDropTargetRef.current = nextTarget;
      setDragPreview({
        x: event.clientX,
        y: event.clientY,
        count: draggedBatchRef.current.length,
      });
      setDragDebug(`pointer:${nextTarget ?? "none"} @ ${event.clientX},${event.clientY}`);
      if (dragOverTarget !== nextTarget) {
        setDragOverTarget(nextTarget);
      }
    };

    const handlePointerUp = () => {
      const pointerDrag = pointerDragRef.current;
      if (!pointerDrag) return;

      pointerDragRef.current = null;

      if (pointerDrag.started) {
        handleDragEnd();
        return;
      }

      draggedBatchRef.current = [];
      currentDropTargetRef.current = null;
      dropHandledRef.current = false;
      setDragDebug("idle");
      setDragPreview(null);
      setDragOverTarget(null);
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [dragOverTarget, selectedIds, skills, appSettings]);

  const handleInstallSpecific = async (skill: SkillInfo, targetAgent: string) => {
    try {
      const result = await invoke<string>("install_skill", {
        sourcePath: skill.path,
        targetAgent,
      });
      showToast(result, "success");
      await refreshSkills({ reloadSelected: !!selected });
      await refreshMeta();
    } catch (err) {
      showToast(String(err), "error");
    }
  };

  const handleInstall = async (targetAgent: string) => {
    if (!selected) return;
    await handleInstallSpecific(selected, targetAgent);
  };

  const handleInstallMarketEntry = async (entry: RemoteMarketEntry) => {
    if (marketTarget === "") return;

    const marketKey = `${entry.repo}:${entry.skill_id}`;
    setInstallingMarketKey(marketKey);
    try {
      const result = await invoke<string>("install_skill_from_github", {
        githubUrl: entry.github_url,
        targetAgent: marketTarget,
        skillName: entry.skill_id,
        marketSource: entry.source,
        marketUrl: entry.market_url,
      });
      showToast(result, "success");
      await Promise.all([
        refreshSkills({ reloadSelected: !!selected }),
        refreshMeta(),
      ]);
    } catch (error) {
      showToast(String(error), "error");
    } finally {
      setInstallingMarketKey(null);
    }
  };

  const handleInstallGithub = async () => {
    const url = githubInstallUrl.trim();
    const skillName = githubInstallSkillName.trim();

    if (url === "" || marketTarget === "") return;

    setGithubInstalling(true);
    try {
      const result = await invoke<string>("install_skill_from_github", {
        githubUrl: url,
        targetAgent: marketTarget,
        skillName: skillName === "" ? null : skillName,
        marketSource: null,
        marketUrl: null,
      });
      showToast(result, "success");
      setGithubInstallUrl("");
      setGithubInstallSkillName("");
      await Promise.all([
        refreshSkills({ reloadSelected: !!selected }),
        refreshMeta(),
      ]);
    } catch (error) {
      showToast(String(error), "error");
    } finally {
      setGithubInstalling(false);
    }
  };

  const handleRemoveSkill = async (skill: SkillInfo) => {
    const confirmed = await confirmIfNeeded(
      `Remove "${skill.name}" from ${skill.agent}?${
        skill.agent === "Shared Library"
          ? " This will delete the shared source and remove linked symlinks from all agents."
          : skill.is_symlink
            ? " (SYMLINK only — source will not be deleted)"
            : " This will delete all files permanently."
      }`,
      appSettings?.confirm_before_uninstall ?? true,
    );
    if (!confirmed) return;

    try {
      const result = await invoke<string>("uninstall_skill", {
        skillPath: skill.path,
      });
      showToast(result, "success");
      if (selected?.path === skill.path) {
        closeDetail();
      }
      await refreshSkills({ reloadSelected: !!selected });
      await refreshMeta();
    } catch (err) {
      showToast(String(err), "error");
    }
  };

  const handleUninstall = async () => {
    if (!selected) return;
    await handleRemoveSkill(selected);
  };

  const handleUninstallFromTarget = async (skillPath: string, isSymlink: boolean) => {
    const confirmed = await confirmIfNeeded(
      isSymlink
        ? "Remove SYMLINK from this agent? (source will not be deleted)"
        : "Remove this copied skill from this agent? This will delete its files permanently.",
      appSettings?.confirm_before_uninstall ?? true,
    );
    if (!confirmed) return;

    try {
      const result = await invoke<string>("uninstall_skill", {
        skillPath,
      });
      showToast(result, "success");
      await refreshSkills({ reloadSelected: true });
      await refreshMeta();
    } catch (err) {
      showToast(String(err), "error");
    }
  };

  const handleCheckSkill = async (skill: SkillInfo) => {
    const isSelectedSkill = selected?.path === skill.path;
    if (isSelectedSkill) {
      setCheckingSelected(true);
    }
    try {
      const result = await invoke<string>("check_skill_updates", {
        skillPath: skill.path,
      });
      showToast(result, "success");
    } catch (err) {
      showToast(String(err), "error");
    } finally {
      await refreshSkills({ reloadSelected: !!selected });
      if (isSelectedSkill) {
        setCheckingSelected(false);
      }
    }
  };

  const handleCheckSelected = async () => {
    if (!selected) return;
    await handleCheckSkill(selected);
  };

  const runSingleSkillUpdate = async (skill: SkillInfo) => {
    if (updatingSkillCanonicalPath || updatingAll || checkingAll) return;

    setUpdatingSkillCanonicalPath(skill.canonical_path);
    try {
      const result = await invoke<string>("update_skill", {
        skillPath: skill.path,
      });
      showToast(result, "success");
    } catch (err) {
      showToast(String(err), "error");
    } finally {
      await refreshSkills({ reloadSelected: !!selected });
      setUpdatingSkillCanonicalPath(null);
    }
  };

  const handleUpdateSelected = async () => {
    if (!selected) return;
    await runSingleSkillUpdate(selected);
  };

  const handleInlineUpdate = async (skill: SkillInfo) => {
    await runSingleSkillUpdate(skill);
  };

  const handleUpdateAll = async () => {
    setUpdatingAll(true);
    try {
      const result = await invoke<string>("update_all_skills");
      showToast(result, "success");
    } catch (err) {
      showToast(String(err), "error");
    } finally {
      await refreshSkills({ reloadSelected: !!selected });
      setUpdatingAll(false);
    }
  };

  const handleStatusFilterChange = (nextFilter: StatusFilter) => {
    setStatusFilter((current) => toggleStatusFilter(current, nextFilter));
  };

  const handleSettingsChange = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => {
    setSettingsDraft((current) => {
      if (!current) return current;
      const next = { ...current, [key]: value };
      if (
        key === "startup_view" &&
        value === "Shared Library" &&
        (next.startup_status_filter === "symlinked" ||
          next.startup_status_filter === "local")
      ) {
        next.startup_status_filter = "all";
      }
      setSettingsError(null);
      return next;
    });
  };

  const handleBrowseSharedLibrary = async () => {
    if (!settingsDraft) return;
    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
        defaultPath: settingsDraft.shared_library_path,
      });

      if (typeof selectedPath === "string") {
        handleSettingsChange("shared_library_path", selectedPath);
      }
    } catch (error) {
      showToast(String(error), "error");
    }
  };

  const handleSaveSettings = async () => {
    if (!settingsDraft) return;

    setSettingsSaving(true);
    setSettingsError(null);
    try {
      const sharedPathChanged =
        appSettings?.shared_library_path !== settingsDraft.shared_library_path;
      const saved = await invoke<AppSettings>("save_app_settings", {
        settingsPayload: settingsDraft,
      });
      setAppSettings(saved);
      setSettingsDraft(saved);
      const reconcileMessage = sharedPathChanged
        ? await invoke<string>("reconcile_shared_library_targets")
        : null;
      await Promise.all([
        refreshSkills({ reloadSelected: !!selected }),
        refreshMeta(),
      ]);
      showToast(
        reconcileMessage ? `Settings saved. ${reconcileMessage}` : "Settings saved",
        "success",
      );
    } catch (error) {
      const message = String(error);
      setSettingsError(message);
      showToast(message, "error");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleCancelSettings = () => {
    if (!appSettings) return;
    setSettingsDraft(appSettings);
    setSettingsError(null);
  };

  const handleLoadDefaults = async () => {
    try {
      const defaults =
        defaultSettings ?? (await invoke<AppSettings>("get_default_app_settings"));
      setDefaultSettings(defaults);
      setSettingsDraft(defaults);
      setSettingsError(null);
    } catch (error) {
      showToast(String(error), "error");
    }
  };

  const handleRescan = async () => {
    await Promise.all([
      refreshSkills({ reloadSelected: !!selected }),
      refreshMeta(),
    ]);
    showToast("Skill scan refreshed", "success");
  };

  const handleClearUpdateCache = async () => {
    try {
      const result = await invoke<string>("clear_update_cache");
      showToast(result, "success");
      await refreshSkills({ reloadSelected: !!selected });
    } catch (error) {
      showToast(String(error), "error");
    }
  };

  const handleRevealPath = async (path: string) => {
    try {
      await revealItemInDir(path);
    } catch (error) {
      showToast(String(error), "error");
    }
  };

  const handleOpenSettingsWithDefaults = async () => {
    openSettings();
    await handleLoadDefaults();
  };

  const handleSidebarAgentContextMenu = (
    event: React.MouseEvent,
    agent: AgentFilter,
  ) => {
    const items = buildSidebarAgentMenuItems({ agent, targets }).map((item) => ({
      ...item,
      icon:
        item.id === "reveal" ? <FolderOpenIcon size={14} /> :
        item.id === "rescan" || item.id === "check-updates" ? <RefreshIcon size={14} /> :
        item.id === "update-all" ? <DownloadIcon size={14} /> :
        <SearchIcon size={14} />,
      onSelect: async () => {
        if (item.id === "open") {
          openFilter(agent);
          return;
        }
        if (item.id === "reveal") {
          const path = targets.find((target) => target.name === agent)?.path;
          if (path) {
            await handleRevealPath(path);
          }
          return;
        }
        if (item.id === "rescan") {
          await handleRescan();
          return;
        }
        if (item.id === "check-updates") {
          await runCheckAll();
          return;
        }
        if (item.id === "update-all") {
          await handleUpdateAll();
        }
      },
    }));

    openContextMenu(event, [{ key: "sidebar-agent", items }]);
  };

  const handleDiscoverContextMenu = (
    event: React.MouseEvent,
    view: DiscoverView,
  ) => {
    const refreshable = view === "huggingface" || view === "skills.sh";
    const items = buildDiscoverMenuItems({ view }).map((item) => ({
      ...item,
      disabled: item.id === "refresh-source" ? !refreshable : item.disabled,
      icon: item.id === "refresh-source" ? <RefreshIcon size={14} /> : <GlobeIcon size={14} />,
      onSelect: async () => {
        if (item.id === "open") {
          openDiscover(view);
          return;
        }
        if (item.id === "refresh-source" && refreshable) {
          await loadRemoteMarket(view);
        }
      },
    }));

    openContextMenu(event, [{ key: "discover", items }]);
  };

  const handleSettingsContextMenu = (event: React.MouseEvent) => {
    const items = buildSettingsMenuItems().map((item) => ({
      ...item,
      icon: <SettingsIcon size={14} />,
      onSelect: async () => {
        if (item.id === "open-settings") {
          openSettings();
          return;
        }
        if (item.id === "load-defaults") {
          await handleOpenSettingsWithDefaults();
        }
      },
    }));

    openContextMenu(event, [{ key: "settings", items }]);
  };

  const handleSkillContextMenu = (event: React.MouseEvent, skill: SkillInfo) => {
    const id = getSkillId(skill);
    const shouldUseBatch = selectedIds.size > 1 && selectedIds.has(id);
    const menuSkills = shouldUseBatch
      ? skills.filter((candidate) => selectedIds.has(getSkillId(candidate)))
      : [skill];

    if (!shouldUseBatch) {
      setSelectedIds(new Set([id]));
    }

    const menuModel = buildSkillMenuItems({
      selectedSkills: menuSkills,
      targets,
    });

    const toMenuSections = (): ContextMenuSection[] => {
      const singleSkill = menuSkills[0];
      return [
        {
          key: "primary",
          items: menuModel.primary.map((item) => ({
            ...item,
            icon:
              item.id === "reveal" ? <FolderOpenIcon size={14} /> :
              item.id === "check-update" ? <RefreshIcon size={14} /> :
              item.id === "update-skill" ? <DownloadIcon size={14} /> :
              <SearchIcon size={14} />,
            onSelect: async () => {
              if (item.id === "open-details") {
                await openDetail(singleSkill);
                return;
              }
              if (item.id === "reveal") {
                await handleRevealPath(singleSkill.path);
                return;
              }
              if (item.id === "check-update") {
                await handleCheckSkill(singleSkill);
                return;
              }
              if (item.id === "update-skill") {
                await runSingleSkillUpdate(singleSkill);
              }
            },
          })),
        },
        {
          key: "install",
          items: menuModel.install.map((item) => ({
            ...item,
            icon: <DownloadIcon size={14} />,
            onSelect: async () => {
              if (item.target) {
                await handleInstallSpecific(singleSkill, item.target as AgentFilter);
              }
            },
          })),
        },
        {
          key: "move",
          items: menuModel.move.map((item) => ({
            ...item,
            icon: <RefreshIcon size={14} />,
            onSelect: async () => {
              if (item.target) {
                await executeMigrationBatch(menuSkills, item.target as AgentFilter);
              }
            },
          })),
        },
        {
          key: "danger",
          items: menuModel.danger.map((item) => ({
            ...item,
            icon: <TrashIcon size={14} />,
            onSelect: async () => {
              await handleRemoveSkill(singleSkill);
            },
          })),
        },
      ];
    };

    openContextMenu(event, toMenuSections());
  };

  useEffect(() => {
    if (
      filter === "Shared Library" &&
      (statusFilter === "symlinked" || statusFilter === "local")
    ) {
      setStatusFilter("all");
    }
  }, [filter, statusFilter]);

  const { skills: filtered, statusCounts } = buildBrowserSkillPresentation(
    skills,
    filter,
    search,
    statusFilter,
  );

  const countByAgent = (agent: string) =>
    agent === "all"
      ? skills.length
      : skills.filter((skill) => skill.agent === agent).length;

  const agentStatuses = selected
    ? targets
        .filter((target) => target.name !== selected.agent)
        .map((target) => {
          const installedSkill = skills.find(
            (skill) =>
              skill.agent === target.name && matchesInstalledSkill(selected, skill),
          );
          return {
            name: target.name,
            installed: !!installedSkill,
            skillPath: installedSkill?.path,
            isSymlink: installedSkill?.is_symlink ?? false,
          };
        })
    : [];

  const currentMarketEntries = activeMarketSource ? marketEntries[activeMarketSource] : [];
  const currentMarketLoading = activeMarketSource ? marketLoading[activeMarketSource] : false;
  const currentMarketError = activeMarketSource ? marketErrors[activeMarketSource] : null;
  const topbarRefreshState = getTopbarRefreshState({
    loading,
    checkingAll,
    updatingAll,
    updatingSkill: updatingSkillCanonicalPath !== null,
  });

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      {selectionBox && localBrowserOpen && <div style={getBoxStyle(selectionBox)} />}

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
          zIndex: 9999,
        }}
      >
        Moving items
      </div>

      {isDragging && appSettings?.show_drag_debug_overlay && (
        <div
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            zIndex: 10001,
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid var(--accent-primary)",
            background: "rgba(18, 18, 20, 0.92)",
            color: "var(--text-primary)",
            fontSize: "12px",
            lineHeight: 1.4,
            pointerEvents: "none",
            whiteSpace: "pre-line",
          }}
        >
          {`drag=${dragDebug}\ntarget=${dragOverTarget ?? "none"}`}
        </div>
      )}

      {dragPreview && localBrowserOpen && (
        <div
          style={{
            position: "fixed",
            left: dragPreview.x + 14,
            top: dragPreview.y + 14,
            zIndex: 10002,
            padding: "8px 12px",
            borderRadius: "10px",
            border: "1px solid var(--accent-primary)",
            background: "var(--bg-panel)",
            color: "var(--text-primary)",
            fontSize: "14px",
            fontWeight: 500,
            boxShadow: "var(--shadow-md)",
            pointerEvents: "none",
          }}
        >
          {`Moving ${dragPreview.count} items`}
        </div>
      )}

      <Sidebar
        activeItem={activeSidebarItem}
        setFilter={openFilter}
        onOpenDiscover={openDiscover}
        onOpenSettings={openSettings}
        onAgentContextMenu={handleSidebarAgentContextMenu}
        onDiscoverContextMenu={handleDiscoverContextMenu}
        onSettingsContextMenu={handleSettingsContextMenu}
        countByAgent={countByAgent}
        dragOverTarget={dragOverTarget}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {settingsOpen ? (
          settingsDraft && (
            <SettingsView
              draftSettings={settingsDraft}
              targets={targets}
              appInfo={appInfo}
              saving={settingsSaving}
              dirty={settingsDirty}
              error={settingsError}
              onSettingsChange={handleSettingsChange}
              onBrowseSharedLibrary={handleBrowseSharedLibrary}
              onSave={handleSaveSettings}
              onCancel={handleCancelSettings}
              onLoadDefaults={handleLoadDefaults}
              onRescan={handleRescan}
              onClearUpdateCache={handleClearUpdateCache}
              onRevealPath={handleRevealPath}
            />
          )
        ) : discoverView ? (
          <MarketView
            view={discoverView}
            entries={currentMarketEntries}
            loading={currentMarketLoading}
            error={currentMarketError}
            search={marketSearch}
            setSearch={setMarketSearch}
            installTarget={marketTarget}
            setInstallTarget={setMarketTarget}
            installTargets={targets}
            onRefresh={() => {
              if (activeMarketSource) {
                void loadRemoteMarket(activeMarketSource);
              }
            }}
            onInstallEntry={handleInstallMarketEntry}
            installingEntryKey={installingMarketKey}
            githubInstallUrl={githubInstallUrl}
            setGithubInstallUrl={setGithubInstallUrl}
            githubInstallSkillName={githubInstallSkillName}
            setGithubInstallSkillName={setGithubInstallSkillName}
            onInstallGithub={handleInstallGithub}
            githubInstalling={githubInstalling}
          />
        ) : (
          <>
            <Topbar
              filter={filter}
              search={search}
              setSearch={setSearch}
              statusFilter={statusFilter}
              statusCounts={statusCounts}
              refreshing={topbarRefreshState.spinning}
              refreshDisabled={topbarRefreshState.disabled}
              refreshLabel={topbarRefreshState.label}
              checkingAll={checkingAll}
              updatingAll={updatingAll}
              onStatusFilterChange={handleStatusFilterChange}
              onRefresh={handleRescan}
              onCheckUpdates={runCheckAll}
              onUpdateAll={handleUpdateAll}
            />

            <SkillGrid
              filtered={filtered}
              loading={loading}
              search={search}
              selectedIds={selectedIds}
              activeDetailId={selected ? getSkillId(selected) : undefined}
              cardRefs={cardRefs}
              onGridMouseDown={handleGridMouseDown}
              onCardClick={handleCardClick}
              onCardMouseDown={handleDragStart}
              onCardContextMenu={handleSkillContextMenu}
              updatingSkillCanonicalPath={updatingSkillCanonicalPath}
              updatesLocked={
                checkingAll || updatingAll || updatingSkillCanonicalPath !== null
              }
              onInlineUpdate={handleInlineUpdate}
            />
          </>
        )}
      </main>

      {localBrowserOpen && (
        <DetailPanel
          selected={selected}
          contentLoading={contentLoading}
          skillContent={skillContent}
          skillFiles={skillFiles}
          agentStatuses={agentStatuses}
          checkingUpdate={checkingSelected || checkingAll}
          updatingSkill={updatingAll || updatingSkillCanonicalPath !== null}
          onClose={closeDetail}
          onCheckUpdate={handleCheckSelected}
          onUpdateSkill={handleUpdateSelected}
          onInstall={handleInstall}
          onUninstall={handleUninstall}
          onUninstallFromTarget={handleUninstallFromTarget}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          sections={contextMenu.sections}
          onClose={closeContextMenu}
        />
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default App;
