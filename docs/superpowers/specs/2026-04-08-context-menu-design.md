# Context Menu Design

## Goal

Restore right-click actions for both the left sidebar items and the right-side skill cards using an app-native floating context menu that matches the current Skill Gate visual language.

## Approved Decisions

- Use an in-app custom floating context menu, not the OS-native menu.
- Sidebar agent items must include a `Reveal Folder` action.
- Right-clicking a selected skill card while multiple cards are selected should act on the full selected batch.

## Scope

### Sidebar Context Menus

#### Agent items

- Open
- Reveal Folder
- Rescan Skills
- Check Updates
- Update All

#### Discover items

- Open
- Refresh Source

#### Settings item

- Open Settings
- Load Defaults Into Form

### Skill Context Menus

#### Single skill

- Open Details
- Reveal in Finder
- Check Update
- Update Skill
- Install to Agent submenu-equivalent list
- Move to Agent submenu-equivalent list
- Remove from current location

#### Multi-skill batch

- Move selected to agent list
- Check updates for selected is intentionally out of scope for now
- Reveal and detail actions do not appear in batch mode

## Interaction Model

- Right-click opens the menu at pointer position.
- Menu auto-clamps to viewport bounds.
- Clicking elsewhere, pressing `Escape`, resizing, or executing an action closes the menu.
- Disabled actions remain visible when unavailable.

## Architecture

- Add a reusable `ContextMenu` component that accepts sections and menu items.
- Keep menu item derivation in pure helper logic so availability rules are testable.
- `App.tsx` owns menu state and delegates action handlers to existing app commands.

## Testing

- Add pure tests for menu item derivation and batch right-click behavior.
- Verify existing tests and production build still pass.
