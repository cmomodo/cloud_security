import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

interface MovieDashboardProps {
  client: ReturnType<typeof generateClient<Schema>>;
}

interface Movie {
  id: string;
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
      id: '1',
      title: 'The Matrix',
      year: 1999,
      genre: 'Sci-Fi',
      director: 'The Wachowskis',
      rating: 8.7,
      plot: 'A computer programmer discovers reality as he knows it is a simulation.',
      timestamp: Date.now() - 1000000
    },
    {
      id: '2',
      title: 'Inception',
      year: 2010,
      genre: 'Sci-Fi',
      director: 'Christopher Nolan',
      rating: 8.8,
      plot: 'A thief who steals corporate secrets through dream-sharing technology.',
      timestamp: Date.now() - 2000000
    },
    {
      id: '3',
      title: 'The Dark Knight',
      year: 2008,
      genre: 'Action',
      director: 'Christopher Nolan',
      rating: 9.0,
      plot: 'Batman faces his greatest psychological and physical tests.',
      timestamp: Date.now() - 3000000
    },
    {
      id: '4',
      title: 'Pulp Fiction',
      year: 1994,
      genre: 'Crime',
      director: 'Quentin Tarantino',
      rating: 8.9,
      plot: 'The lives of two mob hitmen, a boxer, and others intertwine.',
      timestamp: Date.now() - 4000000
    },
    {
      id: '5',
      title: 'The Shawshank Redemption',
      year: 1994,
      genre: 'Drama',
      director: 'Frank Darabont',
      rating: 9.3,
      plot: 'Two imprisoned men bond over years, finding solace and redemption.',
      timestamp: Date.now() - 5000000
    },
    {
      id: '6',
      title: 'Forrest Gump',
      year: 1994,
      genre: 'Drama',
      director: 'Robert Zemeckis',
      rating: 8.8,
      plot: 'A man with low IQ accomplishes great things and influences others.',
      timestamp: Date.now() - 6000000
    }
  ];

  const fetchMovies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For now, we'll use sample data
      // In a real implementation, you would fetch from your API or DynamoDB
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Sort by timestamp (newest first)
      const sortedMovies = [...sampleMovies].sort((a, b) => b.timestamp - a.timestamp);
      setMovies(sortedMovies);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch movies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
        <h2 style={{ color: 'white', marginBottom: '10px' }}>Latest Movies</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '20px' }}>
          Showing {movies.length} movies
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
              <p><strong>Year:</strong> {movie.year}</p>
              <p><strong>Genre:</strong> {movie.genre}</p>
              <p><strong>Director:</strong> {movie.director}</p>
              <p><strong>Plot:</strong> {movie.plot}</p>
              <p><strong>Added:</strong> {formatTimestamp(movie.timestamp)}</p>
            </div>
            <div className="movie-rating">
              ⭐ {movie.rating}/10
            </div>
          </div>
        ))}
      </div>
      
      {movies.length === 0 && (
        <div style={{ textAlign: 'center', color: 'white', marginTop: '50px' }}>
          <h3>No movies found</h3>
          <p>Start by adding some movies to your collection!</p>
        </div>
      )}
    </div>
  );
};

export default MovieDashboard;