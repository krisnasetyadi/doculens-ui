import RequestHandler from "../request-handler";
import { ENDPOINT } from "../endpoint";

class GapAnalysisApiHandler {
  private api = new RequestHandler(ENDPOINT.GAP_ANALYSIS);

  run<T>(body: Record<string, unknown>) {
    return this.api.store<T>(body);
  }

  listRuns<T>() {
    return this.api.find<T>("runs");
  }

  getRun<T>(runId: string) {
    return this.api.find<T>(runId);
  }

  deleteRun<T>(runId: string) {
    return this.api.delete<T>(runId);
  }
}

export const GapAnalysisApi = new GapAnalysisApiHandler();
