export interface TopbarRefreshStateOptions {
  loading: boolean;
  checkingAll: boolean;
  updatingAll: boolean;
  updatingSkill: boolean;
}

export interface TopbarRefreshState {
  disabled: boolean;
  spinning: boolean;
  label: string;
}

export function getTopbarRefreshState({
  loading,
  checkingAll,
  updatingAll,
  updatingSkill,
}: TopbarRefreshStateOptions): TopbarRefreshState {
  const spinning = loading;

  return {
    disabled: loading || checkingAll || updatingAll || updatingSkill,
    spinning,
    label: spinning ? "Refreshing current page" : "Refresh current page",
  };
}
