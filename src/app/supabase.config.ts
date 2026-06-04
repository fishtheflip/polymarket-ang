type SupabaseRuntimeConfig = {
  url?: string;
  publishableKey?: string;
};

const runtimeConfig = (
  globalThis as typeof globalThis & {
    __SUPABASE_CONFIG__?: SupabaseRuntimeConfig;
  }
).__SUPABASE_CONFIG__;

export const supabaseConfig = {
  url: runtimeConfig?.url ?? '',
  publishableKey: runtimeConfig?.publishableKey ?? '',
};
