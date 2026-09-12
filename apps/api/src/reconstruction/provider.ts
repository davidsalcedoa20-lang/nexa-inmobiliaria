import { randomUUID } from "node:crypto";

export type ReconstructionPhotoInput = {
  id: string;
  objectKey: string;
  contentType: string;
};

export type ReconstructionRoomInput = {
  id: string;
  name: string;
  type: string;
  photos: ReconstructionPhotoInput[];
};

export type ThreeDReconstructionInput = {
  jobId: string;
  propertyId: string;
  captureSessionId: string;
  rooms: ReconstructionRoomInput[];
};

export type ThreeDReconstructionResult = {
  providerJobId: string;
  status: "review_required";
};

export interface ThreeDReconstructionProvider {
  readonly name: string;
  prepare(input: ThreeDReconstructionInput): Promise<ThreeDReconstructionResult>;
}

export class MockThreeDReconstructionProvider implements ThreeDReconstructionProvider {
  readonly name = "mock";

  async prepare(input: ThreeDReconstructionInput): Promise<ThreeDReconstructionResult> {
    if (input.rooms.every((room) => room.photos.length === 0)) {
      throw new Error("La captura no contiene fotografías disponibles");
    }

    return {
      providerJobId: `mock-${randomUUID()}`,
      status: "review_required",
    };
  }
}
