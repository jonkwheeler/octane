import { useMachine as useOctaneMachine } from '@octanejs/zag';
import { useMachine as useReactMachine } from '@zag-js/react';

const octaneAsReact: typeof useReactMachine = useOctaneMachine;
const reactAsOctane: typeof useOctaneMachine = useReactMachine;

void octaneAsReact;
void reactAsOctane;
