// Provider-independent booking interface. Callers ask a provider what it can do;
// the website/intake never assumes capabilities a provider doesn't have.
import { sandboxAvailability, createSandboxAppointment } from "../domain/appointments.js";

export const bookingProviders = {
  goldie: {
    id: "goldie",
    live: true,
    capabilities: { deepLink: true, availability: false, create: false, cancel: false },
    bookingUrl: (config, service) => config.goldieUrl(service),
  },
  native: {
    id: "native",
    live: false,           // sandbox only until Melanie approves a switch
    capabilities: { deepLink: false, availability: true, create: true, cancel: true },
    availability: sandboxAvailability,
    create: createSandboxAppointment,
  },
};

/** The provider the public site hands clients to. Always Goldie until explicitly changed. */
export const liveProvider = () => bookingProviders.goldie;
