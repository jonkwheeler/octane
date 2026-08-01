export { ModalsProvider } from './ModalsProvider.tsrx';
export { useModals } from './use-modals/use-modals';
export {
  openModal,
  closeModal,
  closeAllModals,
  openConfirmModal,
  openContextModal,
  updateModal,
  updateContextModal,
  modals,
} from './events';

export type { ModalsProviderProps } from './ModalsProvider.tsrx';
export type {
  ContextModalProps,
  MantineModalsOverride,
  MantineModals,
  MantineModal,
  ModalSettings,
  OpenConfirmModal,
  OpenContextModal,
} from './context';
export type { ConfirmModalProps } from './ConfirmModal.tsrx';
