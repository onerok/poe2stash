import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();
const configPath = path.resolve(__dirname, "config.json");

// Route to save file path
router.post("/chat", (req, res) => {
  const { filePath } = req.body;

  if (!filePath || !fs.existsSync(filePath)) {
    res.status(400).send("Invalid file path");
    return;
  }

  const config = fs.existsSync(configPath) ? require(configPath) : {};
  config.chatPath = filePath;

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  res.send("Chat path saved");
});

// Route to parse chat offers
router.get("/chat/offers", (_req, res) => {
  const config = require(configPath);

  if (!config.chatPath || !fs.existsSync(config.chatPath)) {
    res.status(400).send("Chat file path not defined or does not exist");
    return;
  }

  const chatFileContent = fs.readFileSync(config.chatPath, "utf-8");
  const messages = parseMessages(chatFileContent);
  res.json(messages);
});

// Function to parse messages
function parseMessages(content: string) {
  const offerRegex =
    /@From .+: Hi, I would like to buy your (.+) listed for ([\d.]+ .+) in .+? (?:stash tab "(.+?)"; position: left (\d+), top (\d+))/;
  const messages = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(offerRegex);
    if (match) {
      messages.push({
        message: line,
        item: {
          name: match[1],
          price: match[2],
          stashTab: match[3],
          position: {
            left: parseInt(match[4], 10),
            top: parseInt(match[5], 10),
          },
        },
      });
    }
  }

  return messages;
}

// Export the router
export default router;
