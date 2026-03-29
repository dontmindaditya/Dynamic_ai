from app.clients.supabase_client import get_agent


async def get_deploy_artifacts(agent_id: str) -> dict:
    agent = await get_agent(agent_id)
    if not agent:
        return {}

    return {
        "embed_url":     agent.get("embed_url"),
        "api_endpoint":  agent.get("api_endpoint"),
        "embed_snippet": (
            f'<script src="https://fairquanta.ai/widget.js" '
            f'data-agent-id="{agent_id}"></script>'
        ),
        "curl_example": (
            f'curl -X POST https://api.fairquanta.ai{agent.get("api_endpoint")} \\\n'
            f'  -H "Authorization: Bearer YOUR_API_KEY" \\\n'
            f'  -H "Content-Type: application/json" \\\n'
            f'  -d \'{{"message": "Your input here"}}\''
        ),
    }