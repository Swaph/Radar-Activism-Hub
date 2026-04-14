const request = require("supertest");
const { createApp } = require("../server");

describe("POST /api/auth/guest", () => {
  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test("issues token and generated guest identity", async () => {
    process.env.JWT_SECRET = "test-secret";
    const app = createApp({ serveFrontend: false });

    const response = await request(app)
      .post("/api/auth/guest")
      .expect(200);

    expect(response.body).toHaveProperty("token");
    expect(response.body).toHaveProperty("username");
    expect(typeof response.body.username).toBe("string");
    expect(response.body.username.length).toBeGreaterThan(0);
  });

  test("returns 500 when JWT secret is missing", async () => {
    const app = createApp({ serveFrontend: false });

    const response = await request(app)
      .post("/api/auth/guest")
      .expect(500);

    expect(response.body).toEqual({ error: "Missing JWT_SECRET in .env" });
  });
});
