export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'AuthError'
  }
}

export class MaxStepsError extends Error {
  steps_taken: number

  constructor(stepsTaken: number, message = `Max steps exceeded: ${stepsTaken}`) {
    super(message)
    this.name = 'MaxStepsError'
    this.steps_taken = stepsTaken
  }
}

export class LLMError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'LLMError'
    this.status = status
  }
}
