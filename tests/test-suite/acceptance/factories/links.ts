export default {
  toGet: {
    response: (baseUrl: string) => ({
      data: [
        {
          id: 1,
          type: "link",
          attributes: {
              url: "http://example.com/1"
          },
          relationships: {}
        }
      ],
      links: {
        self: `${baseUrl}/link?page%5Bnumber%5D=0&page%5Bsize%5D=1`,
      }
    })
  }
};
