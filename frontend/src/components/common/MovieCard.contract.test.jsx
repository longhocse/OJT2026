import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { normalizeMovie } from "../../contracts/normalizers";
import MovieCard from "./MovieCard";

test("renders a representative backend movie response after normalization", () => {
  const movie = normalizeMovie({
    id: "22222222-2222-4222-8222-222222222222",
    title: "Contract Movie",
    description: null,
    genre: "Drama, Thriller",
    rating: 4.25,
    duration: 115,
    poster_url: null,
    trailer_url: null,
    release_date: "2026-06-20",
    status: "now_showing",
    created_at: "2026-06-01T00:00:00.000Z",
  });

  render(
    <MemoryRouter>
      <MovieCard movie={movie} />
    </MemoryRouter>,
  );

  expect(screen.getByText("Contract Movie")).toBeInTheDocument();
  expect(screen.getByText("115 phút")).toBeInTheDocument();
  expect(screen.getByText("Drama")).toBeInTheDocument();
  expect(screen.getByText("4,25")).toBeInTheDocument();
});
