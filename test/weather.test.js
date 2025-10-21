const axios = require("axios");

jest.mock("axios");

describe("netlify/functions/weather.js", () => {
  const { handler } = require("../netlify/functions/weather");
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test("returns 500 when OPENWEATHER_ACCESS_KEY is missing", async () => {
    delete process.env.OPENWEATHER_ACCESS_KEY;

    const res = await handler({ queryStringParameters: { city: "Paris" } });

    expect(res.statusCode).toBe(500);
    expect(res.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(res.body);
    expect(body.error).toMatch(/missing openweather api key/i);
  });

  test("successful fetch returns 200 and forwards API data", async () => {
    process.env.OPENWEATHER_ACCESS_KEY = "test-key";
    const apiResponse = { ok: true, name: "Lisbon" };
    axios.get.mockResolvedValueOnce({ data: apiResponse });

    const res = await handler({ queryStringParameters: { city: "Lisbon" } });

    expect(axios.get).toHaveBeenCalledWith(
      "https://api.openweathermap.org/data/2.5/weather",
      expect.objectContaining({
        params: expect.objectContaining({
          q: "Lisbon",
          appid: "test-key",
          units: "metric",
          lang: "pt_br",
        }),
        timeout: 10000,
      })
    );

    expect(res.statusCode).toBe(200);
    expect(res.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(res.body)).toEqual(apiResponse);
  });

  test("propagates error status and returns structured error body", async () => {
    process.env.OPENWEATHER_ACCESS_KEY = "test-key";
    const err = Object.assign(new Error("Not found"), {
      response: { status: 404, data: { message: "city not found" } },
    });
    axios.get.mockRejectedValueOnce(err);

    const res = await handler({ queryStringParameters: { city: "Nowhere" } });

    expect(res.statusCode).toBe(404);
    expect(res.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(res.body);
    expect(body.error).toMatch(/failed to fetch weather/i);
    expect(body.details).toEqual({ message: "city not found" });
  });
});
