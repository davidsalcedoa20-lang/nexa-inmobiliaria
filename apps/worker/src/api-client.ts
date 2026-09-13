import type {
  ReconstructionProgressStage,
  WorkerCompleteJob,
  WorkerReconstructionAssignment,
} from "@nexa/contracts";

export class ReconstructionApiClient {
  constructor(
    private readonly apiUrl: string,
    private readonly token: string,
    private readonly workerId: string,
  ) {}

  async claim(): Promise<WorkerReconstructionAssignment | null> {
    const response = await this.request("/api/v1/worker/reconstruction-jobs/claim", {
      method: "POST",
      body: JSON.stringify({ workerId: this.workerId }),
    });
    if (response.status === 204) return null;
    return ((await response.json()) as { data: WorkerReconstructionAssignment }).data;
  }

  async progress(jobId: string, progressPercent: number, progressStage: ReconstructionProgressStage) {
    await this.request(`/api/v1/worker/reconstruction-jobs/${jobId}/progress`, {
      method: "PATCH",
      body: JSON.stringify({ workerId: this.workerId, progressPercent, progressStage }),
    });
  }

  async complete(jobId: string, result: Omit<WorkerCompleteJob, "workerId">) {
    await this.request(`/api/v1/worker/reconstruction-jobs/${jobId}/complete`, {
      method: "POST",
      body: JSON.stringify({ workerId: this.workerId, ...result }),
    });
  }

  async fail(jobId: string, errorMessage: string) {
    await this.request(`/api/v1/worker/reconstruction-jobs/${jobId}/fail`, {
      method: "POST",
      body: JSON.stringify({ workerId: this.workerId, errorMessage: errorMessage.slice(0, 1000) }),
    });
  }

  private async request(path: string, init: RequestInit) {
    const response = await fetch(`${this.apiUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok && response.status !== 204) {
      const detail = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(detail?.message ?? `La API respondió ${response.status}`);
    }
    return response;
  }
}
