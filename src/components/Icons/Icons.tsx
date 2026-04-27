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
    <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
  </svg>
);

export const OpenAIIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} viewBox="-20 0 350 330" fill={color} stroke="none" {...rest}>
    <path d="m297.06 130.97c7.26-21.79 4.76-45.66-6.85-65.48-17.46-30.4-52.56-46.04-86.84-38.68-15.25-17.18-37.16-26.95-60.13-26.81-35.04-.08-66.13 22.48-76.91 55.82-22.51 4.61-41.94 18.7-53.31 38.67-17.59 30.32-13.58 68.54 9.92 94.54-7.26 21.79-4.76 45.66 6.85 65.48 17.46 30.4 52.56 46.04 86.84 38.68 15.24 17.18 37.16 26.95 60.13 26.8 35.06.09 66.16-22.49 76.94-55.86 22.51-4.61 41.94-18.7 53.31-38.67 17.57-30.32 13.55-68.51-9.94-94.51zm-120.28 168.11c-14.03.02-27.62-4.89-38.39-13.88.49-.26 1.34-.73 1.89-1.07l63.72-36.8c3.26-1.85 5.26-5.32 5.24-9.07v-89.83l26.93 15.55c.29.14.48.42.52.74v74.39c-.04 33.08-26.83 59.9-59.91 59.97zm-128.84-55.03c-7.03-12.14-9.56-26.37-7.15-40.18.47.28 1.3.79 1.89 1.13l63.72 36.8c3.23 1.89 7.23 1.89 10.47 0l77.79-44.92v31.1c.02.32-.13.63-.38.83l-64.41 37.19c-28.69 16.52-65.33 6.7-81.92-21.95zm-16.77-139.09c7-12.16 18.05-21.46 31.21-26.29 0 .55-.03 1.52-.03 2.2v73.61c-.02 3.74 1.98 7.21 5.23 9.06l77.79 44.91-26.93 15.55c-.27.18-.61.21-.91.08l-64.42-37.22c-28.63-16.58-38.45-53.21-21.95-81.89zm221.26 51.49-77.79-44.92 26.93-15.54c.27-.18.61-.21.91-.08l64.42 37.19c28.68 16.57 38.51 53.26 21.94 81.94-7.01 12.14-18.05 21.44-31.2 26.28v-75.81c.03-3.74-1.96-7.2-5.2-9.06zm26.8-40.34c-.47-.29-1.3-.79-1.89-1.13l-63.72-36.8c-3.23-1.89-7.23-1.89-10.47 0l-77.79 44.92v-31.1c-.02-.32.13-.63.38-.83l64.41-37.16c28.69-16.55 65.37-6.7 81.91 22 6.99 12.12 9.52 26.31 7.15 40.1zm-168.51 55.43-26.94-15.55c-.29-.14-.48-.42-.52-.74v-74.39c.02-33.12 26.89-59.96 60.01-59.94 14.01 0 27.57 4.92 38.34 13.88-.49.26-1.33.73-1.89 1.07l-63.72 36.8c-3.26 1.85-5.26 5.31-5.24 9.06l-.04 89.79zm14.63-31.54 34.65-20.01 34.65 20v40.01l-34.65 20-34.65-20z"/>
  </svg>
);

export const SparkIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>
);

export const SharedLibraryIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    <path d="M4 10v7"/><path d="M10 10v7"/><path d="M16 10v7"/><path d="M20 10v7"/><path d="M22 19H2"/><path d="M2 7h20L12 2z"/>
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

export const MinusIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} {...baseProps} {...rest}>
    <path d="M2 8H14" />
  </svg>
);


export const CloseIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} {...baseProps} {...rest}>
    <path d="M3 3L13 13M13 3L3 13" />
  </svg>
);

export const FolderOpenIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} {...baseProps} {...rest}>
    <path d="M2 3h4l2 3h6v8H2z" />
    <path d="M2.5 14L4 7h10l-1.5 7z" />
  </svg>
);

export const RefreshIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg
    width={size}
    height={size}
    color={color}
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    <path d="M17.65 6.35A8 8 0 1 0 20 12" />
    <path d="M20 4v8h-8" />
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} {...baseProps} {...rest}>
    <path d="M8 2v7" />
    <path d="M5 6.5 8 9.5l3-3" />
    <path d="M3 12.5h10" />
    <path d="M4 12.5v1.5h8v-1.5" />
  </svg>
);

export const GlobeIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} {...baseProps} {...rest}>
    <circle cx="8" cy="8" r="6" />
    <path d="M2.5 8h11" />
    <path d="M8 2c1.8 1.7 2.7 3.7 2.7 6S9.8 12.3 8 14" />
    <path d="M8 2C6.2 3.7 5.3 5.7 5.3 8S6.2 12.3 8 14" />
  </svg>
);



export const GithubIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} viewBox="0 0 16 16" fill={color} stroke="none" {...rest}>
    <path d="M8 1C4.14 1 1 4.14 1 8c0 3.09 2 5.72 4.77 6.64.35.06.48-.15.48-.34 0-.17-.01-.72-.01-1.31-1.94.42-2.35-.82-2.35-.82-.32-.81-.78-1.02-.78-1.02-.64-.43.05-.42.05-.42.7.05 1.08.73 1.08.73.63 1.07 1.64.76 2.04.58.06-.45.24-.76.44-.94-1.55-.18-3.18-.78-3.18-3.46 0-.76.27-1.38.72-1.86-.07-.18-.31-.91.07-1.9 0 0 .59-.19 1.93.71A6.7 6.7 0 0 1 8 4.09c.6 0 1.21.08 1.77.24 1.34-.91 1.93-.71 1.93-.71.38.99.14 1.72.07 1.9.45.48.72 1.1.72 1.86 0 2.69-1.64 3.28-3.2 3.45.25.22.47.66.47 1.34 0 .96-.01 1.73-.01 1.96 0 .19.13.41.49.34A7.01 7.01 0 0 0 15 8c0-3.86-3.14-7-7-7Z" />
  </svg>
);

export const CursorIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg width={size} height={size} color={color} className={className} viewBox="0 0 24 24" fill={color} stroke="none" {...rest}>
    <path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ size = 16, color = "currentColor", className, ...rest }) => (
  <svg
    width={size}
    height={size}
    color={color}
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.757.426 1.757 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.757-2.924 1.757-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.757-.426-1.757-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
