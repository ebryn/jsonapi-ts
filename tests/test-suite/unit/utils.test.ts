import { format } from "../../../src/utils/json-api-params";
import { JsonApiParams } from "../../../src/types";


describe("utils", () => {
  it("JsonApi search params format works correctly", async () => {
    const params: JsonApiParams = {
      include: ['vote','user'],
      sort: ['name', 'createdAt'],
      filter: { name: 'John' },
      page: { number: 1, size: 1 },
      fields: { articles: ['title', 'body'] }
    }
    const search = format(params);

    expect(search).toEqual('include=vote,user&sort=name,createdAt&filter[name]=John&page[number]=1&page[size]=1&fields[articles]=title,body');
  });
});
