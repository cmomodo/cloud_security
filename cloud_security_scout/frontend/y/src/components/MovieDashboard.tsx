import React, { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";

interface MovieDashboardProps {
  client: ReturnType<typeof generateClient<Schema>>;
}

interface Movie {
  id: string;
  imdb_id?: string;
  title: string;
  year: number;
  genre: string;
  director: string;
  rating: number;
  plot: string;
  poster?: string;
  timestamp: number;
}

const MovieDashboard: React.FC<MovieDashboardProps> = ({ client }) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sample movie data for demonstration
  const sampleMovies: Movie[] = [
    {
      id: "1",
      imdb_id: "tt0133093",
      title: "The Matrix",
      year: 1999,
      genre: "Sci-Fi",
      director: "The Wachowskis",
      rating: 8.7,
      plot: "A computer programmer discovers reality as he knows it is a simulation.",
      timestamp: Date.now() - 1000000,
    },
    {
      id: "2",
      imdb_id: "tt1375666",
      title: "Inception",
      year: 2010,
      genre: "Sci-Fi",
      director: "Christopher Nolan",
      rating: 8.8,
      plot: "A thief who steals corporate secrets through dream-sharing technology.",
      timestamp: Date.now() - 2000000,
    },
    {
      id: "3",
      imdb_id: "tt0468569",
      title: "The Dark Knight",
      year: 2008,
      genre: "Action",
      director: "Christopher Nolan",
      rating: 9.0,
      plot: "Batman faces his greatest psychological and physical tests.",
      timestamp: Date.now() - 3000000,
    },
    {
      id: "4",
      imdb_id: "tt0110912",
      title: "Pulp Fiction",
      year: 1994,
      genre: "Crime",
      director: "Quentin Tarantino",
      rating: 8.9,
      plot: "The lives of two mob hitmen, a boxer, and others intertwine.",
      timestamp: Date.now() - 4000000,
    },
    {
      id: "5",
      imdb_id: "tt0111161",
      title: "The Shawshank Redemption",
      year: 1994,
      genre: "Drama",
      director: "Frank Darabont",
      rating: 9.3,
      plot: "Two imprisoned men bond over years, finding solace and redemption.",
      timestamp: Date.now() - 5000000,
    },
    {
      id: "6",
      imdb_id: "tt0109830",
      title: "Forrest Gump",
      year: 1994,
      genre: "Drama",
      director: "Robert Zemeckis",
      rating: 8.8,
      plot: "A man with low IQ accomplishes great things and influences others.",
      timestamp: Date.now() - 6000000,
    },
  ];

  const fetchMovies = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch from Amplify DynamoDB
      const { data: movieRecords } = await client.models.Movie.list();

      const dbMovies: Movie[] = movieRecords.map((record) => ({
        id: record.id,
        imdb_id: (record as any).imdb_id || undefined,
        title: record.title,
        year: record.year || new Date().getFullYear(),
        genre: record.genre || "Unknown",
        director: record.director || "Unknown",
        rating: record.rating || 0,
        plot: record.plot || "",
        poster: record.poster || undefined,
        timestamp: new Date(record.timestamp).getTime(),
      }));

      if (dbMovies.length > 0) {
        setMovies(dbMovies);
        return;
      }

      // If no movies in DB, try to fetch from API and save to DB
      const url = `${import.meta.env.VITE_RAPIDAPI_URL}?type=movie&genre=Action&rows=25&sortOrder=ASC&sortField=id`;
      const response = await fetch(url, {
        headers: {
          "x-rapidapi-key": import.meta.env.VITE_RAPIDAPI_KEY,
          "x-rapidapi-host": import.meta.env.VITE_RAPIDAPI_HOST,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch movies");
      }

      const data = await response.json();

      // Filter for action movies with complete data
      const actionMovies = data.results?.filter((movie: any) =>
        movie.primaryTitle &&
        movie.description &&
        movie.startYear &&
        (movie.countriesOfOrigin?.includes("US") ||
         movie.averageRating > 4.0 ||
         movie.numVotes > 100)
      ) || [];

      const mapped: Movie[] = actionMovies.map((m: any, index: number) => ({
        id: m.id || String(index + 1),
        imdb_id: m.id,
        title: m.primaryTitle || "Unknown",
        year: Number(m.startYear) || new Date().getFullYear(),
        genre: Array.isArray(m.genres) ? m.genres.join(", ") : "Action",
        director: "Unknown",
        rating: Number(m.averageRating) || 0,
        plot: m.description || "",
        poster: m.primaryImage,
        timestamp: Date.now(),
      }));

      // Save movies to DynamoDB
      for (const movie of mapped) {
        await client.models.Movie.create({
          imdb_id: movie.imdb_id,
          title: movie.title,
          year: movie.year,
          genre: movie.genre,
          director: movie.director,
          rating: movie.rating,
          plot: movie.plot,
          poster: movie.poster,
          timestamp: new Date(movie.timestamp).toISOString(),
        } as any);
      }

      setMovies(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch movies");
      // Fallback to sample data if API fails
      setMovies(sampleMovies);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <div className="loading">Loading movies...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <h3>Error loading movies</h3>
        <p>{error}</p>
        <button className="refresh-button" onClick={fetchMovies}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="movie-dashboard">
      <div className="dashboard-header">
        <h2 style={{ color: "white", marginBottom: "10px" }}>
          Movie Dashboard
        </h2>
        <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: "20px" }}>
          Showing {movies.length} action movies from DynamoDB
        </p>
        <button className="refresh-button" onClick={fetchMovies}>
          Refresh
        </button>
      </div>

      <div className="movie-grid">
        {movies.map((movie) => (
          <div key={movie.id} className="movie-card">
            <div className="movie-title">{movie.title}</div>
            <div className="movie-details">
              <p>
                <strong>Year:</strong> {movie.year}
              </p>
              <p>
                <strong>Genre:</strong> {movie.genre}
              </p>
              <p>
                <strong>Director:</strong> {movie.director}
              </p>
              <p>
                <strong>Plot:</strong> {movie.plot}
              </p>
              <p>
                <strong>Added:</strong> {formatTimestamp(movie.timestamp)}
              </p>
            </div>
            <div className="movie-rating">⭐ {movie.rating}/10</div>
          </div>
        ))}
      </div>

      {movies.length === 0 && (
        <div style={{ textAlign: "center", color: "white", marginTop: "50px" }}>
          <h3>No movies found</h3>
          <p>Start by adding some movies to your collection!</p>
        </div>
      )}
    </div>
  );
};

export default MovieDashboard;
