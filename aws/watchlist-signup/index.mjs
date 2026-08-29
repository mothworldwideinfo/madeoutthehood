import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || "watchlist-signups";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return respond(200, {});
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { error: "Invalid JSON body." });
  }

  const { email, watchlist } = payload;

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email)) {
    return respond(400, { error: "A valid email is required." });
  }
  if (!Array.isArray(watchlist) || watchlist.length === 0) {
    return respond(400, { error: "At least one watchlist symbol is required." });
  }

  const cleanWatchlist = watchlist
    .filter(w => w && typeof w.symbol === "string" && typeof w.exchange === "string")
    .map(w => ({
      symbol: w.symbol.toUpperCase().slice(0, 20),
      exchange: String(w.exchange).toUpperCase().slice(0, 20),
      type: w.type === "crypto" ? "crypto" : "stock",
      tvSymbol: `${String(w.exchange).toUpperCase()}:${w.symbol.toUpperCase()}`
    }));

  if (cleanWatchlist.length === 0) {
    return respond(400, { error: "Watchlist entries are malformed." });
  }

  const item = {
    email: email.toLowerCase(),
    watchlist: cleanWatchlist,
    updatedAt: new Date().toISOString(),
    active: true
  };

  try {
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  } catch (err) {
    console.error("DynamoDB write failed", err);
    return respond(500, { error: "Could not save your signup. Try again." });
  }

  return respond(200, { message: "Signed up.", email: item.email, count: cleanWatchlist.length });
};
