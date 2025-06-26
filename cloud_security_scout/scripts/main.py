import os
import requests
from dotenv import load_dotenv

def fetch_trending_tamil_movies():
    load_dotenv('frontend/y/.env')

    api_key = os.getenv('RAPID_API_KEY')
    if not api_key:
        print("Error: RAPID_API_KEY not found in .env file")
        return None

    url = "https://imdb236.p.rapidapi.com/api/imdb/india/trending-tamil"
    headers = {
        'x-rapidapi-host': 'imdb236.p.rapidapi.com',
        'x-rapidapi-key': api_key
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        return None

def main():
    print("Fetching trending Tamil movies...")
    movies = fetch_trending_tamil_movies()

    if movies:
        print(f"Found {len(movies)} trending movies:")
        for i, movie in enumerate(movies[:5], 1):
            print(f"{i}. {movie['primaryTitle']} ({movie['startYear']})")
            print(f"   Rating: {movie['averageRating']}/10")
            print(f"   Genres: {', '.join(movie['genres'])}")
            print()
    else:
        print("Failed to fetch movie data")

if __name__ == "__main__":
    main()
