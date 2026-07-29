import type { FileRejection, FileWithPath } from './use-dropzone';
import type {
  DropzoneCssVariables,
  DropzoneFactory,
  DropzoneProps,
  DropzoneStylesNames,
  DropzoneVariant,
} from './Dropzone';
import { Dropzone as _Dropzone } from './Dropzone';
import type {
  DropzoneFullScreenFactory,
  DropzoneFullScreenProps,
  DropzoneFullScreenStylesNames,
} from './DropzoneFullScreen';
import { DropzoneFullScreen } from './DropzoneFullScreen';
import type { DropzoneAcceptProps, DropzoneIdleProps, DropzoneRejectProps } from './DropzoneStatus';

_Dropzone.FullScreen = DropzoneFullScreen;
export const Dropzone = _Dropzone;

export { DropzoneFullScreen };
export { DropzoneAccept, DropzoneIdle, DropzoneReject } from './DropzoneStatus';
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
