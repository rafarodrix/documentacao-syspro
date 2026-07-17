type WailsRuntime = {
  EventsOn: (eventName: string, callback: (...data: any[]) => void) => void;
  EventsOff: (eventName: string) => void;
};

declare global {
  interface Window {
    runtime: WailsRuntime;
  }
}

export function EventsOn(eventName: string, callback: (...data: any[]) => void) {
  window.runtime.EventsOn(eventName, callback);
  return () => {
    window.runtime.EventsOff(eventName);
  };
}
