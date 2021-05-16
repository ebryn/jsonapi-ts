export const links = [
  {
    "id": 1,
    "type": "link",
    "attributes": {
        "url": "http://example.com/1"
    }
  },
  {
    "id": 2,
    "type": "link",
    "attributes": {
        "url": "http://example.com/2"
    }
  },
  {
    "id": 3,
    "type": "link",
    "attributes": {
        "url": "http://example.com/3"
    }
  },
  {
    "id": 4,
    "type": "link",
    "attributes": {
        "url": "http://example.com/4"
    }
  },
  {
    "id": 5,
    "type": "link",
    "attributes": {
        "url": "http://example.com/5"
    }
  },
  {
    "id": 6,
    "type": "link",
    "attributes": {
        "url": "http://example.com/6"
    }
  },
  {
    "id": 7,
    "type": "link",
    "attributes": {
        "url": "http://example.com/7"
    }
  }
]

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
