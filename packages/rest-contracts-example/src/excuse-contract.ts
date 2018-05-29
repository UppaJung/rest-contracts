import * as RestContracts from "rest-contracts";

export enum ExcuseQuality {
  Good = "solid",
  Mediocre = "iffy",
  Poor = "lame"
}

const sequentialIdCounters: {[key in string]: number} = {};
const sequentialIdGenerator = <T extends string>(prefix: string) =>
  (): T => {
    sequentialIdCounters[prefix] = (sequentialIdCounters[prefix] | 0) + 1;
    return (prefix + (sequentialIdCounters[prefix]) ) as T;
  }

enum MayOnlyBeAnExcuseId {};
export type ExcuseId = MayOnlyBeAnExcuseId & string;
export const ExcuseId = sequentialIdGenerator<ExcuseId>("ExcuseId:");

export interface Excuse {
  quality: ExcuseQuality;
  description: string;
}

export interface ExcuseDbRecord extends Excuse {
  id: ExcuseId;
}

type Diff<T, U> = T extends U ? never : T;
type MakeAttributeOptional<T, ATTRIBUTE extends keyof T> = {
  [P in Diff<keyof T, ATTRIBUTE>]: T[P];
} & {
  [P in ATTRIBUTE]?: T[ATTRIBUTE];
};

export const Get =
  RestContracts.CreateAPI.Get
  .PathParameters<{ id: ExcuseId }>()
  .NoQueryParameters
  .Returns<ExcuseDbRecord>()
  .Path('/excuses/:id/');

export const Query =
  RestContracts.CreateAPI.Get
  .NoPathParameters
  .QueryParameters<{quality?: ExcuseDbRecord["quality"]}>()
  .Returns<ExcuseDbRecord[]>()
  .Path('/excuses/');

export const Put =
  RestContracts.CreateAPI.Put
  .NoPathParameters
  .BodyParameters<Excuse | ExcuseDbRecord>()
  .Returns<ExcuseDbRecord>()
  .Path("/excuses/");
