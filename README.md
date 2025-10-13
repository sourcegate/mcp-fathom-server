[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/sourcegate-mcp-fathom-server-badge.png)](https://mseep.ai/app/sourcegate-mcp-fathom-server)

# MCP Fathom Server

An MCP (Model Context Protocol) server that integrates with Fathom AI's meeting API, enabling Claude to search and retrieve meeting information through natural language queries.

![MCP](https://img.shields.io/badge/MCP-Compatible-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)

## 🎯 Features

- **🔍 Smart Search**: Natural language search across meeting titles, summaries, transcripts, and action items
- **📋 List Meetings**: Retrieve meetings with various filters (attendees, date ranges, teams, etc.)
- **📝 Transcript Support**: Optionally include full meeting transcripts in search results
- **⚡ Real-time**: Direct integration with Fathom's API for up-to-date meeting data
- **🛡️ Secure**: API key management through environment variables

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- A Fathom AI account with API access
- Claude Desktop app

### Installation

1. **Clone and setup**:
```bash
git clone https://github.com/sourcegate/mcp-fathom-server.git
cd mcp-fathom-server
npm install
npm run build
```

2. **Configure your API key**:
```bash
cp .env.example .env
# Edit .env and add your Fathom API key
```

3. **Get your Fathom API key**:
   - Log in to [Fathom](https://app.fathom.video)
   - Go to Settings → API
   - Generate a new API key
   - Copy it to your `.env` file

4. **Add to Claude Desktop**:

Edit your Claude Desktop configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fathom": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-fathom-server/dist/index.js"],
      "env": {
        "FATHOM_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

5. **Restart Claude Desktop** and you're ready to go! 🎉

## 💬 Usage Examples

Once configured, you can ask Claude natural language questions about your meetings:

```
"Find me meetings about recruiting"
"Show me all external meetings from last week"  
"Search for meetings where we discussed product launches"
"List meetings with john@example.com"
"Find meetings with action items about hiring"
"What did we discuss in our Q1 planning meetings?"
```

Claude will automatically choose the right tool and search method based on your query.

## 🔧 Available Tools

### `list_meetings`
Retrieves meetings with optional filters:
- `calendar_invitees`: Filter by attendee emails
- `calendar_invitees_domains`: Filter by company domains
- `created_after`/`created_before`: Date range filters
- `meeting_type`: all, internal, or external
- `include_transcript`: Include full transcripts
- `recorded_by`: Filter by meeting owner
- `teams`: Filter by team names

### `search_meetings`
Searches meetings by keywords:
- `search_term`: The keyword/phrase to search for
- `include_transcript`: Search within transcripts (slower but more comprehensive)

## 🛠️ Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Test with MCP Inspector
npx @modelcontextprotocol/inspector dist/index.js
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Server won't start** | Check that your API key is correctly set |
| **No results found** | Try broader search terms or check your API key permissions |
| **Rate limiting** | The server handles this automatically - wait a moment and try again |
| **Claude can't find tools** | Ensure Claude Desktop is restarted after config changes |

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 🙋‍♀️ Support

If you encounter any issues:
1. Check the [troubleshooting section](#-troubleshooting)
2. Search existing [GitHub issues](https://github.com/sourcegate/mcp-fathom-server/issues)
3. Create a new issue with detailed information about your problem

---

Built for fun by [@petesena](https://twitter.com/petesena) ❤️