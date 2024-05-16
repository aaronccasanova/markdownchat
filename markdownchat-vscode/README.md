# markdownchat

A tool for facilitating markdown chat conversations with Large Language Models.

![Example `markdownchat` conversation](https://raw.githubusercontent.com/aaronccasanova/markdownchat/main/markdownchat.gif)

## Quick start

To get started with `markdownchat`, follow these steps:

- Create a new `markdownchat` file by either:
  - Using the command palette: Type `New markdownchat file`.
  - Using the keybinding: Press `cmd+k cmd+n` (macOS) or `ctrl+k ctrl+n` (Windows/Linux).
- Add a chat message to the end of the created `markdownchat` file.
- Run `markdownchat` to stream responses back to the `markdownchat` file. You can do this by either:
  - Using the command palette: Type `Run markdownchat`.
  - Using the keybinding: Press `cmd+k cmd+m` (macOS) or `ctrl+k ctrl+m`.
- The first run will prompt you for an OpenAI API Key and store it with VS Code's SecretStorage.

That's it! You can continue the conversation by adding more chat messages and running `markdownchat`.

> **Important**: Keep in mind that the cost increases as the conversation becomes longer.

## Extension Settings

This extension contributes the following settings:

- `markdownchat.openaiBaseURL`: Base URL for OpenAI API (default: `https://api.openai.com/v1`)
- `markdownchat.model`: Model for OpenAI API (default: `gpt-3.5-turbo`)
- `markdownchat.temperature`: Temperature for OpenAI API (default: `0.5`)
