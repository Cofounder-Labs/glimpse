# Glimpse
Show or tell Glimpse what product walkthrough video you want and watch it create that end to end 

## Why Glimpse?
[![Watch the video](https://img.youtube.com/vi/V4LnzFZARp4/maxresdefault.jpg)](https://youtu.be/V4LnzFZARp4)

## Demo

### Workflow (Show) to Product Walkthrough Video
[![Watch the video](https://img.youtube.com/vi/EFX6gkYnb04/maxresdefault.jpg)](https://youtu.be/EFX6gkYnb04)


### Prompt (Tell) to Product Walkthrough Video
[![Watch the video](https://img.youtube.com/vi/dxZWZnV7eos/maxresdefault.jpg)](https://youtu.be/dxZWZnV7eos)

## Setup

This project uses Poetry for dependency management. Make sure you have Python 3.11 installed.

1. Install Poetry (if not already installed):
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

2. Clone the repository and navigate to the project directory:
```bash
git clone <repository-url>
cd glimpse
```

3. Install dependencies:
```bash
poetry install
```

4. Set up environment variables:
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Open the `.env` file and fill in your API keys and any other required configuration values.

5. **Set up Workflow-Use integration (optional):**
   ```bash
   python setup_workflow_use.py
   ```
   
   This adds deterministic browser workflow automation capabilities. See [WORKFLOW_USE.md](WORKFLOW_USE.md) for detailed features and usage.

## Authentication Setup (Optional but Recommended)

If you want the agent to have access to your login sessions (e.g., GitHub, Google, etc.), you can set up authentication:

1. **Run the authentication setup script:**
   ```bash
   poetry run python setup_auth.py
   ```

2. **Login to your services:**
   - The script will launch Chrome and guide you through the authentication process
   - Login to any services you want the agent to have access to (GitHub, Google, etc.)
   - Your authentication data will be automatically saved

3. **Authentication is ready:**
   - The agent will automatically use your saved authentication for all demo generation
   - You only need to do this setup once

**What this does:**
- Creates an `auth_storage/` directory in the project root (ignored by git)
- Saves your browser authentication state in a secure format
- The agent will automatically use this authentication for all browser sessions

**Note:** The authentication data is automatically added to `.gitignore` so your login sessions won't be committed to version control.

## Running the Server

### Normal Mode
To run the server in normal mode:
```bash
poetry run python glimpse/run.py
```

The API will be available at http://localhost:8000
API documentation can be accessed at http://localhost:8000/docs

### Mock Mode
To run the server in mock mode (returns predefined responses):
```bash
MOCK_MODE=true poetry run python glimpse/run.py
```

In mock mode, the server will:
- Ignore actual demo request from the user
- Simulate the demo generation process 

## API Endpoints

### Generate Demo
- **Endpoint:** POST /generate-demo
- **Payload:**
```json
{
    "nl_task": "Your natural language task description",
    "root_url": "https://example.com"
}
```

### Check Demo Status
- **Endpoint:** GET /demo-status/{job_id}
- **Response:** Returns the current status and progress of the demo generation

## Development

The mock responses are stored in `glimpse/mocks/`:
- `generate_demo.json`: Mock response for demo generation
- `demo_status.json`: Mock response for status checking

To modify mock responses, edit the corresponding JSON files in the mocks directory.
