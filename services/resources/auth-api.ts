import RequestHandler from "../request-handler";
import { ENDPOINT } from "../endpoint";

class AuthApiHandler {
  private api = new RequestHandler(ENDPOINT.AUTH);

  register<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("register", body);
  }

  login<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("login", body);
  }

  me<T>() {
    return this.api.find<T>("me");
  }

  changePassword<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("change-password", body);
  }

  adminResetPassword<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("admin/reset-password", body);
  }

  adminUsers<T>() {
    return this.api.find<T>("admin/users");
  }

  addAdminUser<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("admin/users", body);
  }
}

export const AuthApi = new AuthApiHandler();