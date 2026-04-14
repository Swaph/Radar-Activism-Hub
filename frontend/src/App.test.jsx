import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import LandingPage from "./pages/LandingPage";
import axios from "axios";

vi.mock("axios", () => ({
  default: {
    post: vi.fn()
  }
}));

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate
}));

function mockCanvasContext() {
  const ctx = {
    fillStyle: "",
    font: "",
    fillRect: vi.fn(),
    fillText: vi.fn()
  };

  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    value: () => ctx,
    configurable: true
  });
}

describe("Landing page auth flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockCanvasContext();
  });

  test("renders landing page with join action", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { name: /resist\. reveal\. revolt\./i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /join/i })).toBeInTheDocument();
  });

  test("authenticates guest and navigates to dashboard on join", async () => {
    axios.post.mockResolvedValue({
      data: {
        token: "jwt-test-token",
        username: "TestUser"
      }
    });

    render(<LandingPage />);

    fireEvent.click(screen.getByRole("button", { name: /join/i }));

    await screen.findByRole("button", { name: /join/i });
    expect(localStorage.getItem("jwt")).toBe("jwt-test-token");
    expect(localStorage.getItem("username")).toBe("TestUser");
    expect(axios.post).toHaveBeenCalledWith(expect.stringMatching(/\/api\/auth\/guest$/));
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });
});
