import { FactoryPayload } from './factory.tsrx';
import { PolymorphicFactoryPayload } from './polymorphic-factory.tsrx';

export type Factory<Payload extends FactoryPayload> = Payload;
export type PolymorphicFactory<Payload extends PolymorphicFactoryPayload> = Payload;
