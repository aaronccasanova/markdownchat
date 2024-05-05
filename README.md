# markdownchat

A tool for facilitating markdown chat conversations with Large Language Models.

![Example `markdownchat` conversation](./markdownchat.gif)

## Quick start

1. Add an `OPENAI_API_KEY` to the current environment.

```sh
export OPENAI_API_KEY=<api-key>
```

2. Initialize a `markdownchat` file in the current directory.

```sh
npx markdownchat
```

3. Add a chat message to the end of the created `markdownchat.md` file.
4. Re-run the tool to stream responses back to the `markdownchat` file.

```sh
npx markdownchat
```

That's it! You can continue the `markdownchat` conversation by repeating steps 3 and 4.

**Important**: Keep in mind the cost increases the longer the conversation becomes. It's recommended to rename the file to save the conversation and [start a new `markdownchat`](#quick-start)!

## Usage

```
Usage
  $ npx markdownchat [markdownchat-file] [options]

Options
  -h, --help         Show help text
  -m, --model        Name of model (default: "gpt-3.5-turbo")
  -t, --temperature  Temperature of model (default: 0.5)
  --env-file         Path to .env file

Examples
  $ npx markdownchat
  $ npx markdownchat ./markdownchat.md
  $ npx markdownchat ./markdownchat.md --model gpt-4.5-turbo
```

## Environment Variables

- `OPENAI_API_KEY`: API key for OpenAI API
- `OPENAI_BASE_URL`: Base URL for OpenAI API (default: "https://api.openai.com/v1")

These environment variables can be set in a few ways:

- Exporting in the current shell.

```sh
export OPENAI_API_KEY=<api-key>
npx markdownchat
```

- Inlining before the `npx markdownchat` command.

```sh
OPENAI_API_KEY=<api-key> npx markdownchat
```

- Using an `.env` file.

```sh
npx markdownchat --env-file .env
```

## Contributing

Contributions are welcome. Please submit a pull request or create an issue to discuss the changes you want to make.
