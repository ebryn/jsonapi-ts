import {knex} from "knex";
import {
  Application,
  ApplicationInstance,
  KnexProcessor,
  UserManagementAddon,
  UserManagementAddonOptions
} from "./kurier";

import knexfile from "./../test-data/knexfile";

import login from "./callbacks/login";

import Article from "./resources/article";
import User from "./resources/user";
import Comment from "./resources/comment";
import Vote from "./resources/vote";
import Random from "./resources/random";
import Link from "./resources/link";

import UserProcessor from "./processors/user";
import ArticleProcessor from "./processors/article";
import VoteProcessor from "./processors/vote";
import RandomProcessor from "./processors/random";
import LinkProcessor from "./processors/link";
import Book from "./resources/book";

const app = new Application({
  namespace: "api",
  types: [Article, Comment, Vote, Random, Link, Book],
  processors: [ArticleProcessor, VoteProcessor, RandomProcessor, LinkProcessor],
  defaultProcessor: KnexProcessor,
  baseUrl: process.env.NODE_ENV === 'test' ? new URL('http://localhost:3000') : undefined,
  transportLayerOptions: {
    httpStrictMode: true,
  }
});

app.use(UserManagementAddon, {
  userResource: User,
  userProcessor: UserProcessor,
  userLoginCallback: login,
  async userRolesProvider(this: ApplicationInstance, user: User) { return ["Admin"] }
} as UserManagementAddonOptions);

app.services.knex = app.services.knex || knex(knexfile["test_snake_case"]);

export default app;
