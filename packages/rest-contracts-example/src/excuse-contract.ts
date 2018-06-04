import {API} from "../../rest-contracts/src/rest-contracts";

const sequentialIdCounters: {[key in string]: number} = {};
const sequentialIdGenerator = <T extends string>(prefix: string) =>
  (): T => {
    sequentialIdCounters[prefix] = (sequentialIdCounters[prefix] | 0) + 1;
    return (prefix + (sequentialIdCounters[prefix]) ) as T;
  }

export enum ExcuseQuality {
  Good = "solid",
  Mediocre = "iffy",
  Poor = "lame"
}
export interface Excuse {
  quality: ExcuseQuality;
  description: string;
}
enum MayOnlyBeAnExcuseId {};
export type ExcuseId = MayOnlyBeAnExcuseId & string;
export const ExcuseId = sequentialIdGenerator<ExcuseId>("ExcuseId:");

export interface ExcuseDbRecord extends Excuse {
  id: ExcuseId;
}

export const Get =
  API.Get
  .Path('/excuses/:id/')
  .PathParameters<{ id: ExcuseId }>()
  .Returns<ExcuseDbRecord>();

export const Query =
  API.Get
  .Path('/excuses/')
  .QueryParameters<{quality?: ExcuseDbRecord["quality"]}>()
  .Returns<ExcuseDbRecord[]>();

export const Put =
  API.Put
  .Path("/excuses/")
  .Body<Excuse | ExcuseDbRecord>()
  .Returns<ExcuseDbRecord>();
