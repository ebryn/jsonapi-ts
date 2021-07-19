import { IPaginatorSettings, JsonApiSerializer } from '.';
import { LinksPageParams, JsonApiParams } from './types';
import JsonApiErrors from "./errors/json-api-errors";
import { Knex } from 'knex';

export class Paginator {
  public static readonly requiresRecordCount: boolean = false;

  constructor(params: JsonApiParams | undefined, settings: IPaginatorSettings) {}

  public apply(queryBuilder: Knex.QueryBuilder) {}

  public linksPageParams(recordCount: number): LinksPageParams {
    return {};
  };
}

export type PagedPaginatorParams = 'size' | 'number';

export class PagedPaginator extends Paginator {
  private number: number;
  private size: number;
  private settings: IPaginatorSettings;

  public static readonly requiresRecordCount: boolean = true;

  constructor(params: JsonApiParams | undefined, settings: IPaginatorSettings) {
    super(params, settings);

    this.settings = settings;

    this.parsePaginationParams(params);
    this.verifyPaginationParams();
  }

  public apply(queryBuilder: Knex.QueryBuilder) {
    const offset = (this.number - 1) * this.size;

    queryBuilder.offset(offset).limit(this.size);
  }

  public linksPageParams(recordCount: number): LinksPageParams<PagedPaginatorParams> {
    const pageCount = this.calculatePageCount(recordCount);

    const linksPageParams = {
      first: {
        number: 1,
        size: this.size,
      },
    };

    if (this.number > 1) {
      linksPageParams['prev'] = {
        number: this.number - 1,
        size: this.size
      };
    }

    if (this.number < pageCount) {
      linksPageParams['next'] = {
        number: this.number + 1,
        size: this.size,
      }
    }

    if (recordCount) {
      linksPageParams['last'] = {
        number: pageCount == 0 ? 1 : pageCount,
        size: this.size,
      }
    }

    return linksPageParams;
  }

  private calculatePageCount(recordCount: number) {
    return Math.ceil(recordCount / this.size);
  }

  private parsePaginationParams(params?: JsonApiParams) {
    this.number = params?.page?.number || 1;
    this.size = params?.page?.size || this.settings.defaultPageSize;
  }

  private verifyPaginationParams() {
    if (this.size < 1) {
      throw JsonApiErrors.BadRequest(`Invalid page size value.`);
    }

    if (this.size > this.settings.maximumPageSize) {
      throw JsonApiErrors.BadRequest(`Size exceeds maximum page size of ${this.settings.maximumPageSize}.`)
    }

    if (this.number < 1) {
      throw JsonApiErrors.BadRequest(`Invalid page number value. Page number starts from 1.`);
    }
  }
}

// export type OffsetPaginatorParams = 'limit' | 'offset';

// export class OffsetPaginator extends Paginator {

//   public static readonly requiresRecordCount: boolean = true;

//   constructor(params, settings) {
//     super(params, settings);
//   }
// }
