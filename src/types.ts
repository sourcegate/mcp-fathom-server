export interface FathomSpeaker {
  display_name: string | null;
  matched_calendar_invitee_email: string | null;
}

export interface FathomTranscriptEntry {
  speaker: FathomSpeaker;
  text: string;
  timestamp: string;
}

export interface FathomInvitee {
  name: string | null;
  email: string | null;
  email_domain: string | null;
  is_external: boolean;
  matched_speaker_display_name: string | null;
}

export interface FathomMeeting {
  title: string;
  meeting_title: string;
  url: string;
  meeting_url?: string;
  share_url: string;
  recording_id?: number;
  created_at: string;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  recording_start_time?: string;
  recording_end_time?: string;
  /** NOTE: the API returns null here; use calendar_invitees_domains_type instead. */
  meeting_type: string | null;
  calendar_invitees_domains_type?: 'all_internal' | 'one_or_more_external' | string;
  transcript_language?: string;
  calendar_invitees: FathomInvitee[];
  recorded_by: any;
  /** Array of speaker-attributed lines, present only when include_transcript=true. */
  transcript?: FathomTranscriptEntry[];
  default_summary?: any;
  action_items?: any[];
  highlights?: any[];
  shared_with?: any[];
  crm_matches?: any[];
}

export interface FathomListMeetingsParams {
  calendar_invitees?: string[];
  calendar_invitees_domains?: string[];
  created_after?: string;
  created_before?: string;
  cursor?: string;
  include_crm_matches?: boolean;
  include_transcript?: boolean;
  include_summary?: boolean;
  /** Applied CLIENT-SIDE. Never sent to the API - the API returns 0 rows for any value. */
  meeting_type?: 'all' | 'internal' | 'external';
  recorded_by?: string[];
  teams?: string[];
}

export interface FathomListMeetingsResponse {
  items: FathomMeeting[];
  limit: number | null;
  next_cursor?: string | null;
}
