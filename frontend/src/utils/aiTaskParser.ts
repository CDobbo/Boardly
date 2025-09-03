// AI-Powered Natural Language Parser
// Uses OpenAI API or Claude API for more intelligent parsing

interface AIConfig {
  apiKey: string;
  model?: string;
}

export class AITaskParser {
  private apiKey: string;
  private model: string;

  constructor(config: AIConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-3.5-turbo';
  }

  async parseWithAI(input: string, context?: any): Promise<any> {
    // System prompt to guide the AI
    const systemPrompt = `You are a task parser. Convert natural language into structured task data.
    
    Extract the following if present:
    - title: The core task (required)
    - priority: urgent, high, medium, or low
    - dueDate: Parse dates like "tomorrow", "next week", "Dec 25", etc.
    - assignee: Names mentioned with @ or assigned to someone
    - project: Project names with # or mentioned projects
    - description: Any additional details
    - subtasks: If multiple tasks are mentioned
    - recurring: If it's a recurring task (daily, weekly, monthly)
    - duration: Estimated time (e.g., "2 hours", "30 mins")
    - dependencies: If it depends on other tasks
    - tags: Any relevant tags or categories
    
    Context about the user:
    - Current date: ${new Date().toLocaleDateString()}
    - Available projects: ${context?.projects?.join(', ') || 'none'}
    - Team members: ${context?.teamMembers?.join(', ') || 'none'}
    
    Return JSON only, no explanation.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input }
          ],
          temperature: 0.3, // Lower temperature for more consistent parsing
          response_format: { type: "json_object" }
        })
      });

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('AI parsing failed, falling back to basic parser:', error);
      // Fall back to basic parser
      return NaturalLanguageParser.parse(input);
    }
  }

  // Parse multiple tasks from a paragraph
  async parseMultipleTasks(input: string): Promise<any[]> {
    const systemPrompt = `Extract all tasks from this text. Each task should be a separate object.
    Look for action items, todos, and things that need to be done.
    Return an array of task objects.`;

    // Similar API call...
    return [];
  }

  // Generate task suggestions based on context
  async suggestTasks(context: any): Promise<string[]> {
    const prompt = `Based on this project context, suggest 5 relevant tasks:
    - Project: ${context.projectName}
    - Current tasks: ${context.currentTasks?.slice(0, 5).join(', ')}
    - Team size: ${context.teamSize}
    
    Return 5 task suggestions as a JSON array of strings.`;

    // API call to get suggestions...
    return [];
  }

  // Smart scheduling - find the best time for a task
  async smartSchedule(task: any, calendar: any[]): Promise<Date> {
    const prompt = `Given this task and calendar, suggest the best time to schedule it:
    Task: ${JSON.stringify(task)}
    Calendar: ${JSON.stringify(calendar)}
    
    Consider priority, existing meetings, and work-life balance.
    Return a specific date and time.`;

    // API call to get optimal scheduling...
    return new Date();
  }
}

// Example AI responses:

/*
Input: "I need to review the Q4 financial reports with the team before Friday, probably will take 2 hours, make it high priority"

AI Output:
{
  "title": "Review Q4 financial reports with team",
  "priority": "high",
  "dueDate": "2024-01-05", // Assuming Friday is Jan 5
  "duration": "2 hours",
  "tags": ["financial", "review", "team meeting"],
  "description": "Team review of Q4 financial reports"
}

Input: "Set up weekly standup meetings every Monday at 9am starting next week"

AI Output:
{
  "title": "Weekly standup meeting",
  "recurring": {
    "frequency": "weekly",
    "day": "Monday",
    "time": "09:00"
  },
  "startDate": "2024-01-08",
  "type": "meeting",
  "duration": "30 minutes"
}
*/