export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Please use POST." });
  }

  try {
    const { fileName, fileData, from, to } = req.body || {};

    if (!fileName || !fileData || !from || !to) {
      return res.status(400).json({ error: "Missing required fields (fileName, fileData, from, to)" });
    }

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

    if (!secret) {
      return res.status(400).json({
        error: "ConvertAPI production token is not configured in Vercel. Please add CONVERT_API_PRODUCTION_SECRET or CONVERT_API_SECRET to your Vercel Project Settings > Environment Variables."
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
      console.error("ConvertAPI error response from Vercel endpoint:", errText);
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
    return res.status(200).json({
      success: true,
      fileName: resultFile.FileName,
      fileData: resultFile.FileData,
      fileSize: resultFile.FileSize
    });

  } catch (error: any) {
    console.error("Vercel convert handler error:", error);
    return res.status(500).json({ error: error.message || "An unexpected error occurred during conversion" });
  }
}
