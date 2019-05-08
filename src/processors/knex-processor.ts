import * as Knex from "knex";
import JsonApiErrors from "../json-api-errors";
import Resource from "../resource";
import {
  HasId,
  KnexRecord,
  Operation,
  ResourceSchemaRelationship,
  EagerLoadedData,
  DEFAULT_PRIMARY_KEY,
  IJsonApiSerializer
} from "../types";
import { camelize, pluralize } from "../utils/string";
import pick from "../utils/pick";
import promiseHashMap from "../utils/promise-hash-map";
import OperationProcessor from "./operation-processor";
import ApplicationInstance from "../application-instance";

const operators = {
  eq: "=",
  ne: "!=",
  lt: "<",
  gt: ">",
  le: "<=",
  ge: ">=",
  like: "like",
  in: "in",
  nin: "not in"
};

const getOperator = (paramValue: string): string =>
  operators[Object.keys(operators).find(operator => paramValue.indexOf(`${operator}:`) === 0)];

const getWhereMethod = (value: string, operator: string) => {
  if (value !== "null") {
    return "andWhere";
  }

  if (value === "null" && operator === "=") {
    return "whereNull";
  }

  if (value === "null" && operator === "!=") {
    return "whereNotNull";
  }
};

const buildSortClause = (sort: string[]) => {
  return sort.map(criteria => {
    if (criteria.startsWith("-")) {
      return { field: camelize(criteria.substr(1)), direction: "DESC" };
    }

    return { field: camelize(criteria), direction: "ASC" };
  });
};

const getColumns = (resourceClass: typeof Resource, serializer: IJsonApiSerializer, fields = {}): string[] => {
  const { type, schema } = resourceClass;
  const { attributes, relationships, primaryKeyName } = schema;
  const relationshipsKeys = Object.entries(relationships)
    .filter(([, value]) => value.belongsTo)
    .map(
      ([key, value]) =>
        value.foreignKeyName || serializer.relationshipToColumn(key, primaryKeyName || DEFAULT_PRIMARY_KEY)
    );
  const typeFields = (fields[type] || []).filter((key: string) => Object.keys(attributes).includes(key));

  const attributesKeys: string[] = typeFields.length ? typeFields : Object.keys(attributes);

  return [
    ...attributesKeys.map(key => `${serializer.attributeToColumn(key)} as ${key}`),
    ...relationshipsKeys,
    primaryKeyName || DEFAULT_PRIMARY_KEY
  ];
};

export default class KnexProcessor<ResourceT extends Resource> extends OperationProcessor<ResourceT> {
  protected knex: Knex.Transaction;

  constructor(appInstance: ApplicationInstance) {
    super(appInstance);
    this.knex = appInstance.transaction;
  }

  getQuery(): Knex.QueryBuilder {
    return this.knex(this.tableName);
  }

  async eagerLoad(op: Operation, result: ResourceT | ResourceT[]) {
    const relationships = pick(this.resourceClass.schema.relationships, op.params.include);

    return promiseHashMap(relationships, (key: string) => {
      return this.eagerFetchRelationship(key, result);
    });
  }

  async get(op: Operation): Promise<HasId[]> {
    const { params, ref } = op;
    const { id } = ref;
    const primaryKey = this.resourceClass.schema.primaryKeyName || DEFAULT_PRIMARY_KEY;
    const filters = params ? { [primaryKey]: id, ...(params.filter || {}) } : { [primaryKey]: id };

    const records: KnexRecord[] = await this.getQuery()
      .where(queryBuilder => this.filtersToKnex(queryBuilder, filters))
      .modify(queryBuilder => this.optionsBuilder(queryBuilder, op))
      .select(getColumns(this.resourceClass, this.appInstance.app.serializer, op.params.fields));

    return records;
  }

  async remove(op: Operation): Promise<void> {
    const primaryKeyName = this.resourceClass.schema.primaryKeyName || DEFAULT_PRIMARY_KEY;

    const record = await this.getQuery()
      .where({ [primaryKeyName]: op.ref.id })
      .first();

    if (!record) {
      throw JsonApiErrors.RecordNotExists();
    }

    return await this.getQuery()
      .where({ [primaryKeyName]: op.ref.id })
      .del()
      .then(() => undefined);
  }

  async update(op: Operation): Promise<HasId> {
    const { id } = op.ref;
    const schema = this.resourceClass.schema;
    const primaryKeyName = schema.primaryKeyName || DEFAULT_PRIMARY_KEY;

    const dataToUpdate = Object.keys(op.data.attributes)
      .map(attribute => {
        const attributeName = this.appInstance.app.serializer.attributeToColumn(attribute);
        const value = schema.attributes[attribute] === Object || schema.attributes[attribute] === Array
          ? JSON.stringify(op.data.attributes[attribute])
          : op.data.attributes[attribute];

        return { [attributeName]: value };
      })
      .reduce((keyValues, keyValue) => ({ ...keyValues, ...keyValue }), {});

    const updated = await this.getQuery()
      .where({ [primaryKeyName]: id })
      .first()
      .update(dataToUpdate);

    if (!updated) {
      throw JsonApiErrors.RecordNotExists();
    }

    return await this.getQuery()
      .where({ [primaryKeyName]: id })
      .select(getColumns(this.resourceClass, this.appInstance.app.serializer))
      .first();
  }

  async add(op: Operation): Promise<HasId> {
    const schema = this.resourceClass.schema;
    const primaryKeyName = schema.primaryKeyName || DEFAULT_PRIMARY_KEY;

    const dataToInsert = Object.keys(op.data.attributes)
      .map(attribute => {
        const attributeName = this.appInstance.app.serializer.attributeToColumn(attribute);
        const value = schema.attributes[attribute] === Object || schema.attributes[attribute] === Array
          ? JSON.stringify(op.data.attributes[attribute])
          : op.data.attributes[attribute];

        return { [attributeName]: value };
      })
      .reduce((keyValues, keyValue) => ({ ...keyValues, ...keyValue }), {});

    const ids = await this.getQuery().insert(dataToInsert, primaryKeyName);

    return await this.getQuery()
      .whereIn(primaryKeyName, ids)
      .select(getColumns(this.resourceClass, this.appInstance.app.serializer))
      .first();
  }

  get tableName() {
    return this.appInstance.app.serializer.resourceTypeToTableName(this.resourceClass.type);
  }

  filtersToKnex(queryBuilder, filters: {}) {
    const processedFilters = [];

    Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

    Object.keys(filters).forEach(key => {
      let value = String(filters[key]);
      const operator = getOperator(value) || "=";

      if (value.substring(value.indexOf(":") + 1)) {
        value = value.substring(value.indexOf(":") + 1);
      }

      processedFilters.push({
        value,
        operator,
        method: getWhereMethod(value, operator),
        column:
          key === this.resourceClass.schema.primaryKeyName
            ? key
            : this.appInstance.app.serializer.attributeToColumn(key)
      });
    });

    return processedFilters.forEach(filter =>
      queryBuilder[filter.method](filter.column, filter.operator, filter.value)
    );
  }

  optionsBuilder(queryBuilder: Knex.QueryBuilder, op: Operation) {
    const { sort, page } = op.params;
    if (sort) {
      buildSortClause(sort).forEach(({ field, direction }) => {
        queryBuilder.orderBy(field, direction);
      });
    }

    if (page) {
      queryBuilder.offset(page.offset).limit(page.limit);
    }
  }

  async getRelationships(op: Operation, record: HasId, eagerLoadedData: EagerLoadedData) {
    const relationships = pick(this.resourceClass.schema.relationships, op.params.include);

    return promiseHashMap(relationships, (key: string) => {
      if (relationships[key] instanceof Function) {
        return relationships[key].call(this, record);
      }

      const relationshipSchema = this.resourceClass.schema.relationships[key];

      return this.fetchRelationship(key, relationshipSchema, record, eagerLoadedData);
    });
  }

  async eagerFetchRelationship(key: string, result: ResourceT | ResourceT[]): Promise<KnexRecord[] | void> {
    const relationship = this.resourceClass.schema.relationships[key];
    const relationProcessor: KnexProcessor<Resource> = (await this.processorFor(
      relationship.type().type
    )) as KnexProcessor<Resource>;

    const query = relationProcessor.getQuery();
    const foreignTableName = relationProcessor.tableName;
    const foreignType = relationProcessor.resourceClass.type;
    const sqlOperator = Array.isArray(result) ? "in" : "=";

    const primaryKey = this.resourceClass.schema.primaryKeyName || DEFAULT_PRIMARY_KEY;
    const foreignKey =
      relationship.foreignKeyName || this.appInstance.app.serializer.relationshipToColumn(key, primaryKey);

    const queryIn: string | string[] = Array.isArray(result)
      ? result.map((resource: Resource) => resource[primaryKey])
      : result[primaryKey];

    if (relationship.belongsTo) {
      const belongingPrimaryKey = relationship.type().schema.primaryKeyName || DEFAULT_PRIMARY_KEY;

      const belongingTableName = this.appInstance.app.serializer.foreignResourceToForeignTableName(foreignType);

      return query
        .join(this.tableName, `${belongingTableName}.${belongingPrimaryKey}`, "=", `${this.tableName}.${foreignKey}`)
        .where(`${this.tableName}.${primaryKey}`, sqlOperator, queryIn)
        .select(`${belongingTableName}.*`)
        .from(`${foreignTableName} as ${belongingTableName}`);
    }

    if (relationship.hasMany) {
      return query
        .join(this.tableName, `${foreignTableName}.${foreignKey}`, "=", `${this.tableName}.${primaryKey}`)
        .where(`${this.tableName}.${primaryKey}`, sqlOperator, queryIn)
        .select(`${foreignTableName}.*`);
    }
  }

  async fetchRelationship(
    key: string,
    relationship: ResourceSchemaRelationship,
    record: HasId,
    eagerLoadedData: EagerLoadedData
  ): Promise<KnexRecord | KnexRecord[] | void> {
    if (!eagerLoadedData[key]) {
      return;
    }
    const relatedPrimaryKey = relationship.type().schema.primaryKeyName || DEFAULT_PRIMARY_KEY;
    const thisPrimaryKey = this.resourceClass.schema.primaryKeyName || DEFAULT_PRIMARY_KEY;

    const foreignKeyName =
      relationship.foreignKeyName || this.appInstance.app.serializer.relationshipToColumn(key, relatedPrimaryKey);

    if (relationship.belongsTo) {
      return eagerLoadedData[key].find(
        (eagerLoadedRecord: KnexRecord) => eagerLoadedRecord[relatedPrimaryKey] === record[foreignKeyName]
      );
    }

    if (relationship.hasMany) {
      return eagerLoadedData[key].filter(
        (eagerLoadedRecord: KnexRecord) => record[thisPrimaryKey] === eagerLoadedRecord[foreignKeyName]
      );
    }
  }
}
