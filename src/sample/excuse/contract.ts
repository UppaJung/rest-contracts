import * as RestContracts from "../../rest-contracts";

export interface Excuse {
  id: number;
  quality: 'Solid' | 'Iffy' | 'Lousy';
  description: string;
}

export const Get =
  RestContracts.CreateAPI.Get
  .PathParameters<{ id: number }>()
  .NoQueryParameters
  .Returns<Excuse>()
  .Path('/excuses/:id/');

export const Query =
  RestContracts.CreateAPI.Get
  .NoPathParameters
  .QueryParameters<{quality?: Excuse["quality"]}>()
  .Returns<Excuse>()
  .Path('/excuses/');

export const Put =
  RestContracts.CreateAPI.Put
  .NoPathParameters
  .BodyParameters<Excuse>()
  .Returns<Excuse>()
  .Path("/excuses/");
