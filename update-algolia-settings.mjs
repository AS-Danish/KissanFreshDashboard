import "dotenv/config";
import algoliasearch from "algoliasearch";

const client = algoliasearch(
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID, 
    process.env.NEXT_PUBLIC_ALGOLIA_ADMIN_API_KEY
);
const index = client.initIndex("products");

index.setSettings({
  searchableAttributes: [
    'name',
    'description',
    'category',
    'tags'
  ],
  attributesForFaceting: [
    'category',
    'productOrigin',
    'tags'
  ],
  customRanking: [
    'desc(inStock)'
  ]
}).then(() => {
  console.log('Algolia settings successfully updated!');
  process.exit(0);
}).catch(err => {
  console.error('Error updating settings:', err);
  process.exit(1);
});
