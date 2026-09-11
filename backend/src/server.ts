import express from "express";
import cors from "cors";
import { env } from "./config/env";
import authRoutes from "./routes/authRoutes";

const app = express();

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "trimidal-pos-backend" });
});

app.use("/api/auth", authRoutes);

app.listen(env.port, () => {
  console.log(`Trimidal POS API listening on http://localhost:${env.port}`);
});
