import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import "./ContextMenu.css";

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  tone?: "default" | "danger";
  onSelect: () => void | Promise<void>;
}

export interface ContextMenuSection {
  key: string;
  items: ContextMenuItem[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  sections: ContextMenuSection[];
  onClose: () => void;
}

const MENU_OFFSET = 6;

export function ContextMenu({
  x,
  y,
  sections,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const maxLeft = Math.max(MENU_OFFSET, window.innerWidth - rect.width - MENU_OFFSET);
    const maxTop = Math.max(MENU_OFFSET, window.innerHeight - rect.height - MENU_OFFSET);

    setPosition({
      left: Math.min(x, maxLeft),
      top: Math.min(y, maxTop),
    });
  }, [x, y, sections]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const close = () => onClose();

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [onClose]);

  const visibleSections = sections.filter((section) => section.items.length > 0);
  if (visibleSections.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: position.left, top: position.top }}
      role="menu"
    >
      {visibleSections.map((section, sectionIndex) => (
        <div key={section.key} className="context-menu-section">
          {section.items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`context-menu-item ${item.tone === "danger" ? "danger" : ""}`}
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                onClose();
                void item.onSelect();
              }}
            >
              <span className="context-menu-icon">{item.icon}</span>
              <span className="context-menu-label">{item.label}</span>
            </button>
          ))}
          {sectionIndex < visibleSections.length - 1 && <div className="context-menu-divider" />}
        </div>
      ))}
    </div>
  );
}
