import { type Database, type Json } from './supabase';

/**
 * --- Base Types from Supabase ---
 * These types are derived directly from your auto-generated supabase.ts file.
 * They represent the raw data structure from the database, including all possible null values.
 */
export type AssetRow = Database['public']['Tables']['assets']['Row'];

/**
 * --- Application-Specific Types ---
 * These are the types you should use throughout your Vue components.
 * They are more specific and often non-nullable, making your code safer and easier to work with.
 */

// A version of Asset where we know certain fields required by the app will not be null.
// This is the primary type you'll use in your components for displaying assets.
export interface AppAsset extends Omit<AssetRow, 'metadata'> {
    // We override the 'metadata' type from the generic 'Json' to be more specific.
    metadata: {
        geography?: string;
        sector?: string;
        platform?: string;
        [key: string]: any; // Allows for other potential string keys
    } | null; // The whole metadata object can still be null.
}

// A specific type for the form when creating or editing an asset.
// We make metadata non-nullable here because the form always provides the object, even if its properties are empty.
export interface AssetFormData extends Omit<AppAsset, 'id' | 'created_at' | 'user_id' | 'metadata'> {
    metadata: {
        geography?: string;
        sector?: string;
        platform?: string;
    };
}
