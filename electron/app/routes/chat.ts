import { Router } from "express";
import fs from "fs";
import path from "path";

export const chatRouter = Router();
const configPath = path.resolve("config.json");

function loadConfig() {
  return fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath).toString())
    : {};
}

function updateConfig(newConfig: Record<string, any>) {
  const config = loadConfig();
  fs.writeFileSync(
    configPath,
    JSON.stringify({ ...config, ...newConfig }, null, 2),
  );
}

// Route to save file path
chatRouter.post("/", (req, res) => {
  const { filePath } = req.body;

  if (!filePath || !fs.existsSync(filePath)) {
    res.status(400).send("Invalid file path");
    return;
  }

  const config = loadConfig();
  config.chatPath = filePath;

  updateConfig(config);
  res.send("Chat path saved");
});

// Route to parse chat offers
chatRouter.get("/offers", (_req, res) => {
  const config = loadConfig();

  if (!config.chatPath || !fs.existsSync(config.chatPath)) {
    res.status(400).send("Chat file path not defined or does not exist");
    return;
  }

  const chatFileContent = fs.readFileSync(config.chatPath, "utf-8");
  const messages = parseMessages(chatFileContent);
  res.json(messages);
});

// Function to parse messages
export function parseMessages(content: string) {
  const offerRegex =
    /(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}) \d+ [a-f0-9]+ \[INFO Client \d+\] @From (.+?): Hi, I would like to buy your (.+) listed for ([\d.]+ .+) in .*(?:stash tab "(.+?)"; position: left (\d+), top (\d+))/g;
  const messages = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const match = offerRegex.exec(line);
    console.log({ match });
    if (match) {
      const [
        _,
        timestamp,
        characterName,
        itemName,
        price,
        stashTab,
        left,
        top,
      ] = match;
      messages.unshift({
        message: line,
        timestamp,
        characterName,
        item: {
          name: itemName,
          price,
          stashTab,
          position: {
            left: parseInt(left, 10),
            top: parseInt(top, 10),
          },
        },
      });
    }
  }

  return messages;
}
