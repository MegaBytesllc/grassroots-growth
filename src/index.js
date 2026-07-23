import { handleContact } from "./contact.js";

// Static files in public/ are served by the assets binding before this Worker runs.
// Anything without a matching asset falls through to here.
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/contact") {
      return handleContact(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
