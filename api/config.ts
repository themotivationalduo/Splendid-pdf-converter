export default function handler(req: any, res: any) {
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

  const hasToken = secret.length > 0;

  return res.status(200).json({
    hasProductionToken: hasToken,
    hasSandboxToken: false,
    mode: hasToken ? "production" : "local",
    configured: hasToken,
    envDetected: hasToken ? "production_secret" : "none"
  });
}
