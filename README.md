# wedding-planner

## Packing suggestions API (Render)

This repo includes a minimal Express API in `server.js` for AI-powered packing suggestions.

### Environment variables

Set the following in your Render service:

- `OPENAI_API_KEY`: required for OpenAI requests.

### Deploy on Render

1. Create a new **Web Service** on Render and connect this repo.
2. Use the **Build Command**: `npm install`
3. Use the **Start Command**: `npm start`
4. Add the `OPENAI_API_KEY` environment variable.
5. After deploy, copy your service URL and set it in localStorage:

```js
localStorage.setItem("wp_aiEndpoint", "https://your-render-service.onrender.com");
```

The frontend will call `POST /api/packing-suggestions` on that endpoint.
