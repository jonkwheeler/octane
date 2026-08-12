import * as binding from '../../src/index';
type NotAny<T> = 0 extends 1 & T ? never : T;
const value: NotAny<typeof binding> = binding;
void value;
