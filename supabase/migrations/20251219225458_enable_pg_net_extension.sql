/*
  # Enable pg_net Extension

  1. Changes
    - Enable pg_net extension for async HTTP calls
    - Required for webhook notifications
*/

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;