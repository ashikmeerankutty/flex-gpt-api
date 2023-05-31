import express from "express";
import axios from "axios";
import { transcribeText } from "./helpers/speech";

const app = express();

app.use(express.urlencoded({ extended: true }));

app.use(express.json());

app.post("/webhook", async (req, res) => {
  const recordingUrl = req.body.RecordingUrl;

  if (!recordingUrl) {
    res.status(400).end();
  }

  try {
    const response = await axios.get(recordingUrl, {
      responseType: "arraybuffer",
    });

    const voiceData = response.data;
    const transcribedText = await transcribeText(voiceData);

    res.send({
      transcribedText,
    });
  } catch (error) {
    console.error("Error retrieving voice data:", error);
    res.status(500).end();
  }
});

app.listen(3000, () => {
  console.log("Server is listening on port 3000");
});
