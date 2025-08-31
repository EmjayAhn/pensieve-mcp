# Pensieve MCP Server

A MCP (Model Context Protocol) server that enables conversation history sharing between ChatGPT and Claude with multi-user support and cloud deployment.

## Features

- **Multi-user Support**: Each user has their own isolated conversation space
- **Authentication**: Secure JWT-based authentication
- **Cloud Deployment**: Deploy to Azure Container Apps
- **Save Conversations**: Store conversation history securely
- **Load Conversations**: Retrieve saved conversations by ID
- **List Conversations**: View all saved conversations
- **Search Conversations**: Search conversation content by keywords
- **Append to Conversations**: Add new messages to existing conversations

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pensieve-mcp
```

2. Install dependencies:
```bash
uv pip install -e .
```

## Usage in Claude

1. Open Claude Desktop configuration file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the following configuration:
```json
{
  "mcpServers": {
    "pensieve-mcp": {
      "command": "uv",
      "args": ["run", "python", "-m", "mcp_server.server"],
      "cwd": "/path/to/pensieve-mcp"
    }
  }
}
```

3. Restart Claude Desktop

## Usage Examples

### Save Conversation
Use the `save_conversation` tool to save the current conversation.
You can add metadata like title or tags.

### Load Conversation
Use the `load_conversation` tool to retrieve a previous conversation by its ID.

### Search Conversations
Use the `search_conversations` tool to find conversations containing specific keywords.

## Architecture

### Local Mode
Conversation data is stored as JSON files in the `~/.pensieve-mcp/conversations/` directory.

### Cloud Mode (Azure)
- **API Server**: FastAPI backend deployed on Azure Container Apps
- **Database**: Azure Cosmos DB (MongoDB API)
- **Authentication**: JWT-based user authentication
- **MCP Client**: Connects to the cloud API

## Azure Deployment

1. Prerequisites:
   - Azure CLI installed and logged in
   - Docker installed

2. Deploy to Azure:
   ```bash
   cd deploy
   ./deploy-azure.sh
   ```

3. Configure MCP client:
   Set the API URL in your environment:
   ```bash
   export PENSIEVE_API_URL="https://your-api-url.azurecontainerapps.io"
   ```

## Using with Authentication

1. Register a new account:
   ```
   Use the 'register' tool with your email and password
   ```

2. Login:
   ```
   Use the 'login' tool with your credentials
   ```

3. Your token will be automatically saved for subsequent requests.