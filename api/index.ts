import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Body parser setup with 50mb limit for larger files
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// API route to check if ConvertAPI secrets are configured
app.get("/api/config", (req, res) => {
  res.json({
    hasProductionToken: !!(process.env.CONVERT_API_SECRET || process.env.CONVERT_API_PRODUCTION_SECRET),
    hasSandboxToken: !!process.env.CONVERT_API_SANDBOX_SECRET
  });
});

// ConvertAPI proxy conversion endpoint
app.post("/api/convert", async (req, res) => {
  try {
    const { fileName, fileData, from, to, mode } = req.body;

    if (!fileName || !fileData || !from || !to) {
      return res.status(400).json({ error: "Missing required fields (fileName, fileData, from, to)" });
    }

    let secret = "";
    if (mode === "sandbox") {
      secret = process.env.CONVERT_API_SANDBOX_SECRET || "";
      if (!secret) {
        // Fallback to production secret if sandbox is not explicitly set
        secret = process.env.CONVERT_API_SECRET || process.env.CONVERT_API_PRODUCTION_SECRET || "";
      }
    } else {
      secret = process.env.CONVERT_API_SECRET || process.env.CONVERT_API_PRODUCTION_SECRET || "";
      if (!secret) {
        // Fallback to sandbox if production is not explicitly set
        secret = process.env.CONVERT_API_SANDBOX_SECRET || "";
      }
    }

    if (!secret) {
      return res.status(400).json({ 
        error: "ConvertAPI secret key is not set in environment. Please configure CONVERT_API_PRODUCTION_SECRET or CONVERT_API_SANDBOX_SECRET in your settings/secrets panel." 
      });
    }

    console.log(`Forwarding conversion to ConvertAPI [${mode || "default"}]: ${from} -> ${to} for file: ${fileName}`);

    const convertApiUrl = `https://v2.convertapi.com/convert/${from}/to/${to}`;
    
    const response = await fetch(convertApiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secret}`,
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
    res.json({
      success: true,
      fileName: resultFile.FileName,
      fileData: resultFile.FileData, // Base64 converted file
      fileSize: resultFile.FileSize
    });

  } catch (error: any) {
    console.error("Server API conversion error:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred during conversion" });
  }
});

export default app;
