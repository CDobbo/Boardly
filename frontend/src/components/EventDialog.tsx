import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { AlertCircle, Trash2 } from 'lucide-react';
import { eventsAPI } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface Event {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  all_day: boolean;
  event_type: 'event' | 'deadline' | 'meeting' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  project_id?: number;
  project_name?: string;
  user_id: number;
}

interface Project {
  id: number;
  name: string;
}

interface EventDialogProps {
  event: Event;
  isCreating: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  projects: Project[];
}

export const EventDialog: React.FC<EventDialogProps> = ({
  event,
  isCreating,
  open,
  onOpenChange,
  onSave,
  projects,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    all_day: false,
    event_type: 'event' as 'event' | 'deadline' | 'meeting' | 'reminder',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    project_id: undefined as number | undefined,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (event) {
      const startDate = new Date(event.start_date);
      const endDate = event.end_date ? new Date(event.end_date) : null;
      
      setFormData({
        title: event.title,
        description: event.description || '',
        start_date: format(startDate, 'yyyy-MM-dd'),
        start_time: event.all_day ? '' : format(startDate, 'HH:mm'),
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : format(startDate, 'yyyy-MM-dd'),
        end_time: endDate && !event.all_day ? format(endDate, 'HH:mm') : '',
        all_day: event.all_day,
        event_type: event.event_type,
        priority: event.priority,
        project_id: event.project_id,
      });
    }
  }, [event]);

  const handleSave = async () => {
    try {
      setLoading(true);
      setErrors([]);

      if (!formData.title.trim()) {
        setErrors(['Title is required']);
        return;
      }

      if (!formData.start_date) {
        setErrors(['Start date is required']);
        return;
      }

      // Construct start_date and end_date
      let startDateTime = formData.start_date;
      let endDateTime = formData.end_date || formData.start_date;

      if (!formData.all_day) {
        if (!formData.start_time) {
          setErrors(['Start time is required for non-all-day events']);
          return;
        }
        startDateTime = `${formData.start_date}T${formData.start_time}:00`;
        
        if (formData.end_time) {
          endDateTime = `${formData.end_date || formData.start_date}T${formData.end_time}:00`;
        } else {
          // Default to 1 hour after start time
          const startTime = new Date(`${formData.start_date}T${formData.start_time}:00`);
          startTime.setHours(startTime.getHours() + 1);
          endDateTime = startTime.toISOString();
        }
      } else {
        startDateTime = `${formData.start_date}T00:00:00`;
        endDateTime = `${formData.end_date || formData.start_date}T23:59:59`;
      }

      const eventData = {
        title: formData.title,
        description: formData.description || undefined,
        start_date: startDateTime,
        end_date: endDateTime,
        all_day: formData.all_day,
        event_type: formData.event_type,
        priority: formData.priority,
        project_id: formData.project_id || undefined,
      };

      console.log('Saving event data:', eventData);

      if (isCreating) {
        const response = await eventsAPI.create(eventData);
        console.log('Create response:', response);
      } else {
        const response = await eventsAPI.update(String(event.id), eventData);
        console.log('Update response:', response);
      }

      onSave();
    } catch (error: any) {
      console.error('Failed to save event:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || 'Failed to save event. Please try again.';
      setErrors([errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await eventsAPI.delete(String(event.id));
      onSave();
    } catch (error) {
      console.error('Failed to delete event:', error);
      setErrors(['Failed to delete event. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? 'Create New Event' : 'Edit Event'}
          </DialogTitle>
          <DialogDescription>
            {isCreating 
              ? 'Add a new event to your calendar'
              : 'Make changes to your event'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                <div className="ml-2">
                  <div className="text-sm text-red-800">
                    {errors.map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Event title"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Event description (optional)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="event_type">Type</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value: typeof formData.event_type) => 
                  setFormData({ ...formData, event_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: typeof formData.priority) => 
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="project">Project (optional)</Label>
            <Select
              value={formData.project_id?.toString() || "none"}
              onValueChange={(value) => 
                setFormData({ 
                  ...formData, 
                  project_id: value === "none" ? undefined : parseInt(value) 
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="all_day"
              checked={formData.all_day}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, all_day: checked as boolean })
              }
            />
            <Label htmlFor="all_day">All day event</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            {!formData.all_day && (
              <div className="grid gap-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>

            {!formData.all_day && (
              <div className="grid gap-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {!isCreating && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : (isCreating ? 'Create Event' : 'Save Changes')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};