import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vercel serves anything in /api as a serverless function, but `vite dev`
// doesn't know about it. This mounts the same handler on the dev server so
// local development needs no extra CLI and exercises the real code path.
function devApi() {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api/jobs', async (req, res) => {
        try {
          const { default: handler } = await server.ssrLoadModule('/api/jobs.js');
          await handler(req, res);
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi()],
});
