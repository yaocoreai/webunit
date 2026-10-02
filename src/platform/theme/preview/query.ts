export type ThemePreviewQuery =
  | { present: false }
  | { present: true; value: Readonly<{ themeId: string; ticket: string }> }
  | { present: true; error: string };

export function parseThemePreviewQuery(url: URL): ThemePreviewQuery {
  const themes = url.searchParams.getAll('preview'); const tickets = url.searchParams.getAll('ticket');
  if (!themes.length && !tickets.length) return { present: false };
  const themeId = themes[0]?.trim() ?? ''; const ticket = tickets[0]?.trim() ?? '';
  if (themes.length !== 1 || tickets.length !== 1 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(themeId) || ticket.length < 32 || ticket.length > 512 || !/^[a-zA-Z0-9._~-]+$/.test(ticket)) return { present: true, error: 'Invalid preview credentials' };
  return { present: true, value: { themeId, ticket } };
}
