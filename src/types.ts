import { IncomingMessage, ServerResponse } from "http";
import { Knex } from "knex";
import { Request as ExpressRequest } from "express";
import { Request as KoaRequest } from "koa";
import { JsonApiSerializer, OperationProcessor } from ".";
import Addon from "./addon";
import ApplicationInstance from "./application-instance";
import Password from "./attribute-types/password";
import { LinkBuilder } from "./link-builder";
import { Paginator } from "./paginatior";
import Resource from "./resource";
import User from "./resources/user";
import { ResourceListOperationResult, ResourceOperationResult } from "./operation-result";

export enum HttpStatusCode {
  OK = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  UnprocessableEntity = 422,
  InternalServerError = 500
}

export const DEFAULT_PRIMARY_KEY = "id";

export type OperationDecorator = (
  operationCallback: Function,
  ...middlewareArguments: any[]
) => (...args: any[]) => any;

// Generic types for JSONAPI document structure.

export type AttributeValue = string | number | boolean | string[] | number[] | boolean[] | object | object[];
export type ComputedValue = (this: any, record: HasId) => Promise<AttributeValue>;

export type ResourceAttributes = {
  [key: string]: AttributeValue;
};

export type ResourceRelationships = {
  [key: string]: ResourceRelationship;
};

export type ResourceRelationship = {
  meta?: Meta;
  links?: DefaultLinks;
  data?: ResourceRelationshipData | ResourceRelationshipData[];
};

export type ResourceRelationshipData = {
  type: string;
  id: string;
};

export type Meta = Record<string, AttributeValue>;
export type ComputedMeta = Record<string, ComputedValue>;

export type Link = string | {
  href: string;
  meta?: Meta;
};

export type Links = {
  [key: string]: Link;
}

export type DefaultLinks = {
  self?: Link;
  related?: Link;
};

export type PaginationLinks = {
  first?: Link;
  last?: Link;
  prev?: Link;
  next?: Link;
};

export type ErrorLinks = {
  about?: string;
}

export type DocumentLinks = DefaultLinks & PaginationLinks & Links;

export type JsonApiDocument<ResourceT = Resource, RelatedResourcesT = Resource> = {
  data: ResourceT | ResourceT[];
  meta?: Meta;
  operations?: Operation[];
  included?: RelatedResourcesT[];
  links?: DocumentLinks;
};

export type JsonApiErrorsDocument = {
  errors: IJsonApiError[];
  meta?: Meta;
};

export interface IJsonApiError {
  id?: string;
  status: HttpStatusCode;
  code: string;
  title?: string;
  detail?: string;
  source?: {
    pointer?: string;
    parameter?: string;
  };
  links?: ErrorLinks;
}

export type JsonApiParams = {
  include?: string[];
  sort?: string[];
  filter?: { [key: string]: string };
  page?: { [key: string]: number };
  fields?: { [key: string]: string[] };
};

export type Operation = {
  op: string;
  data?: Resource;
  included?: Resource[];
  ref: {
    type: string;
    id?: string | undefined;
    lid?: string;
    relationship?: string;
  };
  params?: JsonApiParams;
  links?: DefaultLinks;
  meta?: Meta;
};

export type OperationResponse = {
  data: Resource | Resource[] | null;
  included?: Resource[];
  links?: DocumentLinks;
  meta?: Meta;
};

export type KnexRecord = {
  id: string;
  [key: string]: any;
};

export type AttributeValueMatch = {
  attribute: string;
  value: AttributeValue;
  operator?: "not" | "some" | "every";
};

export interface ResourceSchema {
  primaryKeyName?: string;
  attributes: ResourceSchemaAttributes;
  relationships: ResourceSchemaRelationships;
};

export type PasswordConstructor = typeof Password;

export interface ResourceSchemaAttributes {
  [key: string]:
    | StringConstructor
    | NumberConstructor
    | BooleanConstructor
    | ArrayConstructor
    | ObjectConstructor
    | PasswordConstructor;
};

export type ResourceSchemaRelationships = {
  [key: string]: ResourceSchemaRelationship;
};

export interface ResourceSchemaRelationship {
  type: () => typeof Resource;
  hasMany?: boolean;
  belongsTo?: boolean;
  foreignKeyName?: string;
  /**
   * By default resources are serialized with a self and related link.
   * Use this option if you don't want clients accessing the resource through the self or related link.
   */
  excludeLinks?: Array<string>;
  /**
   *  If set to true, the serialized relationship will always include the type and id of the related record under a data key.
   *  Defaults to true if not set to avoid breaking change.
   */
  alwaysIncludeLinkageData?: boolean;
};

export interface HasId {
  id: any;
  [key: string]: any;
}

export type EagerLoadedData = {
  [key: string]: ResourceRelationshipDescriptor;
};

export type ResourceRelationshipDescriptor = {
  direct: KnexRecord[] | undefined;
  nested: KnexRecord[] | undefined;
};

export type ApplicationSettings = {
  namespace?: string;
  types?: typeof Resource[];
  processors?: typeof OperationProcessor[];
  defaultProcessor?: typeof OperationProcessor;
  serializer?: typeof JsonApiSerializer;
  services?: {};
  transportLayerOptions?: TransportLayerOptions;
  baseUrl?: URL;
  defaultPaginator?: typeof Paginator;
  defaultPageSize?: number;
  maximumPageSize?: number;
}

export type ApplicationServices = {
  knex?: Knex;
  roles?: (this: ApplicationInstance, user: User) => Promise<string[]>;
  permissions?: (this: ApplicationInstance, user: User) => Promise<string[]>;
} & { [key: string]: any };

export interface IJsonApiSerializer {
  linkBuilder: LinkBuilder;
  initLinkBuilder(linkBuilderConfig: ILinkBuilderConfig): LinkBuilder;
  resourceTypeToTableName(resourceType: string): string;
  attributeToColumn(attributeName: string): string;
  columnToAttribute(columnName: string): string;
  relationshipToColumn(relationshipName: string, primaryKeyName?: string): string;
  columnToRelationship(columnName: string, primaryKeyName?: string): string;
  foreignResourceToForeignTableName(foreignResourceType: string, prefix?: string): string;
  deserializeResource(op: Operation, resourceClass: typeof Resource): Operation;
  serializeResource(resource: Resource, resourceType: typeof Resource, baseUrl?: URL): Resource;
  serializeResourceLinks(data:Resource, excludeLinks?: Array<string>): Record<string, Link>;
  serializeRelationshipLinks(primaryData: Resource, relName: string, excludeLinks?: Array<string>): Record<string, Link>;
  serializeRelationship(
    relationships: Resource | Resource[],
    resourceType: typeof Resource,
    primaryKeyName?: string
  ): ResourceRelationshipData[];
  serializeIncludedResources(
    data: Resource | Resource[] | void,
    resourceType: typeof Resource,
    baseUrl?: URL
  ): Resource[] | null;
}

export interface IAddon {
  install(): Promise<void>;
}
export type AddonOptions = { [key: string]: any };
export type ApplicationAddons = { addon: typeof Addon; options: AddonOptions }[];

export type NoOpTransaction = {
  commit(): void;
  rollback(): void;
}

export type TransportLayerOptions = {
  httpBodyPayload?: string;
  httpStrictMode?: boolean;
}

export type LinksPageParams<TPaginatorParams extends string = string> = {
  first?: Record<TPaginatorParams, number>,
  prev?: Record<TPaginatorParams, number>,
  next?: Record<TPaginatorParams, number>,
  last?: Record<TPaginatorParams, number>,
}

export interface ILinkBuilderConfig {
  namespace?: string;
  baseUrl?: URL;
}

export interface IPaginatorSettings {
  defaultPageSize: number;
  maximumPageSize: number;
}

export interface IOperationResultOptions {
  meta?: Meta;
  links?: Links;
}

export interface IResourceListOperationResultOptions extends IOperationResultOptions {
  recordCount?: number;
}

export type OperationResult = ResourceOperationResult | ResourceListOperationResult;

export type VercelRequest<BodyType = JsonApiDocument> = IncomingMessage & {
  query: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body: BodyType;
}

export type VercelResponse = ServerResponse & {
  status: (code: HttpStatusCode) => void;
  send: (body: string | JsonApiDocument | JsonApiErrorsDocument | JsonApiBulkResponse | Buffer) => void;
  json: (body: JsonApiDocument | JsonApiErrorsDocument | JsonApiBulkResponse) => void;
  redirect: (urlOrStatusCode: HttpStatusCode | string, url?: string) => void;
}

export type JsonApiBulkResponse = { operations: OperationResponse[] };

export type VendorRequest = ExpressRequest | KoaRequest | VercelRequest;
