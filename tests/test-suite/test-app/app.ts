import { knex } from "knex";
import {
  Application,
  ApplicationInstance,
  KnexProcessor,
  UserManagementAddon,
  UserManagementAddonOptions
} from "./jsonapi-ts";

import knexfile from "./../../data/knexfile";

import login from "./callbacks/login";

import Article from "./resources/article";
import User from "./resources/user";
import Comment from "./resources/comment";
import Vote from "./resources/vote";
import Random from "./resources/random";

import UserProcessor from "./processors/user";
import ArticleProcessor from "./processors/article";
import VoteProcessor from "./processors/vote";
import RandomProcessor from "./processors/random";

const app = new Application({
  namespace: "api",
  types: [Article, Comment, Vote, Random],
  processors: [ArticleProcessor, VoteProcessor, RandomProcessor],
  defaultProcessor: KnexProcessor
});

app.use(UserManagementAddon, {
  userResource: User,
  userProcessor: UserProcessor,
  userLoginCallback: login,
  async userRolesProvider(this: ApplicationInstance, user: User) { return ["Admin"] }
} as UserManagementAddonOptions);

app.services.knex = app.services.knex || knex(knexfile["test_snake_case"]);

export default app;
