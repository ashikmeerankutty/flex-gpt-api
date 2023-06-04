import express from "express";
import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
import { getPineConeIndex } from "./helpers/pincecone";
import cors from "cors";
import { taskRouterData } from "./constants/trainCode";
import { quickActions, quickActionsInfo } from "./constants/quickActions";

const newLine = "\n\n-----\n\n";

const PORT = process.env.PORT || 3030;

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openAIClient = new OpenAIApi(configuration);

const app = express();

app.use(cors());

app.use(express.urlencoded({ extended: true }));

app.use(express.json());

app.post("/query", async (req, res) => {
  const query = req.body.query;

  if (!query) {
    res.status(400).end();
  }

  try {
    const pineConeIndex = await getPineConeIndex();

    const embeddings = await openAIClient.createEmbedding({
      input: query,
      model: "text-embedding-ada-002",
    });

    // @ts-ignore
    const xq = embeddings.data.data[0].embedding;

    const resp = await pineConeIndex.query({
      queryRequest: {
        topK: 5,
        includeMetadata: true,
        vector: xq,
      },
    });

    // @ts-ignore
    const matches = resp.matches?.map(
      // @ts-ignore
      (match) => match.metadata?.["text"] || ""
    );

    const augmentedQuery =
      matches?.join("\n\n---\n\n") + newLine + taskRouterData + newLine + query;

    const primer = `You are Q&A bot. A highly intelligent system that answers user questions based on the information provided by the user above each question. If the information can not be found in the information provided by the user you truthfully say "I don't know". The answer should be complete and should have all the information explained well and assume that the answer is forwarded to someone who has no context about the question`;

    const response = await openAIClient.createChatCompletion({
      model: "gpt-4",
      messages: [
        { role: "system", content: primer },
        { role: "user", content: augmentedQuery },
      ],
    });

    res.send(response.data.choices);
  } catch (error) {
    // @ts-ignore
    console.log(error?.response?.data);
    // console.error("Error retrieving voice data:", error);
    res.status(500).end();
  }
});

app.post("/checkQuickAction", async (req, res) => {
  const code = req.body.code;

  if (!Array.isArray(code) || code.length <= 0) {
    res.send({});
  }

  const primer = `Return only the matched function name without any other test if the following code is is related to any functions in this list otherwise return failed: ${quickActions.join(
    ","
  )}`;

  const response = await openAIClient.createChatCompletion({
    model: "gpt-4",
    messages: [
      { role: "system", content: primer },
      { role: "user", content: code[0] },
    ],
  });

  const matchedMethod =
    response.data.choices[0].message?.content.split(",")?.[0];

  if (
    !matchedMethod ||
    matchedMethod === "Failed" ||
    // @ts-ignore
    !quickActionsInfo[matchedMethod]
  ) {
    res.send({});
    return;
  }

  // @ts-ignore
  const fields = quickActionsInfo[matchedMethod]?.fields;

  res.send({
    fields,
    matchedMethod: matchedMethod,
  });
});

app.post("/runQuickAction", async (req, res) => {
  const action = req.body.action;
  const fields = req.body.fields;

  console.log(action);

  // @ts-ignore
  const actionMethod = quickActionsInfo[action].action;

  if (!actionMethod) {
    res.status(400).send({
      status: "Action does not exist",
    });
  }

  const actionData = await actionMethod(fields);

  res.send({
    response: actionData,
  });
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
