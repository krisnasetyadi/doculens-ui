import RequestHandler from "../request-handler";
import { ENDPOINT } from "../endpoint";

class AuthApiHandler {
  private api = new RequestHandler(ENDPOINT.AUTH);
  private adminUsersApi = new RequestHandler(`${ENDPOINT.AUTH}/admin/users`);

  register<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("register", body);
  }

  login<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("login", body);
  }

  me<T>() {
    return this.api.find<T>("me");
  }

  updateProfile<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("me", body);
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

  setAdminUserStatus<T>(body: Record<string, unknown>) {
    return this.api.storeAt<T>("admin/users/activate", body);
  }

  updateAdminUser<T>(userId: string, body: Record<string, unknown>) {
    return this.adminUsersApi.update<T>(userId, body);
  }

  deleteAdminUser<T>(userId: string) {
    return this.adminUsersApi.delete<T>(userId);
  }
}

export const AuthApi = new AuthApiHandler();