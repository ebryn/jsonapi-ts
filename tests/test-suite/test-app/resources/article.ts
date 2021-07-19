import { Resource } from "../kurier";
import User from "./user";
import Vote from "./vote";
import Comment from "./comment";

export default class Article extends Resource {
  static schema = {
    attributes: {
      body: String
    },

    relationships: {
      author: {
        type: () => User,
        belongsTo: true,
        foreignKeyName: "author",
        excludeLinks: ['self', 'related'],
        alwaysIncludeLinkageData: true,
      },
      // comments: {
      //   type: () => Comment,
      // },
      votes: {
        type: () => Vote,
        hasMany: true,
        excludeLinks: ['self', 'related']
      }
    }
  };

  static excludeLinks = ['self']
}
