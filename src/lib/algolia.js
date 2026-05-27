import { liteClient as algoliasearch } from 'algoliasearch/lite';

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || '';
const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || '';

// Initialize only if keys are present to prevent crashes
export const searchClient = appId && searchKey ? algoliasearch(appId, searchKey) : null;

/**
 * Perform a search on an Algolia index
 * @param {string} indexName - The name of the Algolia index (e.g., 'products', 'orders')
 * @param {string} query - The search query
 * @param {object} options - Additional Algolia search parameters
 * @returns {Promise<Array>} - Resolves to an array of hits
 */
export const performSearch = async (indexName, query, options = {}) => {
  if (!searchClient) {
    console.warn("Algolia is not configured. Returning empty search results.");
    return [];
  }

  try {
    const { results } = await searchClient.search([{
        indexName,
        query,
        ...options
    }]);
    
    // results[0] contains the matching documents and pagination info
    return {
        hits: results[0]?.hits || [],
        nbPages: results[0]?.nbPages || 1,
        nbHits: results[0]?.nbHits || 0
    };
  } catch (error) {
    console.error("Algolia search error:", error);
    return { hits: [], nbPages: 1, nbHits: 0 };
  }
};
