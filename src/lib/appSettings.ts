import type { AgentFilter } from "../components/Sidebar/Sidebar";
import type { StatusFilter } from "./skillFilters";

export type ThemeMode = "system" | "dark" | "light";

export interface AppSettings {
  shared_library_path: string;
  theme_mode: ThemeMode;
  reduce_motion: boolean;
  auto_check_updates_on_launch: boolean;
  categorization_enabled: boolean;
  categorization_base_url: string;
  categorization_model: string;
  categorization_api_key: string;
  categorization_confidence_threshold: number;
  startup_view: AgentFilter;
  startup_status_filter: StatusFilter;
  restore_last_session: boolean;
  confirm_before_uninstall: boolean;
  confirm_before_batch_migrate: boolean;
  show_drag_debug_overlay: boolean;
}

export interface BrowserSessionState {
  filter: AgentFilter;
  search: string;
  statusFilter: StatusFilter;
}

export interface AgentTarget {
  name: string;
  path: string;
  exists: boolean;
}

export interface AppInfo {
  product_name: string;
  version: string;
  settings_path: string;
  session_path: string;
  update_cache_path: string;
  backups_path: string;
}

export const resolveDefaultInstallTarget = (
  targets: AgentTarget[],
): string => {
  if (targets.length === 0) {
    return "";
  }

  return (
    targets.find((target) => target.name === "Shared Library")?.name ??
    targets[0].name
  );
};

export const normalizeStatusFilterForView = (
  statusFilter: StatusFilter,
  filter: AgentFilter,
): StatusFilter => {
  if (
    filter === "Shared Library" &&
    (statusFilter === "symlinked" || statusFilter === "local")
  ) {
    return "all";
  }

  return statusFilter;
};

export const resolveInitialBrowserState = (
  settings: AppSettings,
  session: BrowserSessionState | null,
): BrowserSessionState => {
  if (settings.restore_last_session && session) {
    return {
      filter: session.filter,
      search: session.search,
      statusFilter: normalizeStatusFilterForView(
        session.statusFilter,
        session.filter,
      ),
    };
  }

  return {
    filter: settings.startup_view,
    search: "",
    statusFilter: normalizeStatusFilterForView(
      settings.startup_status_filter,
      settings.startup_view,
    ),
  };
};

export const areSettingsEqual = (
  left: AppSettings,
  right: AppSettings,
): boolean =>
  left.shared_library_path === right.shared_library_path &&
  left.theme_mode === right.theme_mode &&
  left.reduce_motion === right.reduce_motion &&
  left.auto_check_updates_on_launch === right.auto_check_updates_on_launch &&
  left.categorization_enabled === right.categorization_enabled &&
  left.categorization_base_url === right.categorization_base_url &&
  left.categorization_model === right.categorization_model &&
  left.categorization_api_key === right.categorization_api_key &&
  left.categorization_confidence_threshold === right.categorization_confidence_threshold &&
  left.startup_view === right.startup_view &&
  left.startup_status_filter === right.startup_status_filter &&
  left.restore_last_session === right.restore_last_session &&
  left.confirm_before_uninstall === right.confirm_before_uninstall &&
  left.confirm_before_batch_migrate === right.confirm_before_batch_migrate &&
  left.show_drag_debug_overlay === right.show_drag_debug_overlay;

export const applyDocumentSettings = (
  settings: Pick<AppSettings, "theme_mode" | "reduce_motion">,
) => {
  const root = document.documentElement;
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const resolvedTheme =
    settings.theme_mode === "system"
      ? prefersLight
        ? "light"
        : "dark"
      : settings.theme_mode;

  root.dataset.theme = resolvedTheme;
  root.dataset.reducedMotion = settings.reduce_motion ? "true" : "false";
};
