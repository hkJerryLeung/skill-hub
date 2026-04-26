export type AppUpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "installing"
  | "up-to-date"
  | "error";

export interface AppUpdateState {
  status: AppUpdateStatus;
  progress: number;
  version: string | null;
  error: string | null;
}

const formatVersion = (version: string | null): string =>
  version ? `v${version}` : "the latest version";

export const getAppUpdateActionLabel = (state: AppUpdateState): string => {
  switch (state.status) {
    case "checking":
      return "Checking...";
    case "available":
      return `Downloading ${formatVersion(state.version)}...`;
    case "downloading":
      return `Downloading ${Math.round(state.progress)}%`;
    case "ready":
      return "Install and Relaunch";
    case "installing":
      return "Installing...";
    case "up-to-date":
      return "Check Again";
    case "error":
      return "Retry Check";
    case "idle":
    default:
      return "Check for Updates";
  }
};

export const getAppUpdateStatusText = (
  state: AppUpdateState,
  currentVersion: string,
): string => {
  switch (state.status) {
    case "checking":
      return "Checking for updates...";
    case "available":
      return `Downloading ${formatVersion(state.version)}...`;
    case "downloading":
      return `Downloading ${formatVersion(state.version)}`;
    case "ready":
      return `${formatVersion(state.version)} is ready to install.`;
    case "installing":
      return "Installing update...";
    case "up-to-date":
      return "Skill Gate is up to date.";
    case "error":
      return state.error ?? "Update check failed.";
    case "idle":
    default:
      return `Current version: v${currentVersion}`;
  }
};

export const isAppUpdateActionDisabled = (state: AppUpdateState): boolean =>
  state.status === "checking" ||
  state.status === "available" ||
  state.status === "downloading" ||
  state.status === "installing";

export const shouldShowAppUpdateProgress = (state: AppUpdateState): boolean =>
  state.status === "downloading";

