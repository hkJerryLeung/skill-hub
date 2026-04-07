import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
  className?: string;
}

const baseProps = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const GeminiIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} viewBox="0 0 24 24" fill={color} stroke="none" {...rest}>
    <path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" />
  </svg>
);

export const ClaudeIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} viewBox="0 0 24 24" fill={color} stroke="none" {...rest}>
    <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" />
  </svg>
);

export const OpenAIIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} viewBox="0 0 24 24" fill={color} stroke="none" {...rest}>
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2057 5.9847 5.9847 0 0 0 3.998-2.9001 6.0557 6.0557 0 0 0-.7478-7.0731zM13.26 22.5027a4.4935 4.4935 0 0 1-2.8873-1.0655l.1354-.078.0048-.0027 4.1352-2.3868a1.4921 1.4921 0 0 0 .7379-1.2917v-6.053l2.0003 1.155a4.4983 4.4983 0 0 1 1.7005 5.5606 4.503 4.503 0 0 1-5.8268 2.0671zM3.9213 16.591a4.4983 4.4983 0 0 1-.3637-3.0335l.1355.078.0047.0028 4.1353 2.3868a1.4921 1.4921 0 0 0 1.4756 0l5.242-3.027v2.3098a4.4983 4.4983 0 0 1-3.9859 4.2415 4.503 4.503 0 0 1-6.6435-2.9584zM3.1973 8.3562a4.4983 4.4983 0 0 1 2.5236-1.968v6.78l-2.0002-1.1552a4.4983 4.4983 0 0 1-1.7006-5.5606 4.503 4.503 0 0 1 1.1772-1.8906zm13.14-2.8904a4.4983 4.4983 0 0 1 .3684 3.0335l-.1403-.078-.0047-.0028-4.1352-2.3868a1.4921 1.4921 0 0 0-1.4756 0L5.708 9.0587V6.7489a4.4983 4.4983 0 0 1 3.986-4.2415 4.503 4.503 0 0 1 6.6434 2.9584zM20.8027 15.6438a4.4983 4.4983 0 0 1-2.5236 1.968v-6.78l2.0003 1.1552a4.4983 4.4983 0 0 1 1.7005 5.5606 4.503 4.503 0 0 1-1.1772 1.8906zm-4.757-4.195l-4.0457 2.335-4.0457-2.335V6.7788l4.0457-2.335 4.0457 2.335v4.618Z" />
  </svg>
);

export const SharedLibraryIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} {...baseProps} {...rest}>
    <path d="M3 4h10 M3 8h10 M3 12h10" />
    <rect x="2" y="2" width="12" height="12" rx="2" />
    <path d="M6 2v12" />
  </svg>
);

export const AllSkillsIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} {...baseProps} {...rest}>
    <rect x="2" y="2" width="5" height="5" rx="1" />
    <rect x="9" y="2" width="5" height="5" rx="1" />
    <rect x="2" y="9" width="5" height="5" rx="1" />
    <rect x="9" y="9" width="5" height="5" rx="1" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} {...baseProps} {...rest}>
    <circle cx="7" cy="7" r="5" />
    <path d="M14.5 14.5L10.5 10.5" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} {...baseProps} {...rest}>
    <path d="M2 4H14" />
    <path d="M5 4V2C5 1.44772 5.44772 1 6 1H10C10.5523 1 11 1.44772 11 2V4" />
    <path d="M3.5 4L4.5 13.5C4.5 14.3284 5.17157 15 6 15H10C10.8284 15 11.5 14.3284 11.5 13.5L12.5 4" />
    <path d="M6 7V12M10 7V12" />
  </svg>
);

export const PlusIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} {...baseProps} {...rest}>
    <path d="M8 2V14M2 8H14" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} {...baseProps} {...rest}>
    <path d="M3 3L13 13M13 3L3 13" />
  </svg>
);
