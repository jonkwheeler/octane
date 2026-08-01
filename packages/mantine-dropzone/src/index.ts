import type { FileRejection, FileWithPath } from './use-dropzone';
import type {
  DropzoneCssVariables,
  DropzoneFactory,
  DropzoneProps,
  DropzoneStylesNames,
  DropzoneVariant,
} from './Dropzone.tsrx';
import { Dropzone as _Dropzone } from './Dropzone.tsrx';
import type {
  DropzoneFullScreenFactory,
  DropzoneFullScreenProps,
  DropzoneFullScreenStylesNames,
} from './DropzoneFullScreen.tsrx';
import { DropzoneFullScreen } from './DropzoneFullScreen.tsrx';
import type { DropzoneAcceptProps, DropzoneIdleProps, DropzoneRejectProps } from './DropzoneStatus.tsrx';

_Dropzone.FullScreen = DropzoneFullScreen;
export const Dropzone = _Dropzone;

export { DropzoneFullScreen };
export { DropzoneAccept, DropzoneIdle, DropzoneReject } from './DropzoneStatus.tsrx';
export * from './mime-types';

export type {
  DropzoneProps,
  DropzoneStylesNames,
  DropzoneCssVariables,
  DropzoneFactory,
  DropzoneVariant,
  DropzoneFullScreenProps,
  DropzoneFullScreenStylesNames,
  DropzoneFullScreenFactory,
  DropzoneAcceptProps,
  DropzoneRejectProps,
  DropzoneIdleProps,
  FileWithPath,
  FileRejection,
};
