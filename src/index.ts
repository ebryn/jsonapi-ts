import Application from "./application";
import ApplicationInstance from "./application-instance";
import Authorize from "./decorators/authorize";
import decorateWith from "./decorators/decorator";
import {
  ifUser as IfUser,
  ifUserDoesNotMatches as IfUserDoesNotMatches,
  ifUserMatchesEvery as IfUserMatchesEvery,
  ifUserDoesNotHavePermission as IfUserDoesNotHavePermission,
  ifUserDoesNotHaveRole as IfUserDoesNotHaveRole,
  ifUserHasEveryPermission as IfUserHasEveryPermission,
  ifUserHasEveryRole as IfUserHasEveryRole,
  ifUserHasPermission as IfUserHasPermission,
  ifUserHasRole as IfUserHasRole
} from "./decorators/if-user";
import JsonApiErrors from "./errors/json-api-errors";
import jsonApiKoa from "./middlewares/json-api-koa";
import jsonApiExpress from "./middlewares/json-api-express";
import jsonApiWebSocket from "./middlewares/json-api-websocket";
import jsonApiVercel from './middlewares/json-api-vercel';
import KnexProcessor from "./processors/knex-processor";
import OperationProcessor from "./processors/operation-processor";
import UserProcessor from "./processors/user-processor";
import SessionProcessor from "./processors/session-processor";
import Resource from "./resource";
import User from "./resources/user";
import Session from "./resources/session";
import Password from "./attribute-types/password";
import JsonApiSerializer from "./serializers/serializer";
import Addon from "./addon";
import UserManagementAddon, { UserManagementAddonOptions } from "./addons/user-management";
import { ResourceOperationResult, ResourceListOperationResult } from "./operation-result";

export {
  // Core objects
  Resource,
  Application,
  ApplicationInstance,
  KnexProcessor,
  JsonApiErrors,
  OperationProcessor,
  JsonApiSerializer,
  ResourceOperationResult,
  ResourceListOperationResult,

  // Middlewares
  jsonApiKoa,
  jsonApiExpress,
  jsonApiWebSocket,
  jsonApiVercel,

  // Decorators API
  decorateWith,
  Authorize,
  IfUser,
  IfUserMatchesEvery,
  IfUserDoesNotMatches,

  // Auth module
  UserProcessor,
  SessionProcessor,
  User,
  Session,
  Password,
  IfUserDoesNotHavePermission,
  IfUserDoesNotHaveRole,
  IfUserHasEveryPermission,
  IfUserHasEveryRole,
  IfUserHasPermission,
  IfUserHasRole,

  // Addons
  Addon,
  UserManagementAddon,
  UserManagementAddonOptions,
};

export * from "./types";
export * from "./utils/string";
