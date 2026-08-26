import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  FathomListMeetingsParams,
  FathomListMeetingsResponse,
  FathomMeeting
} from './types.js';

/** The API returns at most ~10 rows per page, so paging is mandatory. */
const MAX_PAGES = 200;
/** Fathom rate-limits aggressive paging; pause between pages. */
const PAGE_DELAY_MS = 350;
const MAX_RETRIES = 5;

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export class FathomClient {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Fathom API key is required');
    }

    this.client = axios.create({
      baseURL: 'https://api.fathom.ai/external/v1',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });
  }

  /** Single raw page, with backoff on 429. */
  async listMeetingsPage(params?: FathomListMeetingsParams): Promise<FathomListMeetingsResponse> {
    let attempt = 0;
    while (true) {
      try {
        const response = await this.client.get<FathomListMeetingsResponse>('/meetings', {
          params: this.formatParams(params)
        });
        return response.data;
      } catch (error) {
        const status = error instanceof AxiosError ? error.response?.status : undefined;
        const retryable = status === 429 || (status !== undefined && status >= 500);
        if (!retryable || attempt >= MAX_RETRIES) throw this.handleError(error);

        const retryAfter = Number(
          (error as AxiosError).response?.headers?.['retry-after']
        );
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(30000, 1000 * Math.pow(2, attempt));
        attempt++;
        console.error(`[fathom] ${status}; retry ${attempt}/${MAX_RETRIES} in ${waitMs}ms`);
        await sleep(waitMs);
      }
    }
  }

  /**
   * Follows next_cursor until `maxResults` post-filter rows are collected or the
   * corpus is exhausted. Returns { items, pagesFetched, exhausted }.
   */
  async listMeetings(
    params?: FathomListMeetingsParams,
    maxResults: number = 50
  ): Promise<{ items: FathomMeeting[]; pagesFetched: number; exhausted: boolean }> {
    const collected: FathomMeeting[] = [];
    let cursor: string | undefined = params?.cursor;
    let pages = 0;
    let exhausted = false;

    while (pages < MAX_PAGES) {
      const page: FathomListMeetingsResponse =
        await this.listMeetingsPage({ ...params, cursor });
      pages++;

      const items = page.items ?? [];
      for (const m of items) {
        if (this.matchesMeetingType(m, params?.meeting_type)) collected.push(m);
        if (collected.length >= maxResults) break;
      }

      cursor = page.next_cursor ?? undefined;
      if (collected.length >= maxResults) break;
      if (!cursor || items.length === 0) { exhausted = true; break; }
      await sleep(PAGE_DELAY_MS);
    }

    return { items: collected.slice(0, maxResults), pagesFetched: pages, exhausted };
  }

  /**
   * Client-side internal/external filter.
   * The API's own meeting_type param returns 0 rows for every value, and the
   * meeting_type field on each record is null, so we derive it from invitees.
   */
  private matchesMeetingType(
    meeting: FathomMeeting,
    meetingType?: 'all' | 'internal' | 'external'
  ): boolean {
    if (!meetingType || meetingType === 'all') return true;

    // Prefer the invitee list: Fathom's calendar_invitees_domains_type is
    // unreliable (it tags solo one-person recordings as "one_or_more_external").
    const invitees = meeting.calendar_invitees ?? [];
    let isExternal: boolean;
    if (invitees.length > 0) {
      isExternal = invitees.some(i => i?.is_external === true);
    } else {
      isExternal = meeting.calendar_invitees_domains_type === 'one_or_more_external';
    }

    return meetingType === 'external' ? isExternal : !isExternal;
  }

  /** Flattens a transcript array to plain text for keyword matching. */
  static transcriptText(meeting: FathomMeeting): string {
    if (!Array.isArray(meeting.transcript)) return '';
    return meeting.transcript.map(e => e?.text ?? '').join(' ');
  }

  async searchMeetings(
    searchTerm: string,
    includeTranscript: boolean = false,
    daysBack: number = 30,
    maxResults: number = 50
  ): Promise<FathomMeeting[]> {
    const createdAfter = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    // Pull a wide window, then filter locally. Ask for summaries so summary
    // matching actually works (the API omits them unless include_summary=true).
    const { items } = await this.listMeetings(
      {
        include_transcript: includeTranscript,
        include_summary: true,
        created_after: createdAfter
      },
      // Transcript pulls are heavy; keep the prefetch bounded.
      includeTranscript ? 150 : 500
    );

    const q = searchTerm.toLowerCase();
    const matched = items.filter(meeting => {
      const titleMatch =
        meeting.title?.toLowerCase().includes(q) ||
        meeting.meeting_title?.toLowerCase().includes(q);
      const summaryMatch = JSON.stringify(meeting.default_summary ?? '')
        .toLowerCase()
        .includes(q);
      const actionItemsMatch = JSON.stringify(meeting.action_items ?? [])
        .toLowerCase()
        .includes(q);
      const transcriptMatch =
        includeTranscript && FathomClient.transcriptText(meeting).toLowerCase().includes(q);

      return titleMatch || summaryMatch || actionItemsMatch || transcriptMatch;
    });

    return matched.slice(0, maxResults);
  }

  private formatParams(params?: FathomListMeetingsParams): Record<string, any> {
    if (!params) return {};

    const formatted: Record<string, any> = {};

    if (params.calendar_invitees?.length) {
      formatted['calendar_invitees[]'] = params.calendar_invitees;
    }
    if (params.calendar_invitees_domains?.length) {
      formatted['calendar_invitees_domains[]'] = params.calendar_invitees_domains;
    }
    if (params.recorded_by?.length) {
      formatted['recorded_by[]'] = params.recorded_by;
    }
    if (params.teams?.length) {
      formatted['teams[]'] = params.teams;
    }

    const arrayKeys = ['calendar_invitees', 'calendar_invitees_domains', 'recorded_by', 'teams'];
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (arrayKeys.includes(key)) return;
      // Sending meeting_type to the API makes it return an empty list for every
      // value, including "all". It is applied client-side instead.
      if (key === 'meeting_type') return;
      formatted[key] = value;
    });

    return formatted;
  }

  private handleError(error: unknown): Error {
    if (error instanceof AxiosError) {
      if (error.response?.status === 429) {
        return new Error('Rate limit exceeded. Please try again later.');
      }
      if (error.response?.status === 401) {
        return new Error('Invalid API key. Please check your Fathom API key.');
      }
      if (error.response?.data?.message) {
        return new Error(`Fathom API error: ${error.response.data.message}`);
      }
    }
    return error instanceof Error ? error : new Error('Unknown error occurred');
  }
}
