import RequestHandler from "../request-handler";
import { ENDPOINT } from "../endpoint";
import type { Skill, SkillCreateRequest, SkillUpdateRequest } from "../types";

class SkillApiHandler {
  private api = new RequestHandler(ENDPOINT.SKILLS);

  list() {
    return this.api.get<Skill[]>();
  }

  create(body: SkillCreateRequest) {
    return this.api.store<Skill>({ ...body });
  }

  update(skillId: string, body: SkillUpdateRequest) {
    return this.api.update<Skill>(skillId, { ...body });
  }

  remove(skillId: string) {
    return this.api.delete<{ skill_id: string; deleted: boolean }>(skillId);
  }
}

export const SkillApi = new SkillApiHandler();
