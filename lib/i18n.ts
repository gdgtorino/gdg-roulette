export const translations = {
  en: {
    // Navigation
    events: 'Events',
    admins: 'Admins',
    logout: 'Logout',

    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    cancel: 'Cancel',
    delete: 'Delete',
    create: 'Create',
    save: 'Save',
    close: 'Close',

    // Event statuses
    'status.INIT': 'Init',
    'status.REGISTRATION_OPEN': 'Open',
    'status.REGISTRATION_CLOSED': 'Closed',
    'status.DRAWING': 'Drawing',
    'status.CLOSED': 'Finished',
  },
  it: {
    // Navigation
    events: 'Eventi',
    admins: 'Admin',
    logout: 'Esci',

    // Common
    loading: 'Caricamento...',
    error: 'Errore',
    success: 'Successo',
    confirm: 'Conferma',
    cancel: 'Annulla',
    delete: 'Elimina',
    create: 'Crea',
    save: 'Salva',
    close: 'Chiudi',

    // Event statuses
    'status.INIT': 'Inizializzazione',
    'status.REGISTRATION_OPEN': 'Aperte',
    'status.REGISTRATION_CLOSED': 'Chiuse',
    'status.DRAWING': 'Estrazione',
    'status.CLOSED': 'Terminato',
  },
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;