import { EventsOff, EventsOn as WailsEventsOn } from "../wailsjs/runtime/runtime";

export function EventsOn(eventName: string, callback: (...data: any[]) => void) {
  WailsEventsOn(eventName, callback);
  return () => {
    EventsOff(eventName);
  };
}
