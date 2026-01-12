/** Query template to fetch full player documents by their _ids */
export const playersByIdsQuery = function (playerIds: string[]) {
  return {
    query: {
      bool: {
        must: [
          {
            term: {
              sample_name: {
                value: `all`,
              },
            },
          },
          {
            ids: {
              values: playerIds,
            },
          },
        ],
      },
    },
    // Return full _source for complete player data
    _source: true,
  };
};
