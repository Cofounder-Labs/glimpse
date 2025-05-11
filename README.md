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
