/// <reference types="astro/client" />

import type { GeneratedPublicFunctionApi } from '@/platform/generated/function-api/public';

declare global {
  namespace App {
    interface Locals {
      readonly api: GeneratedPublicFunctionApi;
    }
  }
}

export {};
