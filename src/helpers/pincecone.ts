import { PineconeClient } from "@pinecone-database/pinecone";

const indexName = "gpt-4-langchain-docs";

console.log()

export const getPineConeIndex = async () => {
  const pinecone = new PineconeClient();
  await pinecone.init({
    apiKey: process.env.PINECONE_API_KEY || "",
    environment: process.env.PINECONE_ENVIRONMENT || "",
  });

 const index = await pinecone.listIndexes();

 console.log(index);

  return pinecone.Index(indexName);
};
