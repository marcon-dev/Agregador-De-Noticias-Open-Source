const axios = require("axios");

jest.mock("axios");

describe("netlify/functions/news.js", () => {
  const { handler } = require("../netlify/functions/news");
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test("returns 500 when NEWSAPI_ACCESS_KEY is missing", async () => {
    delete process.env.NEWSAPI_ACCESS_KEY;

    const res = await handler();

    expect(res.statusCode).toBe(500);
    expect(res.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(res.body);
    expect(body.error).toMatch(/missing news api key/i);
  });

  test("successful fetch returns 200 with up to 4 cleaned, informative articles", async () => {
    process.env.NEWSAPI_ACCESS_KEY = "test-news-key";

    const articles = [
      {
        source: { name: "A" },
        title: "T1",
        description: "desc",
        url: "u1",
        urlToImage: "img1",
        publishedAt: "d1",
        content: "hello world [+100 chars]",
      },
      {
        source: { name: "B" },
        title: "T2",
        description: "",
        url: "u2",
        urlToImage: "img2",
        publishedAt: "d2",
        content: "short",
      }, // too short, filtered out
      {
        source: { name: "C" },
        title: "T3",
        description: "long enough description here",
        url: "u3",
        urlToImage: "img3",
        publishedAt: "d3",
        content: "",
      },
      {
        source: { name: "D" },
        title: "T4",
        description: "desc4",
        url: "u4",
        urlToImage: "img4",
        publishedAt: "d4",
        content: "content ok 1234567890",
      },
      {
        source: { name: "E" },
        title: "T5",
        description: "desc5 long enough",
        url: "u5",
        urlToImage: "img5",
        publishedAt: "d5",
        content: "content ok 0987654321",
      },
    ];

    axios.get.mockResolvedValueOnce({ data: { articles } });

    const res = await handler();

    expect(axios.get).toHaveBeenCalledWith(
      "https://newsapi.org/v2/top-headlines",
      expect.objectContaining({
        params: expect.objectContaining({
          country: "us",
          pageSize: 30,
          apiKey: "test-news-key",
        }),
        timeout: 10000,
      })
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.articles)).toBe(true);
    expect(body.articles).toHaveLength(3); // only 3 pass the heuristic given our mock data

    // Check content was cleaned (removed trailing [+N chars])
    expect(body.articles[0].content.endsWith("chars]")).toBe(false);

    // Check structure preservation and defaults
    for (const a of body.articles) {
      expect(a).toHaveProperty("source");
      expect(a).toHaveProperty("author");
      expect(a).toHaveProperty("title");
      expect(a).toHaveProperty("description");
      expect(a).toHaveProperty("url");
      expect(a).toHaveProperty("urlToImage");
      expect(a).toHaveProperty("publishedAt");
      expect(a).toHaveProperty("content");
    }
  });

  test("propagates API error status and includes details", async () => {
    process.env.NEWSAPI_ACCESS_KEY = "test-news-key";
    const err = Object.assign(new Error("Bad Request"), {
      response: { status: 400, data: { code: "parametersMissing" } },
    });
    axios.get.mockRejectedValueOnce(err);

    const res = await handler();

    expect(res.statusCode).toBe(400);
    expect(res.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(res.body);
    expect(body.error).toMatch(/failed to fetch news/i);
    expect(body.details).toEqual({ code: "parametersMissing" });
  });

  test("exclude query filters out provided titles (case-insensitive)", async () => {
    process.env.NEWSAPI_ACCESS_KEY = "test-news-key";

    const articles = [
      { source: { name: "A" }, title: "Keep Me", description: "desc ok", url: "u1", urlToImage: "img1", publishedAt: "d1", content: "content ok 1234567890" },
      { source: { name: "B" }, title: "T2", description: "long enough", url: "u2", urlToImage: "img2", publishedAt: "d2", content: "content ok 0987654321" },
      { source: { name: "C" }, title: "t2", description: "another long enough", url: "u3", urlToImage: "img3", publishedAt: "d3", content: "content ok 1122334455" },
      { source: { name: "D" }, title: "T3", description: "desc ok", url: "u4", urlToImage: "img4", publishedAt: "d4", content: "content ok abcdefghij" }
    ];

    axios.get.mockResolvedValueOnce({ data: { articles } });

    const event = {
      queryStringParameters: {
        exclude: JSON.stringify(["T2", "t3"]),
      },
    };

    const res = await handler(event);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const titles = body.articles.map((a) => a.title);
    expect(titles).toEqual(["Keep Me"]);
  });

  test("invalid exclude JSON is ignored gracefully", async () => {
    process.env.NEWSAPI_ACCESS_KEY = "test-news-key";

    const articles = [
      { source: { name: "A" }, title: "Alpha", description: "desc ok", url: "u1", urlToImage: "img1", publishedAt: "d1", content: "content ok 1234567890" },
      { source: { name: "B" }, title: "Beta", description: "long enough", url: "u2", urlToImage: "img2", publishedAt: "d2", content: "content ok 0987654321" }
    ];

    axios.get.mockResolvedValueOnce({ data: { articles } });

    const event = { queryStringParameters: { exclude: "not-json" } };

    const res = await handler(event);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const titles = body.articles.map((a) => a.title);
    // Should return both articles since exclude parsing failed and is ignored
    expect(titles).toEqual(["Alpha", "Beta"]);
  });

  test("CSV exclude fallback filters out provided titles", async () => {
    process.env.NEWSAPI_ACCESS_KEY = "test-news-key";

    const articles = [
      { source: { name: "A" }, title: "Keep Me", description: "desc ok", url: "u1", urlToImage: "img1", publishedAt: "d1", content: "content ok 1234567890" },
      { source: { name: "B" }, title: "T2", description: "long enough", url: "u2", urlToImage: "img2", publishedAt: "d2", content: "content ok 0987654321" },
      { source: { name: "C" }, title: "t3", description: "another long enough", url: "u3", urlToImage: "img3", publishedAt: "d3", content: "content ok 1122334455" }
    ];

    axios.get.mockResolvedValueOnce({ data: { articles } });

    const event = {
      queryStringParameters: {
        exclude: "T2, t3",
      },
    };

    const res = await handler(event);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const titles = body.articles.map((a) => a.title);
    expect(titles).toEqual(["Keep Me"]);
  });

  test("forwards pagination params (page and pageSize) to NewsAPI", async () => {
    process.env.NEWSAPI_ACCESS_KEY = "test-news-key";

    axios.get.mockResolvedValueOnce({ data: { articles: [] } });

    const event = {
      queryStringParameters: {
        page: "2",
        pageSize: "50",
      },
    };

    await handler(event);

    expect(axios.get).toHaveBeenCalledWith(
      "https://newsapi.org/v2/top-headlines",
      expect.objectContaining({
        params: expect.objectContaining({ country: "us", page: 2, pageSize: 50, apiKey: "test-news-key" }),
        timeout: 10000,
      })
    );
  });

  test("limits to 4 articles after filtering and cleaning", async () => {
    process.env.NEWSAPI_ACCESS_KEY = "test-news-key";

    const mk = (i) => ({
      source: { name: `S${i}` },
      title: `Title ${i}`,
      description: "desc long enough",
      url: `u${i}`,
      urlToImage: `img${i}`,
      publishedAt: `d${i}`,
      content: "content ok 1234567890",
    });

    const articles = [mk(1), mk(2), mk(3), mk(4), mk(5), mk(6)];
    axios.get.mockResolvedValueOnce({ data: { articles } });

    const res = await handler({ queryStringParameters: {} });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.articles).toHaveLength(4);
    expect(body.articles.map((a) => a.title)).toEqual(["Title 1", "Title 2", "Title 3", "Title 4"]);
  });
});
