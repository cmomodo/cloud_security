export const securityScoutTableSchema = {
  tableName: "security-scout-table",
  partitionKey: { name: "id", type: "STRING" },
  sortKey: { name: "timestamp", type: "NUMBER" },
  timeToLiveAttribute: "expiresAt",
  globalSecondaryIndexes: [
    {
      indexName: "ImdbIdIndex",
      partitionKey: { name: "imdb_id", type: "STRING" },
    },
    { indexName: "YearIndex", partitionKey: { name: "year", type: "NUMBER" } },
    {
      indexName: "GenreIndex",
      partitionKey: { name: "genre", type: "STRING" },
    },
    {
      indexName: "DirectorIndex",
      partitionKey: { name: "director", type: "STRING" },
    },
  ],
};
