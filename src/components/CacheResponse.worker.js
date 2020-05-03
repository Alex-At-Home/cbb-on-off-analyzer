import { ClientRequestCache } from '../utils/ClientRequestCache';

console.log("Starting CacheResponseWorker");

self.addEventListener("message", (event) => {
  /**/
  console.log("?GET MESSAGE " + JSON.stringify(event.data));
});
