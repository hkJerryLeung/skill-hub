export interface TopbarRefreshStateOptions {
  loading: boolean;
}

export interface TopbarRefreshState {
  disabled: boolean;
  spinning: boolean;
  label: string;
}

export function getTopbarRefreshState({
  loading,
}: TopbarRefreshStateOptions): TopbarRefreshState {
  const spinning = loading;

  return {
    disabled: loading,
    spinning,
    label: spinning ? "Refreshing current page" : "Refresh current page",
  };
}
