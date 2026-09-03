import RequestHandler from "../request-handler";
import { ENDPOINT } from "../endpoint";

class SkillApiHandler {
  private api = new RequestHandler(ENDPOINT.SKILLS);

  /** Skills this account may use: its own, plus its admin's team skills. */
  list<T>() {
    return this.api.get<T>();
  }

  create<T>(body: Record<string, unknown>) {
    return this.api.store<T>(body);
  }

  update<T>(skillId: string, body: Record<string, unknown>) {
    return this.api.update<T>(skillId, body);
  }

  remove<T>(skillId: string) {
    return this.api.delete<T>(skillId);
  }
}

export const SkillApi = new SkillApiHandler();
