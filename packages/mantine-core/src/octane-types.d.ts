import type { ElementDescriptor, OctaneNode } from 'octane';
import type { Octane } from 'octane/jsx-runtime';

declare global {
  type OctaneComponent<Props = {}> = ((props: Props) => OctaneNode) & {
    displayName?: string;
  };

  type MantineIntrinsicProps<Tag extends keyof Octane.JSX.IntrinsicElements> = Omit<
    Octane.JSX.IntrinsicElements[Tag],
    'className' | 'style'
  > & {
    className?: string;
    style?: React.CSSProperties;
  };

  type OctaneRef<T> = Octane.Ref<T>;
  type OctaneKeyboardEvent<T = Element> = KeyboardEvent & { currentTarget: T & EventTarget };
  type OctaneMouseEvent<T = Element, NativeEvent = MouseEvent> = NativeEvent & {
    currentTarget: T & EventTarget;
  };
  type OctaneChangeEvent<T = Element> = Event & {
    currentTarget: T & EventTarget;
  };
  type OctaneDragEvent<T = Element> = DragEvent & { currentTarget: T & EventTarget };
  type OctaneFocusEvent<T = Element> = FocusEvent & { currentTarget: T & EventTarget };
  type OctaneTouchEvent<T = Element> = TouchEvent & { currentTarget: T & EventTarget };
  type OctaneClipboardEvent<T = Element> = ClipboardEvent & { currentTarget: T & EventTarget };
  type OctaneWheelEvent<T = Element> = WheelEvent & { currentTarget: T & EventTarget };
  type OctanePointerEvent<T = Element> = PointerEvent & { currentTarget: T & EventTarget };
  type OctaneSyntheticEvent<T = Element> = Event & { currentTarget: T & EventTarget };
  type OctaneTransitionEvent<T = Element> = TransitionEvent & {
    currentTarget: T & EventTarget;
  };
  type OctaneAnimationEvent<T = Element> = AnimationEvent & {
    currentTarget: T & EventTarget;
  };
  type OctaneElement = ElementDescriptor;
}

export {};
