import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import { getPriceData, getProgram, logResponse } from "@/utils/monaco";

// Run job every 10 minutes
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      console.log("Running cron job to update price data");
      const client = await clientPromise;
      const markets = client.db("pascal").collection("markets");
      // Extract the value of the publicKey field from each of the documents
      const documents = await markets.find({}).toArray();
      const pubKeys = documents.map((doc) => doc.publicKey);
      console.log(pubKeys);

      const program = getProgram();
      console.log("Program", program);
      for (const pubKey of pubKeys) {
        const priceData = await getPriceData(program, pubKey);
        const {
          marketPriceSummary,
          marketOutcomesSummary,
          liquidityTotal,
          matchedTotal,
          totalUnmatchedOrders,
        } = priceData;

        await markets.updateOne(
          { publicKey: pubKey },
          {
            $set: {
              marketPriceSummary: marketPriceSummary,
              liquidityTotal: liquidityTotal,
              matchedTotal: matchedTotal,
              totalUnmatchedOrders: totalUnmatchedOrders,
              prices: marketPriceSummary,
              outcomes: marketOutcomesSummary,
            },
          }
        );
      }
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("Cron job price data update error");
      res.status(500).json({ statusCode: 500, message: err.message });
    }
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
}
