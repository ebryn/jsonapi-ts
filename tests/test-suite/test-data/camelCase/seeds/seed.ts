exports.seed = (knex) => {
  const initialData = [
    {
      tableName: 'users',
      values: [
        { id: 1, username: "me", email: "me@me.com", password: "test" },
        { id: 2, username: "username2", email: "me2@me.com", password: "test" },
        { id: 3, username: "username3", email: "me3@me.com", password: "test" }
      ]
    },
    {
      tableName: 'articles',
      values: [
        { id: 1, body: "this is test 1", author: 1 },
        { id: 2, body: "this is test 2", author: 2 },
        { id: 3, body: "this is test 3", author: 2 }
      ]
    },
    {
      tableName: 'votes',
      values: [
        { _Id: 1, points: 10, userId: 1, articleId: 1 },
        { _Id: 2, points: 2, userId: 1, articleId: 1 },
        { _Id: 3, points: 8, userId: 3, articleId: 3 }
      ]
    },
    {
      tableName: 'comments',
      values: [
        { _id: 1, body: "hello", type: "not_spam", author_id: 1, parentCommentId: 2 },
        { _id: 2, body: "hello2", type: "not_spam", author_id: 2, parentCommentId: 3 },
        { _id: 3, body: "hello3", type: "spam", author_id: 1 }
      ]
    },
    {
      tableName: 'links',
      values: [
        { _id: 1, url: "https://example.com/1" },
        { _id: 2, url: "https://example.com/2" },
        { _id: 3, url: "https://example.com/3" },
        { _id: 4, url: "https://example.com/4" },
        { _id: 5, url: "https://example.com/5" },
        { _id: 6, url: "https://example.com/6" },
        { _id: 7, url: "https://example.com/7" },
      ]
    }
  ];
  return Promise.all(initialData.map(({ tableName, values }) => knex(tableName).insert(values))).then(() => { });
};
