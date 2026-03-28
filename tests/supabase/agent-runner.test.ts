{
  "job_id": "test-job-1",
  "user_id": "test-user-123",
  "config": {
    "agent_id": "test-agent-1",
    "version": 1,
    "name": "Test Agent",
    "description": "Test",
    "intent": "utility",
    "provider": "openai",
    "system_prompt": "You are a helpful assistant. Answer the user question directly as a JSON object with a single field called answer.",
    "tools": [],
    "input_schema": { "question": { "type": "string" } },
    "output_schema": { "answer": { "type": "string" } },
    "constraints": [],
    "max_steps": 3,
    "test_cases": [
      {
        "input": { "question": "What is 2+2?" },
        "expected_contains": ["answer"]
      }
    ]
  },
  "input": { "question": "What is 2+2?" }
}