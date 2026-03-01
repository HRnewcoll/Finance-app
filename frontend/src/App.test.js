import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

test("renders home page with three tool cards", () => {
  render(<App />);
  expect(screen.getByText(/Accessibility Mini-Apps/i)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /Colour Contrast Checker/i })).toBeInTheDocument();
  expect(screen.getAllByText(/ARIA Validator/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Image Describer/i).length).toBeGreaterThan(0);
});

test("navigation renders Colour Contrast page", async () => {
  render(<App />);
  const nav = screen.getByRole("navigation", { name: /Main navigation/i });
  await userEvent.click(within(nav).getByRole("link", { name: /Colour Contrast/i }));
  expect(await screen.findByRole("heading", { name: /Colour Contrast Checker/i })).toBeInTheDocument();
});

test("navigation renders ARIA Validator page", async () => {
  render(<App />);
  const nav = screen.getByRole("navigation", { name: /Main navigation/i });
  await userEvent.click(within(nav).getByRole("link", { name: /ARIA Validator/i }));
  expect(await screen.findByRole("heading", { name: /ARIA Validator/i })).toBeInTheDocument();
});

test("navigation renders Image Describer page", async () => {
  render(<App />);
  const nav = screen.getByRole("navigation", { name: /Main navigation/i });
  await userEvent.click(within(nav).getByRole("link", { name: /Image Describer/i }));
  expect(await screen.findByRole("heading", { name: /Image Describer/i })).toBeInTheDocument();
});

test("skip link is present", () => {
  render(<App />);
  expect(screen.getByText(/Skip to main content/i)).toBeInTheDocument();
});
