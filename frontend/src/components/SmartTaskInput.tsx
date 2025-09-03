import React, { useState, useEffect } from 'react';
import { Calendar, User, Flag, Hash, Sparkles } from 'lucide-react';
import { NaturalLanguageParser } from '../utils/naturalLanguageParser';
import { format } from 'date-fns';
import { Badge } from './ui/badge';

interface SmartTaskInputProps {
  onSubmit: (task: any) => void;
  placeholder?: string;
}

export const SmartTaskInput: React.FC<SmartTaskInputProps> = ({ 
  onSubmit, 
  placeholder = "Try: 'Fix login bug urgent tomorrow' or 'Meeting with @sarah #marketing next friday'"
}) => {
  const [input, setInput] = useState('');
  const [parsedTask, setParsedTask] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (input.trim()) {
      const parsed = NaturalLanguageParser.parse(input);
      setParsedTask(parsed);
      setShowPreview(true);

      // Get suggestions
      const newSuggestions = NaturalLanguageParser.getSuggestions(input);
      setSuggestions(newSuggestions);
    } else {
      setParsedTask(null);
      setShowPreview(false);
      setSuggestions([]);
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedTask) {
      onSubmit(parsedTask);
      setInput('');
      setParsedTask(null);
      setShowPreview(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Sparkles className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-500" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Live Preview */}
        {showPreview && parsedTask && (
          <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10">
            <div className="text-xs text-gray-500 mb-2 flex items-center">
              <Sparkles className="h-3 w-3 mr-1 text-purple-500" />
              AI Preview - Press Enter to create
            </div>
            
            <div className="space-y-2">
              <div className="font-medium text-gray-900">{parsedTask.title}</div>
              
              <div className="flex flex-wrap gap-2">
                {parsedTask.priority && (
                  <Badge className={`${getPriorityColor(parsedTask.priority)} text-xs`}>
                    <Flag className="h-3 w-3 mr-1" />
                    {parsedTask.priority}
                  </Badge>
                )}
                
                {parsedTask.dueDate && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(parsedTask.dueDate, 'MMM dd')}
                  </Badge>
                )}
                
                {parsedTask.assignee && (
                  <Badge variant="outline" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    {parsedTask.assignee}
                  </Badge>
                )}
                
                {parsedTask.project && (
                  <Badge variant="outline" className="text-xs">
                    <Hash className="h-3 w-3 mr-1" />
                    {parsedTask.project}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute top-full mt-12 w-full bg-white border border-gray-200 rounded-lg shadow p-2 z-10">
            <div className="text-xs text-gray-500 mb-1">Suggestions:</div>
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInput(suggestion)}
                className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Examples */}
      <div className="mt-4 text-xs text-gray-500">
        <span className="font-medium">Examples:</span>
        <div className="mt-1 space-x-2">
          <button 
            onClick={() => setInput("Fix login bug urgent tomorrow")}
            className="text-purple-600 hover:underline"
          >
            "Fix login bug urgent tomorrow"
          </button>
          <span>•</span>
          <button 
            onClick={() => setInput("Team meeting @sarah #marketing next friday")}
            className="text-purple-600 hover:underline"
          >
            "Meeting @sarah next friday"
          </button>
        </div>
      </div>
    </div>
  );
};