import React from "react";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import MovieDashboard from "./components/MovieDashboard";
import "./App.css";

// Configure Amplify
import config from "../amplify_outputs.json";
Amplify.configure(config);

// Generate the data client
const client = generateClient<Schema>();

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Cloud Security Scout - Movie Dashboard</h1>
      </header>
      <main>
        <MovieDashboard client={client} />
      </main>
    </div>
  );
}

export default App;
