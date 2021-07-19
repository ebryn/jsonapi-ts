import {Knex} from "knex";
import ApplicationInstance from "../application-instance";
import JsonApiErrors from "../errors/json-api-errors";
import Resource from "../resource";
import {
  DEFAULT_PRIMARY_KEY,
  EagerLoadedData,
  HasId,
  IJsonApiSerializer,
  JsonApiParams,
  KnexRecord,
  Operation,
  ResourceSchema,
  ResourceSchemaRelationship,
  ResourceSchemaRelationships
} from "../types";
import pick from "../utils/pick";
import promiseHashMap from "../utils/promise-hash-map";
import OperationProcessor from "./operation-processor";
import { KnexOperators as operators } from "../utils/operators";
import { ResourceOperationResult, ResourceListOperationResult } from "../operation-result";
import { OperationResult } from "..";

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

const buildSortClause = (sort: string[], resourceClass: typeof Resource, serializer: IJsonApiSerializer) => {
  return sort.map(criteria => {
    const direction = criteria.startsWith("-") ? "DESC" : "ASC";
    const attributeName = criteria.startsWith("-") ? criteria.substr(1) : criteria;

    const isCustomFK = Object.entries(resourceClass.schema.relationships)
      .filter(([, value]) => value.belongsTo)
      .map(([, value]) => value.foreignKeyName)
      .includes(attributeName);
    const field = isCustomFK ? attributeName : serializer.attributeToColumn(attributeName);

    return { field, direction };
  });
};

const parseOperationIncludedRelationships = (
  operationIncludes: string[],
  resourceRelationships: ResourceSchemaRelationships
): {
  relationships: ResourceSchemaRelationships;
  nestedRelationships: { [key: string]: ResourceSchemaRelationships };
} => {
  const includes = operationIncludes.map((relationship: string) => relationship.split("."));

  const relationships = pick<ResourceSchemaRelationships, ResourceSchemaRelationships>(resourceRelationships, includes.map(nestedInclude => nestedInclude[0]));

  const nestedRelationships = includes
    .filter(include => include.length > 1)
    .reduce(
      (acumRelationships, [nestedOrigin, nestedRelationshipName]) => ({
        ...acumRelationships,
        [nestedOrigin]: {
          [nestedRelationshipName]: relationships[nestedOrigin].type().schema.relationships[nestedRelationshipName]
        }
      }),
      {}
    );

  return { relationships, nestedRelationships };
};

export default class KnexProcessor<ResourceT extends Resource> extends OperationProcessor<ResourceT> {
  protected knex: Knex.Transaction;

  constructor(appInstance: ApplicationInstance) {
    super(appInstance);
    this.knex = appInstance.transaction as Knex.Transaction;
  }

  getQuery(): Knex.QueryBuilder {
    return this.knex(this.tableName);
  }

  async eagerLoad(op: Operation, result: ResourceT | ResourceT[]): Promise<EagerLoadedData> {
    if (!op.params || !op.params.include) {
      return {};
    }

    const { relationships, nestedRelationships } = parseOperationIncludedRelationships(
      op.params.include,
      this.resourceClass.schema.relationships
    );
    const directData = await promiseHashMap(relationships, (baseKey: string) => {
      return this.eagerFetchRelationship(baseKey, result, relationships[baseKey], this.resourceClass);
    });

    const nestedData: { [key: string]: KnexRecord[] | undefined } = await promiseHashMap(
      nestedRelationships,
      async (baseKey: string) => {
        return await promiseHashMap(nestedRelationships[baseKey], async (key: string) => {
          const relationProcessor = (await this.processorFor(relationships[baseKey].type().type)) as KnexProcessor<
            Resource
          >;
          return this.eagerFetchRelationship(
            key,
            directData[baseKey],
            nestedRelationships[baseKey][key],
            relationProcessor.resourceClass
          );
        });
      }
    );

    const eagerlyLoadedData = {};
    for (const baseKey in directData) {
      if (directData.hasOwnProperty(baseKey)) {
        eagerlyLoadedData[baseKey] = { direct: directData[baseKey], nested: nestedData[baseKey] };
      }
    }

    return eagerlyLoadedData;
  }

  protected getColumns(serializer: IJsonApiSerializer, params: JsonApiParams = {}): string[] {
    const { fields = {}, include = [] } = params;
    const { type, schema } = this.resourceClass;
    const { attributes, relationships, primaryKeyName } = schema;
    const relationshipsKeys = Object.entries(relationships)
      .filter(([relName, value]) => {
        const isIncluded = include.includes(relName);
        const isInSparseFieldsets = fields[type]?.includes(relName);

        return isIncluded || isInSparseFieldsets|| value.belongsTo && value.alwaysIncludeLinkageData;
      })
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
  }

  async get(op: Operation): Promise<OperationResult> {
    const { params, ref } = op;
    const { id } = ref;
    const primaryKey = this.resourceClass.schema.primaryKeyName || DEFAULT_PRIMARY_KEY;
    const filters = params ? { [primaryKey]: id, ...(params.filter || {}) } : { [primaryKey]: id };

    const recordsQuery = this.getQuery()
      .where(queryBuilder => this.filtersToKnex(queryBuilder, filters));

    // TODO: skip this query if not needed
    const { recordCount } = await this.getQuery()
      .count('* as recordCount')
      .from(recordsQuery.clone().offset(0).clearOrder())
      .first() as { recordCount: number };

    const records: KnexRecord[] = await recordsQuery
      .modify(queryBuilder => this.optionsBuilder(queryBuilder, params || {}))
      .select(this.getColumns(this.appInstance.app.serializer, params));

    if (!records.length && id) {
      throw JsonApiErrors.RecordNotExists();
    }

    if (id) {
      return new ResourceOperationResult(records[0]);
    }

    return new ResourceListOperationResult(
      records,
      {
        recordCount,
      }
    );
  }

  async remove(op: Operation): Promise<void> {
    const { params, ref } = op;
    const { id } = ref;
    const primaryKey = this.resourceClass.schema.primaryKeyName || DEFAULT_PRIMARY_KEY;
    const filters = params ? { [primaryKey]: id, ...(params.filter || {}) } : { [primaryKey]: id };

    const record = await this.getQuery()
      .where(queryBuilder => this.filtersToKnex(queryBuilder, filters))
      .first();

    if (!record) {
      throw JsonApiErrors.RecordNotExists();
    }

    return await this.getQuery()
      .where({ [primaryKey]: id })
      .del()
      .then(() => undefined);
  }

  async update(op: Operation): Promise<ResourceOperationResult> {
    const { params, ref } = op;
    const data = op.data as Resource;
    const { id } = ref;
    const primaryKey = this.resourceClass.schema.primaryKeyName || DEFAULT_PRIMARY_KEY;
    const filters = params ? { [primaryKey]: id, ...(params.filter || {}) } : { [primaryKey]: id };

    const dataToUpdate = Object.keys(data.attributes)
      .map(attribute => ({
        [this.appInstance.app.serializer.attributeToColumn(attribute)]: data.attributes[attribute]
      }))
      .reduce((keyValues, keyValue) => ({ ...keyValues, ...keyValue }), {});

    const updated = await this.getQuery()
      .where(queryBuilder => this.filtersToKnex(queryBuilder, filters))
      .first()
      .update(dataToUpdate);

    if (!updated) {
      throw JsonApiErrors.RecordNotExists();
    }

    const record = await this.getQuery()
      .where({ [primaryKey]: id })
      .select(this.getColumns(this.appInstance.app.serializer))
      .first();

    return new ResourceOperationResult(record);
  }

  async add(op: Operation): Promise<ResourceOperationResult> {
    const primaryKeyName = this.resourceClass.schema.primaryKeyName || DEFAULT_PRIMARY_KEY;
    const data = op.data as Resource;

    const dataToInsert = Object.keys(data.attributes)
      .map(attribute => ({
        [this.appInstance.app.serializer.attributeToColumn(attribute)]: data.attributes[attribute]
      }))
      .reduce((keyValues, keyValue) => ({ ...keyValues, ...keyValue }), {});

    if (data.id) {
      dataToInsert[primaryKeyName] = data.id;
    }

    const ids = await this.getQuery().insert(dataToInsert, primaryKeyName);

    const record = await this.getQuery()
      .whereIn(primaryKeyName, ids)
      .select(this.getColumns(this.appInstance.app.serializer))
      .first();

    return new ResourceOperationResult(record);
  }

  get tableName() {
    return this.appInstance.app.serializer.resourceTypeToTableName(this.resourceClass.type);
  }

  getValidAttributes(schema: ResourceSchema, serializer: IJsonApiSerializer) {
    const { attributes, relationships, primaryKeyName } = schema;
    const relationshipsKeys = Object.entries(relationships)
      .filter(([, value]) => value.belongsTo)
      .map(
        ([key, value]) =>
          value.foreignKeyName || serializer.relationshipToColumn(key, primaryKeyName || DEFAULT_PRIMARY_KEY)
      );

    return Object.keys(attributes)
      .concat(relationshipsKeys)
      .concat(primaryKeyName || DEFAULT_PRIMARY_KEY);
  }

  filtersToKnex(queryBuilder: Knex.QueryBuilder, filters: {}) {
    const processedFilters: { method: string, column: string, operator: string, value: string }[] = [];

    Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

    const validKeys = this.getValidAttributes(this.resourceClass.schema, this.appInstance.app.serializer);

    Object.keys(filters).forEach(key => {
      if (key in this.attributes) {
        return;
      }

      if (!validKeys.includes(key)) {
        throw JsonApiErrors.BadRequest(`${key} is not a valid field to filter`);
      }

      const matches = String(filters[key]).split("|");

      processedFilters.push(
        ...matches.map((match: string) => {
          let value = "";
          let comparer = "";

          if (match.includes(":")) {
            [comparer, value] = match.split(":");
          } else {
            comparer = "eq";
            value = match;
          }

          const operator = operators[comparer];

          return {
            value,
            operator,
            method: getWhereMethod(value, operator),
            column:
              key === this.resourceClass.schema.primaryKeyName
                ? key
                : this.appInstance.app.serializer.attributeToColumn(key)
          };
        }) as { method: string, column: string, operator: string, value: string }[]
      );
    });

    return processedFilters.forEach(filter =>
      queryBuilder[filter.method](filter.column, filter.operator, filter.value)
    );
  }

  optionsBuilder(queryBuilder: Knex.QueryBuilder, params: JsonApiParams) {
    const { sort, page } = params;
    if (sort) {
      buildSortClause(sort, this.resourceClass, this.appInstance.app.serializer).forEach(({ field, direction }) => {
        queryBuilder.orderBy(field, direction);
      });
    }

    let offset = 0;
    let limit = this.appInstance.app.defaultPageSize;

    if (page) {
      offset = page.offset || (page.number - 1) * page.size;
      limit = page.limit || page.size;
    }

    // TODO use paginator.apply(queryBuilder) instead!!

    queryBuilder.offset(offset).limit(limit);
  }

  async eagerFetchRelationship(
    key: string,
    result: ResourceT | ResourceT[],
    relationship: ResourceSchemaRelationship,
    baseResource: typeof Resource
  ): Promise<KnexRecord[] | void> {
    const baseTableName = this.appInstance.app.serializer.resourceTypeToTableName(baseResource.type);
    const relationProcessor = (await this.processorFor(relationship.type().type)) as KnexProcessor<Resource>;

    const query = relationProcessor.getQuery();
    const foreignTableName = relationProcessor.tableName;
    const foreignType = relationProcessor.resourceClass.type;
    const sqlOperator = Array.isArray(result) ? "in" : "=";
    const columns = relationProcessor.getColumns(this.appInstance.app.serializer)

    const primaryKey = baseResource.schema.primaryKeyName || DEFAULT_PRIMARY_KEY;

    const queryIn: string | string[] = Array.isArray(result)
      ? result.map((resource: Resource) => resource[primaryKey])
      : result[primaryKey];

    if (relationship.belongsTo) {
      const belongingPrimaryKey = relationship.type().schema.primaryKeyName || DEFAULT_PRIMARY_KEY;
      const foreignKey =
        relationship.foreignKeyName || this.appInstance.app.serializer.relationshipToColumn(key, primaryKey);
      const belongingTableName = this.appInstance.app.serializer.foreignResourceToForeignTableName(foreignType);

      return query
        .join(baseTableName, `${belongingTableName}.${belongingPrimaryKey}`, "=", `${baseTableName}.${foreignKey}`)
        .where(`${baseTableName}.${primaryKey}`, sqlOperator, queryIn)
        .select(columns.map(field=>`${belongingTableName}.${field}`))
        .from(`${foreignTableName} as ${belongingTableName}`);
    }

    if (relationship.hasMany) {
      const foreignKey =
        relationship.foreignKeyName ||
        this.appInstance.app.serializer.relationshipToColumn(baseResource.type, primaryKey);
      return query
        .join(baseTableName, `${foreignTableName}.${foreignKey}`, "=", `${baseTableName}.${primaryKey}`)
        .where(`${baseTableName}.${primaryKey}`, sqlOperator, queryIn)
        .select(columns.map(field=>`${foreignTableName}.${field}`));
    }
  }

  async getRelationships(op: Operation, record: HasId, eagerLoadedData: EagerLoadedData) {
    if (!op.params || !op.params.include) {
      return {};
    }

    return eagerLoadedData;
  }
}
