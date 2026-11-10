import { createApp } from "./app.mjs";
const { server, db } = createApp();
server.listen(Number(process.env.PORT || 3001), "127.0.0.1", () =>
  console.log(`Roshan Rozgar: http://127.0.0.1:${process.env.PORT || 3001}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
