import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/*== MOVIE SCHEMA =========================================================
The section below creates a Movie database table for the movie dashboard.
The authorization rule below specifies that any unauthenticated user can
"create", "read", "update", and "delete" any "Movie" records.
=========================================================================*/
const schema = a.schema({
  Movie: a
    .model({
      imdb_id: a.string(),
      title: a.string().required(),
      year: a.integer(),
      genre: a.string(),
      director: a.string(),
      rating: a.float(),
      plot: a.string(),
      poster: a.string(),
      timestamp: a.timestamp().required(),
    })
    .authorization((allow) => [allow.guest()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "identityPool",
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
