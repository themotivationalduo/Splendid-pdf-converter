import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Helper to get ConvertAPI production secret from any possible environment variable name
export function getConvertApiSecret(): string {
  const secret = (
    process.env.CONVERT_API_PRODUCTION_SECRET ||
    process.env.CONVERT_API_SECRET ||
    process.env.CONVERTAPI_SECRET ||
    process.env.CONVERT_API_TOKEN ||
    process.env.CONVERTAPI_TOKEN ||
    process.env.CONVERT_API_KEY ||
    process.env.CONVERTAPI_KEY ||
    process.env.VITE_CONVERT_API_PRODUCTION_SECRET ||
    process.env.VITE_CONVERT_API_SECRET ||
    process.env.VITE_CONVERTAPI_SECRET ||
    process.env.VITE_CONVERT_API_TOKEN ||
    process.env.VITE_CONVERTAPI_TOKEN ||
    process.env.VITE_CONVERT_API_KEY ||
    process.env.VITE_CONVERTAPI_KEY ||
    ""
  ).trim();

  return secret;
}

// Body parser setup with 50mb limit for large files
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// CORS support
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Configuration checking handler (handles both /api/config and /config for Vercel rewrites)
const configHandler = (req: express.Request, res: express.Response) => {
  const secret = getConvertApiSecret();
  const hasToken = secret.length > 0;

  res.json({
    hasProductionToken: hasToken,
    hasSandboxToken: false,
    mode: hasToken ? "production" : "local",
    configured: hasToken
  });
};

app.get("/api/config", configHandler);
app.get("/config", configHandler);

// ConvertAPI proxy conversion handler (handles both /api/convert and /convert for Vercel)
const convertHandler = async (req: express.Request, res: express.Response) => {
  try {
    const { fileName, fileData, from, to } = req.body || {};

    if (!fileName || !fileData || !from || !to) {
      return res.status(400).json({ error: "Missing required fields (fileName, fileData, from, to)" });
    }

    const secret = getConvertApiSecret();

    if (!secret) {
      return res.status(400).json({ 
        error: "ConvertAPI production token is not configured in Vercel environment variables. Please add CONVERT_API_PRODUCTION_SECRET or CONVERT_API_SECRET in your Vercel Project Settings > Environment Variables." 
      });
    }

    const convertApiUrl = `https://v2.convertapi.com/convert/${from.toLowerCase()}/to/${to.toLowerCase()}?Secret=${encodeURIComponent(secret)}`;
    
    const response = await fetch(convertApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        Parameters: [
          {
            Name: "File",
            FileValue: {
              Name: fileName,
              Data: fileData
            }
          },
          {
            Name: "StoreFile",
            Value: false
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("ConvertAPI error response:", errText);
      let errorMsg = "Conversion failed on ConvertAPI servers";
      try {
        const errJson = JSON.parse(errText);
        errorMsg = errJson.Message || errorMsg;
      } catch (_) {}
      return res.status(response.status).json({ error: errorMsg });
    }

    const data: any = await response.json();
    if (!data.Files || data.Files.length === 0) {
      return res.status(500).json({ error: "No files returned from ConvertAPI" });
    }

    const resultFile = data.Files[0];
    return res.json({
      success: true,
      fileName: resultFile.FileName,
      fileData: resultFile.FileData, // Base64 converted file
      fileSize: resultFile.FileSize
    });

  } catch (error: any) {
    console.error("Server API conversion error:", error);
    return res.status(500).json({ error: error.message || "An unexpected error occurred during conversion" });
  }
};

app.post("/api/convert", convertHandler);
app.post("/convert", convertHandler);

export default app;
