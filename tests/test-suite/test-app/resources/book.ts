import { User } from "../../../../src";
import { Resource } from "../kurier";

export default class Book extends Resource {
  static schema = {
    attributes: {
      title: String,
      datePublished: String,
      isbn: Number,
    },

    relationships: {
      author: {
        type: () => User,
        belongsTo: true,
        foreignKeyName: "author"
      },
    }
  };
}
