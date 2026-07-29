import type { ModalCssVariables, ModalFactory, ModalProps, ModalStylesNames } from './Modal.tsrx';
import type { ModalContextValue } from './Modal.context';
import type { ModalBodyProps } from './ModalBody.tsrx';
import type { ModalCloseButtonProps } from './ModalCloseButton.tsrx';
import type { ModalContentProps } from './ModalContent.tsrx';
import type { ModalHeaderProps } from './ModalHeader.tsrx';
import type { ModalOverlayProps } from './ModalOverlay.tsrx';
import type { ModalRootProps } from './ModalRoot.tsrx';
import type { ModalStackProps } from './ModalStack.tsrx';
import type { ModalTitleProps } from './ModalTitle.tsrx';

export { Modal } from './Modal.tsrx';
export { ModalRoot } from './ModalRoot.tsrx';
export { ModalBody } from './ModalBody.tsrx';
export { ModalCloseButton } from './ModalCloseButton.tsrx';
export { ModalContent } from './ModalContent.tsrx';
export { ModalHeader } from './ModalHeader.tsrx';
export { ModalOverlay } from './ModalOverlay.tsrx';
export { ModalTitle } from './ModalTitle.tsrx';
export { ModalStack, ModalStackContext } from './ModalStack.tsrx';
export { useModalsStack, useDrawersStack } from './use-modals-stack';
export { useModalContext } from './Modal.context';

export type {
  ModalProps,
  ModalStylesNames,
  ModalCssVariables,
  ModalFactory,
  ModalRootProps,
  ModalBodyProps,
  ModalCloseButtonProps,
  ModalContentProps,
  ModalHeaderProps,
  ModalOverlayProps,
  ModalTitleProps,
  ModalStackProps,
  ModalContextValue,
};
