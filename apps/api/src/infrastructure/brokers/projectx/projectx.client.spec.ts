import { describe, expect, it, jest } from "@jest/globals";
import { ProjectXClient } from "./projectx.client";

describe("ProjectXClient", () => {
  it("authenticates with username and API key", async () => {
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          token: "test-token",
          success: true,
          errorCode: 0,
          errorMessage: null,
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    const client = new ProjectXClient(
      {
        username: "test-user",
        apiKey: "test-api-key",
        baseUrl: "https://api.topstepx.com",
      },
      {
        fetchImpl: fetchMock,
      },
    );

    const result = await client.authenticate();

    expect(result.success).toBe(true);
    expect(result.token).toBe("test-token");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.topstepx.com/api/Auth/loginKey",
      expect.objectContaining({
        method: "POST",
      }),
    );

    const [, request] = fetchMock.mock.calls[0];

    expect(request?.body).toBe(
      JSON.stringify({
        userName: "test-user",
        apiKey: "test-api-key",
      }),
    );
  });

  it("uses bearer token for authenticated requests", async () => {
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            token: "test-token",
            success: true,
            errorCode: 0,
            errorMessage: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accounts: [],
            success: true,
            errorCode: 0,
            errorMessage: null,
          }),
          { status: 200 },
        ),
      );

    const client = new ProjectXClient(
      {
        username: "test-user",
        apiKey: "test-api-key",
      },
      {
        fetchImpl: fetchMock,
      },
    );

    await client.authenticate();
    await client.getAccounts();

    const [, request] = fetchMock.mock.calls[1];

    expect(request?.headers).toEqual(
      expect.objectContaining({
        authorization: "Bearer test-token",
      }),
    );
  });

  it("does not expose credentials in errors", async () => {
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          errorCode: 3,
          errorMessage: "InvalidCredentials",
        }),
        { status: 200 },
      ),
    );

    const client = new ProjectXClient(
      {
        username: "secret-user",
        apiKey: "super-secret-key",
      },
      {
        fetchImpl: fetchMock,
      },
    );

    await expect(client.authenticate()).rejects.toThrow(
      "InvalidCredentials",
    );

    await expect(client.authenticate()).rejects.not.toThrow(
      "super-secret-key",
    );
  });
});
