/**
 * Colours a workspace can pick for its icon, so several workspaces are easy to
 * tell apart in the switcher. Stored by key; anything unknown shows as green.
 */
export const WORKSPACE_COLORS = {
  green: { label: "Green", tile: "bg-brand-900 text-lime" },
  blue: { label: "Blue", tile: "bg-blue-600 text-white" },
  purple: { label: "Purple", tile: "bg-violet-600 text-white" },
  pink: { label: "Pink", tile: "bg-pink-500 text-white" },
  orange: { label: "Orange", tile: "bg-orange-500 text-white" },
  teal: { label: "Teal", tile: "bg-teal-600 text-white" },
  amber: { label: "Amber", tile: "bg-amber-400 text-gray-950" },
  slate: { label: "Slate", tile: "bg-gray-800 text-white" },
} as const;

export type WorkspaceColor = keyof typeof WORKSPACE_COLORS;

export function isWorkspaceColor(v: unknown): v is WorkspaceColor {
  return typeof v === "string" && v in WORKSPACE_COLORS;
}

export function colorTile(v: string | null | undefined): string {
  return (isWorkspaceColor(v) ? WORKSPACE_COLORS[v] : WORKSPACE_COLORS.green).tile;
}
