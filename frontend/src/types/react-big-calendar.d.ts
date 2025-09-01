declare module 'react-big-calendar' {
  import { ComponentType } from 'react';
  
  export interface Event {
    title?: string;
    start?: Date;
    end?: Date;
    allDay?: boolean;
    resource?: any;
  }

  export interface CalendarProps {
    localizer: any;
    events: Event[];
    startAccessor?: string | ((event: Event) => Date);
    endAccessor?: string | ((event: Event) => Date);
    titleAccessor?: string | ((event: Event) => string);
    allDayAccessor?: string | ((event: Event) => boolean);
    resourceAccessor?: string | ((event: Event) => any);
    onSelectSlot?: (slotInfo: { start: Date; end: Date; slots: Date[]; action: string }) => void;
    onSelectEvent?: (event: Event, e: React.SyntheticEvent) => void;
    onNavigate?: (date: Date) => void;
    onView?: (view: string) => void;
    selectable?: boolean;
    eventPropGetter?: (event: Event, start: Date, end: Date, isSelected: boolean) => { style?: React.CSSProperties };
    components?: {
      event?: ComponentType<{ event: Event }>;
      [key: string]: any;
    };
    views?: string[] | { [key: string]: boolean | ComponentType };
    view?: string;
    date?: Date;
    className?: string;
    style?: React.CSSProperties;
  }

  export const Calendar: ComponentType<CalendarProps>;
  
  export function momentLocalizer(moment: any): any;
}