import { Resource } from "../jsonapi-ts";
import User from "./user";
import Password from "../../../../src/attribute-types/password";

export default class Session extends Resource {
  static get type() {
    return "session";
  }

  static schema = {
    attributes: {
      token: String,
      username: String,
      password: Password
    },
    relationships: {
      user: {
        type: () => User,
        belongsTo: true,
        foreignKeyName: "userId"
      }
    }
  };
}
