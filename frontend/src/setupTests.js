// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// react-router v7 expects the Web Encoding API, which jsdom in react-scripts 5
// does not expose by default.
const { TextDecoder, TextEncoder } = require("util");

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const originalConsoleError = console.error;
const installConsoleErrorGuard = () => {
  if (console.error.mockRestore) return;
  jest.spyOn(console, "error").mockImplementation((...args) => {
    const message = String(args[0] || "");
    if (/not wrapped in act|state update on an unmounted component/i.test(message)) {
      throw new Error(message);
    }
    originalConsoleError(...args);
  });
};

beforeAll(installConsoleErrorGuard);
beforeEach(installConsoleErrorGuard);

afterAll(() => {
  if (console.error.mockRestore) console.error.mockRestore();
});
