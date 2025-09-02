import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { eventsAPI, projectsAPI, tasksAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { EventDialog } from '../components/EventDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar.css';

const localizer = momentLocalizer(moment);

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

interface Task {
  id: number;
  title: string;
  due_date: string;
  priority: string;
  project_name?: string;
}

interface CalendarEventData {
  id: number;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  type: 'event' | 'task';
  priority: string;
  event_type?: string;
  project_name?: string;
  resource?: Event | Task;
}

const priorityColors = {
  low: '#6b7280',    // gray-500
  medium: '#3b82f6', // blue-500
  high: '#f97316',   // orange-500
  urgent: '#ef4444', // red-500
};

const eventTypeColors = {
  event: '#3b82f6',    // blue-500
  deadline: '#ef4444', // red-500
  meeting: '#10b981',  // green-500
  reminder: '#8b5cf6', // purple-500
};

export const Calendar: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>('month');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    updateCalendarEvents();
  }, [events, tasks, filterProject, filterType]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsResponse, tasksResponse, projectsResponse] = await Promise.all([
        eventsAPI.getAll(),
        tasksAPI.getMyTasks(),
        projectsAPI.getAll(),
      ]);
      
      console.log('Loaded events:', eventsResponse.data);
      console.log('Loaded tasks:', tasksResponse.data);
      console.log('Loaded projects:', projectsResponse.data);
      
      setEvents(eventsResponse.data);
      setTasks(tasksResponse.data);
      setProjects(projectsResponse.data);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCalendarEvents = useCallback(() => {
    const allEvents: CalendarEventData[] = [];

    // Add events
    events
      .filter(event => filterProject === 'all' || event.project_id?.toString() === filterProject)
      .filter(event => filterType === 'all' || event.event_type === filterType)
      .forEach(event => {
        allEvents.push({
          id: event.id,
          title: event.title,
          start: new Date(event.start_date),
          end: event.end_date ? new Date(event.end_date) : new Date(event.start_date),
          allDay: event.all_day,
          type: 'event',
          priority: event.priority,
          event_type: event.event_type,
          project_name: event.project_name,
          resource: event,
        });
      });

    // Add task due dates if showing all or deadline types
    if (filterType === 'all' || filterType === 'deadline') {
      tasks
        .filter(task => task.due_date)
        .filter(task => filterProject === 'all' || (task.project_name && projects.find(p => p.name === task.project_name)?.id.toString() === filterProject))
        .forEach(task => {
          allEvents.push({
            id: task.id,
            title: `📋 ${task.title}`,
            start: new Date(task.due_date),
            end: new Date(task.due_date),
            allDay: true,
            type: 'task',
            priority: task.priority,
            project_name: task.project_name,
            resource: task,
          });
        });
    }

    setCalendarEvents(allEvents);
  }, [events, tasks, projects, filterProject, filterType]);

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedEvent({
      id: 0,
      title: '',
      start_date: start.toISOString(),
      all_day: false,
      event_type: 'event',
      priority: 'medium',
      user_id: 0,
    });
    setIsCreating(true);
    setEventDialogOpen(true);
  };

  const handleSelectEvent = (calendarEvent: CalendarEventData) => {
    if (calendarEvent.type === 'event') {
      setSelectedEvent(calendarEvent.resource as Event);
      setIsCreating(false);
      setEventDialogOpen(true);
    }
  };

  const handleEventSave = async () => {
    await loadData();
    setEventDialogOpen(false);
    setSelectedEvent(null);
  };

  const eventStyleGetter = (event: CalendarEventData) => {
    let backgroundColor = priorityColors[event.priority as keyof typeof priorityColors] || '#6b7280';
    
    if (event.type === 'event' && event.event_type) {
      backgroundColor = eventTypeColors[event.event_type as keyof typeof eventTypeColors] || '#3b82f6';
    } else if (event.type === 'task') {
      backgroundColor = '#6b7280'; // gray for tasks
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: '1px solid rgba(255,255,255,0.2)',
        display: 'block',
        fontSize: '12px',
        fontWeight: '500',
        padding: '2px 6px',
      },
    };
  };

  const CustomEvent = ({ event }: { event: CalendarEventData }) => (
    <div className="text-xs">
      <div className="font-medium truncate">{event.title}</div>
      {event.project_name && (
        <div className="text-xs opacity-75 truncate">{event.project_name}</div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
              <p className="mt-2 text-gray-600">Manage your events and deadlines</p>
            </div>
            <Button onClick={() => {
              setSelectedEvent({
                id: 0,
                title: '',
                start_date: new Date().toISOString(),
                all_day: false,
                event_type: 'event',
                priority: 'medium',
                user_id: 0,
              });
              setIsCreating(true);
              setEventDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </div>

          <div className="flex gap-4 mb-6">
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="event">Events</SelectItem>
                <SelectItem value="deadline">Deadlines</SelectItem>
                <SelectItem value="meeting">Meetings</SelectItem>
                <SelectItem value="reminder">Reminders</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="calendar-view h-[800px]">
                <BigCalendar
                  localizer={localizer}
                  events={calendarEvents as any}
                  startAccessor="start"
                  endAccessor="end"
                  onSelectSlot={handleSelectSlot}
                  onSelectEvent={handleSelectEvent as any}
                  selectable
                  eventPropGetter={eventStyleGetter as any}
                  components={{
                    event: CustomEvent as any,
                  }}
                  views={['month', 'week', 'day']}
                  view={currentView as any}
                  onView={setCurrentView as any}
                  date={currentDate}
                  onNavigate={setCurrentDate}
                  className="p-4"
                />
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm">Events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">Deadlines</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Meetings</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-sm">Reminders</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-500 rounded"></div>
              <span className="text-sm">Task Due Dates</span>
            </div>
          </div>
        </motion.div>
      </div>

      {selectedEvent && (
        <EventDialog
          event={selectedEvent}
          isCreating={isCreating}
          open={eventDialogOpen}
          onOpenChange={setEventDialogOpen}
          onSave={handleEventSave}
          projects={projects}
        />
      )}
    </div>
  );
};