import { attachKitchenNet, writeNetInfo } from "./kk-net-server.mjs";

export function kkNetPlugin() {
  return {
    name: "kitchen-kombat-net",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "").split("?")[0];
        if (path === "/api/net/info") {
          const port = server.config.server.port || 8080;
          writeNetInfo(res, port);
          return;
        }
        next();
      });
      return () => {
        attachKitchenNet(server.httpServer);
      };
    },
  };
}
