import dotenv from "dotenv";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

dotenv.config();

const azureSubscriptionKey = process.env.AZURE_SUBSCRIPTION_KEY || "";
const azureRegion = process.env.AZURE_REGION || "";

export const transcribeText = (voiceData: ArrayBuffer): Promise<string> => {
  const pushStream = sdk.AudioInputStream.createPushStream();
  pushStream.write(voiceData);

  const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    azureSubscriptionKey,
    azureRegion
  );

  speechConfig.speechRecognitionLanguage = "en-US";

  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
  return new Promise((resolve, reject) => {
    recognizer.recognizeOnceAsync(
      function (result) {
        recognizer.close();
        resolve(result.text);
      },
      function (err) {
        console.error("Error - " + err);
        recognizer.close();
        reject(err);
      }
    );
  });
};
