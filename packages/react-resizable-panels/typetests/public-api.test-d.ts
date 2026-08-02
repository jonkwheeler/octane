import {
  Group,
  Panel,
  Separator,
  isCoarsePointer,
  useDefaultLayout,
  useGroupCallbackRef,
  useGroupRef,
  usePanelCallbackRef,
  usePanelRef,
  type GroupImperativeHandle,
  type GroupProps,
  type Layout,
  type LayoutChangedMeta,
  type LayoutStorage,
  type OnGroupLayoutChange,
  type OnPanelResize,
  type Orientation,
  type PanelImperativeHandle,
  type PanelProps,
  type PanelSize,
  type SeparatorProps,
  type SizeUnit
} from "../src/index.tsrx";

void [Group, Panel, Separator, isCoarsePointer, useDefaultLayout, useGroupCallbackRef, useGroupRef, usePanelCallbackRef, usePanelRef];

const orientation: Orientation = "vertical";
const unit: SizeUnit = "rem";
const layout: Layout = { navigation: 25, content: 75 };
const size: PanelSize = { asPercentage: 25, inPixels: 200 };
const meta: LayoutChangedMeta = { isUserInteraction: true };
const storage: LayoutStorage = { getItem: () => null, setItem: () => undefined };
const onLayoutChange: OnGroupLayoutChange = (next) => void next.content;
const onResize: OnPanelResize = (next, id, previous) => void [next.inPixels, id, previous];
void [orientation, unit, layout, size, meta, storage, onLayoutChange, onResize];

declare const groupHandle: GroupImperativeHandle;
declare const panelHandle: PanelImperativeHandle;
groupHandle.setLayout(groupHandle.getLayout());
panelHandle.collapse();
panelHandle.expand();
panelHandle.resize("2rem");
panelHandle.getSize().asPercentage;
panelHandle.isCollapsed();

const groupProps: GroupProps = {
  id: 1,
  orientation: "horizontal",
  defaultLayout: layout,
  groupRef: (value) => {
    value?.getLayout();
  },
  elementRef: (value) => value?.focus(),
  onLayoutChanged: (next, details) => void [next, details.isUserInteraction],
  resizeTargetMinimumSize: { coarse: 24, fine: 8 },
  style: { display: "grid", width: "100%" },
  "aria-label": "workspace"
};
const panelProps: PanelProps = {
  id: "navigation",
  defaultSize: "25%",
  minSize: 100,
  maxSize: "50vw",
  collapsedSize: "2rem",
  collapsible: true,
  groupResizeBehavior: "preserve-pixel-size",
  panelRef: (value) => value?.resize(200),
  elementRef: (value) => value?.focus(),
  onResize,
  style: { minWidth: 0 }
};
const separatorProps: SeparatorProps = {
  id: "resize-navigation",
  disabled: false,
  disableDoubleClick: true,
  elementRef: (value) => value?.focus(),
  "aria-label": "Resize navigation"
};
void [groupProps, panelProps, separatorProps];

type Assert<T extends true> = T;
type Not<T extends boolean> = T extends true ? false : true;
type IsNever<T> = [T] extends [never] ? true : false;
type RuntimeExport = keyof typeof import("../src/index.tsrx");
type ExpectedRuntimeExport =
  | "Group"
  | "Panel"
  | "Separator"
  | "isCoarsePointer"
  | "useDefaultLayout"
  | "useGroupCallbackRef"
  | "useGroupRef"
  | "usePanelCallbackRef"
  | "usePanelRef";
type HasNoMissingRuntimeExport = Assert<IsNever<Exclude<ExpectedRuntimeExport, RuntimeExport>>>;
type HasNoExtraRuntimeExport = Assert<IsNever<Exclude<RuntimeExport, ExpectedRuntimeExport>>>;
type GroupExcludesRef = Assert<Not<"ref" extends keyof GroupProps ? true : false>>;
type PanelExcludesRef = Assert<Not<"ref" extends keyof PanelProps ? true : false>>;
type PanelExcludesNativeResize = Assert<Not<"onResizeCapture" extends keyof PanelProps ? true : false>>;
type SeparatorProtectsRole = Assert<Not<"role" extends keyof SeparatorProps ? true : false>>;
type SeparatorProtectsTabIndex = Assert<Not<"tabIndex" extends keyof SeparatorProps ? true : false>>;
void (null as unknown as HasNoMissingRuntimeExport | HasNoExtraRuntimeExport | GroupExcludesRef | PanelExcludesRef | PanelExcludesNativeResize | SeparatorProtectsRole | SeparatorProtectsTabIndex);

// @ts-expect-error orientation is a closed union
const invalidOrientation: Orientation = "diagonal";
// @ts-expect-error unsupported CSS unit
const invalidUnit: SizeUnit = "ch";
// @ts-expect-error layout values must be numeric percentages
const invalidLayout: Layout = { navigation: "25" };
// @ts-expect-error groupRef is the supported imperative-ref prop; raw ref is excluded
const invalidGroupRef: GroupProps = { ref: () => undefined };
// @ts-expect-error panelRef is the supported imperative-ref prop; raw ref is excluded
const invalidPanelRef: PanelProps = { ref: () => undefined };
// @ts-expect-error native resize event callbacks cannot replace the panel resize contract
const invalidResize: PanelProps = { onResize: (event: UIEvent) => void event };
// @ts-expect-error separator owns its ARIA role
const invalidSeparatorRole: SeparatorProps = { role: "button" };
// @ts-expect-error separator owns its focus tab index
const invalidSeparatorTabIndex: SeparatorProps = { tabIndex: 2 };
void [invalidOrientation, invalidUnit, invalidLayout, invalidGroupRef, invalidPanelRef, invalidResize, invalidSeparatorRole, invalidSeparatorTabIndex];
