import { JsonApiParams } from "../../../src/types";
import { LinkBuilder } from "../../../src/link-builder";


describe("LinkBuilder", () => {
  const baseUrlString = 'https://localhost:3000';
  const baseUrl = new URL(baseUrlString);
  const namespace = 'api';

  it("queryLink method works correctly", async () => {
    const linkBuilder = new LinkBuilder({
      namespace,
      baseUrl,
    });

    const resourceType = 'article';

    const params: JsonApiParams = {
      include: ['vote','user'],
      sort: ['name', 'createdAt'],
      filter: { name: 'John' },
      page: { number: 1, size: 1 },
      fields: { articles: ['title', 'body'] }
    }

    const link = linkBuilder.queryLink(resourceType, params);

    expect(link).toEqual(`${baseUrlString}/${namespace}/${resourceType}?include=vote,user&sort=name,createdAt&filter[name]=John&page[number]=1&page[size]=1&fields[articles]=title,body`);
  });

  it("selfLink method works correctly", async () => {
    const linkBuilder = new LinkBuilder({
      namespace,
      baseUrl,
    });

    const resourceType = 'article';
    const id = '1';

    const params: JsonApiParams = {
      include: ['vote','user'],
      fields: { articles: ['title', 'body'] }
    }

    const link = linkBuilder.selfLink(resourceType, id, params);

    expect(link).toEqual(`${baseUrlString}/${namespace}/${resourceType}/${id}?include=vote,user&fields[articles]=title,body`);
  });

  it("relationshipsRelatedLink method works correctly", async () => {
    const linkBuilder = new LinkBuilder({
      namespace,
      baseUrl,
    });

    const resourceType = 'article';
    const id = '1';
    const relationshipName = 'author';

    const link = linkBuilder.relationshipsRelatedLink(resourceType, id, relationshipName);

    expect(link).toEqual(`${baseUrlString}/${namespace}/${resourceType}/${id}/${relationshipName}`);
  });

  it("relationshipsSelfLink method works correctly", async () => {
    const linkBuilder = new LinkBuilder({
      namespace,
      baseUrl,
    });

    const resourceType = 'article';
    const id = '1';
    const relationshipName = 'author';

    const link = linkBuilder.relationshipsSelfLink(resourceType, id, relationshipName);

    expect(link).toEqual(`${baseUrlString}/${namespace}/${resourceType}/${id}/relationships/${relationshipName}`);
  });
});
