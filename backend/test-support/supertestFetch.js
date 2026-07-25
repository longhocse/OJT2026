const request = require("supertest");

const createSupertestFetch =
  (app) =>
  async (url, options = {}) => {
    const parsedUrl = new URL(url);
    const method = (options.method ?? "GET").toLowerCase();
    let pending = request(app)[method](`${parsedUrl.pathname}${parsedUrl.search}`);

    for (const [name, value] of Object.entries(options.headers ?? {})) {
      pending = pending.set(name, value);
    }
    if (options.body !== undefined) {
      const contentType = Object.entries(options.headers ?? {}).find(
        ([name]) => name.toLowerCase() === "content-type",
      )?.[1];
      pending = pending.send(
        contentType?.includes("application/json") && typeof options.body === "string"
          ? JSON.parse(options.body)
          : options.body,
      );
    }

    const response = await pending;
    return {
      status: response.status,
      json: async () => response.body,
      text: async () => response.text,
    };
  };

module.exports = { createSupertestFetch };
