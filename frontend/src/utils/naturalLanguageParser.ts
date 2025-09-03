// Natural Language Task Parser
// Converts text like "Create high priority task for tomorrow" into task objects

interface ParsedTask {
  title: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  assignee?: string;
  project?: string;
  description?: string;
}

export class NaturalLanguageParser {
  // Priority keywords
  private static priorityMap: Record<string, string> = {
    'urgent': 'urgent',
    'asap': 'urgent',
    'critical': 'urgent',
    'high': 'high',
    'important': 'high',
    'medium': 'medium',
    'normal': 'medium',
    'low': 'low',
    'minor': 'low',
    'trivial': 'low'
  };

  // Time keywords
  private static timeMap: Record<string, () => Date> = {
    'today': () => new Date(),
    'tomorrow': () => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      return date;
    },
    'next week': () => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date;
    },
    'next monday': () => {
      const date = new Date();
      const day = date.getDay();
      const diff = day === 0 ? 1 : 8 - day;
      date.setDate(date.getDate() + diff);
      return date;
    },
    'next friday': () => {
      const date = new Date();
      const day = date.getDay();
      const diff = day <= 5 ? 5 - day : 5 + (7 - day);
      date.setDate(date.getDate() + diff);
      return date;
    }
  };

  // Parse natural language input
  static parse(input: string): ParsedTask {
    const lowerInput = input.toLowerCase();
    const result: ParsedTask = { title: input };

    // Extract priority
    for (const [keyword, priority] of Object.entries(this.priorityMap)) {
      if (lowerInput.includes(keyword)) {
        result.priority = priority as ParsedTask['priority'];
        // Remove priority from title
        result.title = result.title.replace(new RegExp(keyword, 'gi'), '').trim();
        break;
      }
    }

    // Extract due date
    for (const [keyword, dateFunc] of Object.entries(this.timeMap)) {
      if (lowerInput.includes(keyword)) {
        result.dueDate = dateFunc();
        // Remove date from title
        result.title = result.title.replace(new RegExp(keyword, 'gi'), '').trim();
        break;
      }
    }

    // Extract relative dates (in X days)
    const inDaysMatch = lowerInput.match(/in (\d+) days?/);
    if (inDaysMatch) {
      const days = parseInt(inDaysMatch[1]);
      const date = new Date();
      date.setDate(date.getDate() + days);
      result.dueDate = date;
      result.title = result.title.replace(inDaysMatch[0], '').trim();
    }

    // Extract specific dates (Dec 25, 12/25, etc.)
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})/,  // MM/DD
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w* (\d{1,2})/i,  // Month DD
    ];

    for (const pattern of datePatterns) {
      const match = lowerInput.match(pattern);
      if (match) {
        // Parse the date (simplified - you'd want more robust parsing)
        const date = new Date(match[0] + ' ' + new Date().getFullYear());
        if (!isNaN(date.getTime())) {
          result.dueDate = date;
          result.title = result.title.replace(match[0], '').trim();
        }
        break;
      }
    }

    // Extract assignee (@mentions)
    const assigneeMatch = result.title.match(/@(\w+)/);
    if (assigneeMatch) {
      result.assignee = assigneeMatch[1];
      result.title = result.title.replace(assigneeMatch[0], '').trim();
    }

    // Extract project (#project)
    const projectMatch = result.title.match(/#(\w+)/);
    if (projectMatch) {
      result.project = projectMatch[1];
      result.title = result.title.replace(projectMatch[0], '').trim();
    }

    // Clean up title
    result.title = result.title
      .replace(/\s+/g, ' ')  // Remove extra spaces
      .replace(/^(create|add|make|new)\s+/i, '')  // Remove action words
      .replace(/^(task|todo)\s+/i, '')  // Remove task words
      .trim();

    // If title is empty after extraction, use original
    if (!result.title) {
      result.title = input;
    }

    return result;
  }

  // Get suggestions as user types
  static getSuggestions(input: string): string[] {
    const suggestions: string[] = [];
    const lower = input.toLowerCase();

    // Suggest priorities
    if (lower.includes('pri') && !lower.includes('priority')) {
      suggestions.push(input + ' priority');
    }

    // Suggest time
    if (lower.endsWith(' ')) {
      suggestions.push(
        input + 'today',
        input + 'tomorrow',
        input + 'next week',
        input + 'urgent'
      );
    }

    // Suggest completion
    if (lower.includes('meeting')) {
      suggestions.push(input + ' tomorrow at 2pm');
    }

    return suggestions.slice(0, 5); // Limit suggestions
  }
}

// Example usage:
// NaturalLanguageParser.parse("Fix login bug urgent tomorrow")
// Returns: { title: "Fix login bug", priority: "urgent", dueDate: <tomorrow> }

// NaturalLanguageParser.parse("Review PR @john #backend high priority")
// Returns: { title: "Review PR", priority: "high", assignee: "john", project: "backend" }