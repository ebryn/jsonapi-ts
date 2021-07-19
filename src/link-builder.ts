import { join } from 'path';
import { format } from 'url';
import { ILinkBuilderConfig } from '.';
import { JsonApiParams } from "./types";
import { format as formatJasonApiParams } from './utils/json-api-params';

export class LinkBuilder {
  private namespace: string;

  public baseUrl?: URL;

  constructor({ namespace = '', baseUrl }: ILinkBuilderConfig) {
    this.namespace = namespace;
    this.baseUrl = baseUrl;
  }

  public queryLink(resourceType: string, params?: JsonApiParams) {
    return format({
      protocol: this.baseUrl?.protocol,
      host: this.baseUrl?.host,
      pathname: this.relativeResourcesUrl(resourceType),
      search: this.queryPramsToURlSearchParams(params),
    });
  }

  public selfLink(resourceType: string, id: string | undefined, params?: JsonApiParams) {
    if (!id) {
      throw new Error(`Self link for ${resourceType} could not be generated because resource "id" is undefined!`);
    }

    return format({
      protocol: this.baseUrl?.protocol,
      host: this.baseUrl?.host,
      pathname: `${this.relativeResourcesUrl(resourceType)}/${id}`,
      search: this.queryPramsToURlSearchParams(params),
    });
  }

  public relationshipsRelatedLink(resourceType: string, id: string | undefined, relationshipName: string, params?: JsonApiParams) {
    if (!id) {
      throw new Error(`Related link for ${resourceType} relationship ${relationshipName} could not be generated because resource "id" is undefined!`);
    }

    return format({
      protocol: this.baseUrl?.protocol,
      host: this.baseUrl?.host,
      pathname: `${this.relativeResourcesUrl(resourceType)}/${id}/${relationshipName}`,
      search: this.queryPramsToURlSearchParams(params),
    })
  }

  public relationshipsSelfLink(resourceType: string, id: string | undefined, relationshipName: string, params?: JsonApiParams) {
    if (!id) {
      throw new Error(`Self link for ${resourceType} relationship ${relationshipName} could not be generated because resource "id" is undefined!`);
    }

    return format({
      protocol: this.baseUrl?.protocol,
      host: this.baseUrl?.host,
      pathname: `${this.relativeResourcesUrl(resourceType)}/${id}/relationships/${relationshipName}`,
      search: this.queryPramsToURlSearchParams(params),
    });
  }

  private queryPramsToURlSearchParams(params?: JsonApiParams) {
    return params && formatJasonApiParams(params);
  }

  private relativeResourcesUrl(resourceType: string) {
    return join(this.namespace, resourceType);
  }
}
