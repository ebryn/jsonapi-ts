import { UserProcessor, Operation, Authorize, IfUserNotMatches } from "../jsonapi-ts";
import User from "../resources/user";
import encryptPassword from "../callbacks/encrypt-password";

export default class MyVeryOwnUserProcessor<T extends User> extends UserProcessor<T> {
  protected async generateId() {
    return `${101}${Date.now()}`;
  }

  protected async encryptPassword(op: Operation) {
    return encryptPassword(op);
  }

  attributes = {
    async friends() {
      return [{ name: "Joel" }, { name: "Ryan" }];
    },

    coolFactor(): number {
      return 3;
    },

    async roles() {
      return ["user", "author", "voter"];
    }
  };

  @Authorize(IfUserNotMatches("roles", ["foo"]))
  public async get(op: Operation) {
    return super.get(op);
  }
}
