# glimpse
AI-Assisted Demo Creation via Natural Language and Browser Agent

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

## Browser Profile Setup (Optional but Recommended)

If you want the agent to have access to your login sessions (e.g., GitHub, Google, etc.), you can set up a persistent Chromium profile:

1. **Run the setup script:**
   ```bash
   poetry run python setup_chromium_profile.py
   ```

2. **Login to your services:**
   - The script will launch Chrome with a persistent user data directory
   - Login to any services you want the agent to have access to (GitHub, Google, etc.)
   - Your login sessions will be automatically saved

3. **Close Chrome when done:**
   - The agent will automatically use this profile and have access to your login sessions
   - You only need to do this setup once

**What this does:**
- Creates a `chromium_user_data/` directory in the project root (ignored by git)
- Launches Chrome with this persistent profile
- Any logins you perform are saved for the agent to use
- The agent will automatically use this profile for all demo generation

**Note:** The user data directory is automatically added to `.gitignore` so your login sessions won't be committed to version control.

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
