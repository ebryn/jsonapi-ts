import * as Knex from "knex";

import Resource from "./resource";
import Password from "./attribute-types/password";

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

export type ResourceAttributes = {
  [key: string]: AttributeValue;
};

export type ResourceRelationships = {
  [key: string]: ResourceRelationship;
};

export type ResourceRelationship = {
  meta?: Meta;
  links?: Links;
  data?: ResourceRelationshipData | ResourceRelationshipData[];
};

export type ResourceRelationshipData = {
  type: string;
  id: string;
};

export type Meta = {
  [key: string]: AttributeValue;
};

export type JsonApiDocument<ResourceT = Resource, RelatedResourcesT = Resource> = {
  data: ResourceT | ResourceT[];
  meta?: Meta;
  operations?: Operation[];
  included?: RelatedResourcesT[];
};

export type JsonApiErrorsDocument = {
  errors: JsonApiError[];
  meta?: Meta;
};

export type JsonApiError = {
  id?: string;
  status: HttpStatusCode;
  code: string;
  title?: string;
  detail?: string;
  source?: {
    pointer?: string;
    parameter?: string;
  };
  links?: {
    about?: string;
  };
};

export type JsonApiParams = {
  include?: string[];
  sort?: string[];
  filter?: { [key: string]: string };
  page?: { [key: string]: number };
  fields?: { [key: string]: string[] };
};

export type Links = {
  self: string | Link;
  related?: string | Link;
};

export type Link = {
  href: string;
  meta?: Meta;
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
  links?: Links;
  meta?: Meta;
};

export type OperationResponse = {
  data: Resource | Resource[] | null;
  included?: Resource[];
};

export type KnexRecord = {
  id: string;
  [key: string]: any;
};

export type AttributeValueMatch = {
  attribute: string;
  value: AttributeValue;
};

export type ResourceSchema = {
  primaryKeyName?: string;
  attributes: ResourceSchemaAttributes;
  relationships: ResourceSchemaRelationships;
};

export type PasswordConstructor = typeof Password;

export type ResourceSchemaAttributes = {
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

export type ResourceSchemaRelationship = {
  type: () => typeof Resource;
  hasMany?: boolean;
  belongsTo?: boolean;
  foreignKeyName?: string;
};

export interface HasId {
  id: any;
  [key: string]: any;
}

export type EagerLoadedData = { [key: string]: KnexRecord[] | undefined };

export type ApplicationServices = {
  knex?: Knex;
  login?: (op: Operation, userDataSource: ResourceAttributes) => Promise<boolean>;
  password?: (op: Operation) => Promise<ResourceAttributes>;
} & { [key: string]: any };

export interface IJsonApiSerializer {
  resourceTypeToTableName(resourceType: string): string;
  attributeToColumn(attributeName: string): string;
  columnToAttribute(columnName: string): string;
  relationshipToColumn(relationshipName: string, primaryKeyName: string): string;
  columnToRelationship(columnName: string, primaryKeyName: string): string;
  foreignResourceToForeignTableName(foreignResourceType: string, prefix?: string): string;
}
