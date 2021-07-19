import { IJsonApiSerializer, IOperationResultOptions, IResourceListOperationResultOptions, KnexRecord } from ".";
import Resource from "./resource";
import { Links, Meta } from "./types";
abstract class OperationResult {
  meta: Meta;
  links: Links;

  constructor(options: IOperationResultOptions = {}) {
    this.meta = options.meta || {};
    this.links = options.links || {};
  }

  toPOJO(serializer: IJsonApiSerializer | undefined) {
    return {};
  }
}

export class ResourceOperationResult<TResource extends Resource = Resource> extends OperationResult {
  record: KnexRecord;
  resource?: TResource;

  constructor(record: KnexRecord, options: IOperationResultOptions = {}) {
    super(options);

    this.record = record;
  }
}

export class ResourceListOperationResult<TResource extends Resource = Resource> extends OperationResult {
  records: Array<KnexRecord>;
  recordCount?: number;
  resources?: Array<TResource>;

  constructor(records: Array<KnexRecord>, options: IResourceListOperationResultOptions = {}) {
    super(options);

    this.records = records;
    this.recordCount = options.recordCount;
  }
}
