import { Resource } from "../kurier";
import User from "./user";
import Vote from "./vote";

export default class Article extends Resource {
  static schema = {
    attributes: {
      body: String
    },

    relationships: {
      author: {
        type: () => User,
        belongsTo: true,
        foreignKeyName: "author"
      },
      votes: {
        type: () => Vote,
        hasMany: true,
        foreignKeyName: "article_id"
      }
    },
  };
}
