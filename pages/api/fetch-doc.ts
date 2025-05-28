import { google } from "googleapis";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Session } from "next-auth"; // <-- NEW import

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = (await getServerSession(req, res, authOptions)) as Session & {
    accessToken: string;
  };

  if (!session || !session.accessToken) {
    console.error("Unauthorized: Missing session or accessToken");
    return res
      .status(401)
      .json({ error: "Unauthorized: No session or access token" });
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({
    access_token: session.accessToken
  });

  const docs = google.docs({ version: "v1", auth });

  try {
    const documentId = req.query.docId as string;
    const response = await docs.documents.get({ documentId });

    const content = response.data.body?.content || [];

    const paragraphs = content
      .map((item) => {
        if (!item.paragraph) return null;

        const text = item.paragraph.elements
          ?.map((el) => el.textRun?.content)
          .join("");
        const style = item.paragraph.paragraphStyle?.namedStyleType;

        // If it's a heading, prefix it with the heading level
        if (style?.startsWith("HEADING_")) {
          const level = style.replace("HEADING_", "");
          return `heading ${level}: ${text}`;
        }

        return text;
      })
      .filter(Boolean)
      .map((p) => p?.trim())
      .filter((p) => p && p.length > 1);

    console.log("Processed paragraphs:", paragraphs);
    res.status(200).json({ paragraphs });
  } catch (error: any) {
    console.error("Error fetching document:", error.message);
    res.status(500).json({ error: "Failed to fetch document" });
  }
}
